const prisma = require('../lib/prisma')

const toNumber = (value) => Number(value)
const ACTIVE_BID_STATUSES = ['pending', 'winning', 'losing']

const toUtcDateOnly = (dateInput) => {
  const date = new Date(dateInput)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const addUtcDays = (date, days) => {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return toUtcDateOnly(result)
}

const getActiveBidDate = () => {
  const today = toUtcDateOnly(new Date())
  return addUtcDays(today, 1)
}

const getNextMidnightUtc = () => {
  const today = toUtcDateOnly(new Date())
  return addUtcDays(today, 1)
}

const parseMonthToRange = (month) => {
  if (!month) {
    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    return { month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`, start, end }
  }

  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1))

  return {
    month,
    start,
    end
  }
}

const formatBid = (bid) => ({
  bidId: bid.bid_id,
  amount: toNumber(bid.amount),
  status: bid.status,
  bidDate: bid.bid_date,
  createdAt: bid.created_at,
  updatedAt: bid.updated_at
})

const getAvailableBalance = async (alumniUserId, tx = prisma, options = {}) => {
  const [offeredResult, usedResult] = await Promise.all([
    tx.sponsorshipOffer.aggregate({
      where: {
        alumni_user_id: alumniUserId,
        status: 'accepted'
      },
      _sum: {
        amount_offered: true
      }
    }),
    tx.bid.aggregate({
      where: {
        alumni_user_id: alumniUserId,
        status: {
          in: ACTIVE_BID_STATUSES
        },
        ...(options.excludeBidId ? {
          bid_id: {
            not: options.excludeBidId
          }
        } : {})
      },
      _sum: {
        amount: true
      }
    })
  ])

  const totalOffered = toNumber(offeredResult._sum.amount_offered || 0)
  const totalUsedInBids = toNumber(usedResult._sum.amount || 0)

  return Math.max(0, totalOffered - totalUsedInBids)
}

const getWinPolicyForMonth = async (alumniUserId, monthStart, monthEnd, tx = prisma) => {
  const [winsThisMonth, attendedEventRecord] = await Promise.all([
    tx.featuredWinner.count({
      where: {
        alumni_user_id: alumniUserId,
        featured_date: {
          gte: monthStart,
          lt: monthEnd
        }
      }
    }),
    tx.eventAttendance.findFirst({
      where: {
        alumni_user_id: alumniUserId,
        event_date: {
          gte: monthStart,
          lt: monthEnd
        }
      },
      select: {
        attendance_id: true
      }
    })
  ])

  const attendedEventThisMonth = Boolean(attendedEventRecord)
  const maxWinsAllowed = attendedEventThisMonth ? 4 : 3
  const remainingSlots = Math.max(0, maxWinsAllowed - winsThisMonth)

  return {
    winsThisMonth,
    maxWinsAllowed,
    remainingSlots,
    attendedEventThisMonth
  }
}

const recomputeBidStatusesForDate = async (bidDate, tx = prisma) => {
  const bids = await tx.bid.findMany({
    where: {
      bid_date: bidDate
    },
    include: {
      alumni: {
        select: {
          user_id: true,
          email: true,
          first_name: true
        }
      }
    },
    orderBy: [
      {
        amount: 'desc'
      },
      {
        created_at: 'asc'
      }
    ]
  })

  if (bids.length === 0) {
    return {
      outbidBids: []
    }
  }

  const leader = bids[0]
  const outbidBids = bids.filter((bid) => bid.bid_id !== leader.bid_id && bid.status === 'winning')

  await tx.bid.updateMany({
    where: {
      bid_date: bidDate,
      bid_id: {
        not: leader.bid_id
      },
      status: {
        in: ['pending', 'winning', 'losing']
      }
    },
    data: {
      status: 'losing'
    }
  })

  if (leader.status === 'pending' || leader.status === 'winning' || leader.status === 'losing') {
    await tx.bid.update({
      where: {
        bid_id: leader.bid_id
      },
      data: {
        status: 'winning'
      }
    })
  }

  return {
    outbidBids
  }
}

const placeBid = async ({ alumniUserId, amount }) => {
  const bidDate = getActiveBidDate()
  const { start, end } = parseMonthToRange(`${bidDate.getUTCFullYear()}-${String(bidDate.getUTCMonth() + 1).padStart(2, '0')}`)

  return prisma.$transaction(async (tx) => {
    const existingBid = await tx.bid.findFirst({
      where: {
        alumni_user_id: alumniUserId,
        bid_date: bidDate
      }
    })

    if (existingBid) {
      return {
        ok: false,
        reason: 'already_exists'
      }
    }

    const policy = await getWinPolicyForMonth(alumniUserId, start, end, tx)

    if (policy.winsThisMonth >= policy.maxWinsAllowed) {
      return {
        ok: false,
        reason: 'monthly_limit',
        maxWinsAllowed: policy.maxWinsAllowed
      }
    }

    const availableBalance = await getAvailableBalance(alumniUserId, tx)

    if (amount > availableBalance) {
      return {
        ok: false,
        reason: 'insufficient_funds',
        availableBalance
      }
    }

    const created = await tx.bid.create({
      data: {
        alumni_user_id: alumniUserId,
        amount,
        status: 'pending',
        bid_date: bidDate
      }
    })

    const recomputeResult = await recomputeBidStatusesForDate(bidDate, tx)

    const fresh = await tx.bid.findUnique({
      where: {
        bid_id: created.bid_id
      }
    })

    return {
      ok: true,
      notificationContext: {
        outbidBids: recomputeResult.outbidBids,
        bidDate
      },
      bid: formatBid(fresh)
    }
  })
}

const listMyBids = async ({ alumniUserId, month }) => {
  const where = {
    alumni_user_id: alumniUserId
  }

  if (month) {
    const { start, end } = parseMonthToRange(month)
    where.bid_date = {
      gte: start,
      lt: end
    }
  }

  const items = await prisma.bid.findMany({
    where,
    orderBy: [
      {
        bid_date: 'desc'
      },
      {
        created_at: 'desc'
      }
    ]
  })

  return items.map(formatBid)
}

const getBidById = async ({ alumniUserId, bidId }) => {
  const bid = await prisma.bid.findFirst({
    where: {
      bid_id: bidId,
      alumni_user_id: alumniUserId
    }
  })

  if (!bid) {
    return null
  }

  return formatBid(bid)
}

const updateBid = async ({ alumniUserId, bidId, amount }) => {
  const activeBidDate = getActiveBidDate()

  return prisma.$transaction(async (tx) => {
    const existingBid = await tx.bid.findFirst({
      where: {
        bid_id: bidId,
        alumni_user_id: alumniUserId
      }
    })

    if (!existingBid) {
      return {
        ok: false,
        reason: 'not_found'
      }
    }

    if (toUtcDateOnly(existingBid.bid_date).getTime() !== activeBidDate.getTime()) {
      return {
        ok: false,
        reason: 'closed'
      }
    }

    const currentAmount = toNumber(existingBid.amount)

    if (amount <= currentAmount) {
      return {
        ok: false,
        reason: 'must_increase',
        currentAmount
      }
    }

    const availableBalance = await getAvailableBalance(alumniUserId, tx, {
      excludeBidId: bidId
    })

    if (amount > availableBalance) {
      return {
        ok: false,
        reason: 'insufficient_funds',
        availableBalance
      }
    }

    await tx.bid.update({
      where: {
        bid_id: bidId
      },
      data: {
        amount
      }
    })

    const recomputeResult = await recomputeBidStatusesForDate(activeBidDate, tx)

    const fresh = await tx.bid.findUnique({
      where: {
        bid_id: bidId
      }
    })

    return {
      ok: true,
      notificationContext: {
        outbidBids: recomputeResult.outbidBids,
        bidDate: activeBidDate
      },
      bid: formatBid(fresh)
    }
  })
}

const getMonthlySummary = async ({ alumniUserId, month }) => {
  const { month: normalizedMonth, start, end } = parseMonthToRange(month)

  const [bids, policy] = await Promise.all([
    prisma.bid.findMany({
      where: {
        alumni_user_id: alumniUserId,
        bid_date: {
          gte: start,
          lt: end
        }
      },
      orderBy: [
        {
          bid_date: 'desc'
        },
        {
          created_at: 'desc'
        }
      ]
    }),
    getWinPolicyForMonth(alumniUserId, start, end)
  ])

  return {
    month: normalizedMonth,
    winsThisMonth: policy.winsThisMonth,
    maxWinsAllowed: policy.maxWinsAllowed,
    remainingSlots: policy.remainingSlots,
    attendedEventThisMonth: policy.attendedEventThisMonth,
    bids: bids.map(formatBid)
  }
}

const getCurrentBid = async ({ alumniUserId }) => {
  const activeBidDate = getActiveBidDate()

  const [bid, leader] = await Promise.all([
    prisma.bid.findFirst({
      where: {
        alumni_user_id: alumniUserId,
        bid_date: activeBidDate
      }
    }),
    prisma.bid.findFirst({
      where: {
        bid_date: activeBidDate
      },
      orderBy: [
        {
          amount: 'desc'
        },
        {
          created_at: 'asc'
        }
      ]
    })
  ])

  if (!bid) {
    return {
      hasBid: false,
      status: 'no_bid',
      currentBidAmount: null,
      bidId: null,
      biddingClosesAt: getNextMidnightUtc()
    }
  }

  return {
    hasBid: true,
    status: leader && leader.bid_id === bid.bid_id ? 'winning' : 'losing',
    currentBidAmount: toNumber(bid.amount),
    bidId: bid.bid_id,
    biddingClosesAt: getNextMidnightUtc()
  }
}

const formatPayout = (payout) => ({
  payoutId: payout.payout_id,
  alumniId: payout.alumni_user_id,
  winningBidAmount: toNumber(payout.winning_bid_amount),
  alumniPayout: toNumber(payout.alumni_payout),
  status: payout.status,
  createdAt: payout.created_at,
  sponsorshipBreakdown: payout.payout_lines.map((line) => ({
    sponsorshipOfferId: line.offer_id,
    sponsorName: line.offer.sponsor_org.sponsor_name,
    credentialTitle: line.offer.credential.title,
    amountCharged: toNumber(line.amount_charged)
  }))
})

const createWinner = async ({ date, selectedByUserId }) => {
  const featuredDate = toUtcDateOnly(date)
  const monthStart = new Date(Date.UTC(featuredDate.getUTCFullYear(), featuredDate.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(featuredDate.getUTCFullYear(), featuredDate.getUTCMonth() + 1, 1))

  return prisma.$transaction(async (tx) => {
    const existingWinner = await tx.featuredWinner.findUnique({
      where: {
        featured_date: featuredDate
      }
    })

    if (existingWinner) {
      return {
        ok: false,
        reason: 'already_exists'
      }
    }

    const bidsForDate = await tx.bid.findMany({
      where: {
        bid_date: featuredDate
      },
      include: {
        alumni: {
          select: {
            user_id: true,
            email: true,
            first_name: true
          }
        }
      },
      orderBy: [
        {
          amount: 'desc'
        },
        {
          created_at: 'asc'
        }
      ]
    })

    const highestBid = bidsForDate[0]

    if (!highestBid) {
      return {
        ok: false,
        reason: 'no_bids'
      }
    }

    const policy = await getWinPolicyForMonth(highestBid.alumni_user_id, monthStart, monthEnd, tx)

    if (policy.winsThisMonth >= policy.maxWinsAllowed) {
      return {
        ok: false,
        reason: 'monthly_limit',
        maxWinsAllowed: policy.maxWinsAllowed
      }
    }

    const winner = await tx.featuredWinner.create({
      data: {
        featured_date: featuredDate,
        alumni_user_id: highestBid.alumni_user_id,
        winning_bid_id: highestBid.bid_id,
        winning_bid_amount: highestBid.amount,
        selected_by_user_id: selectedByUserId
      }
    })

    await tx.bid.updateMany({
      where: {
        bid_date: featuredDate,
        bid_id: {
          not: highestBid.bid_id
        }
      },
      data: {
        status: 'lost'
      }
    })

    await tx.bid.update({
      where: {
        bid_id: highestBid.bid_id
      },
      data: {
        status: 'won'
      }
    })

    const acceptedOffers = await tx.sponsorshipOffer.findMany({
      where: {
        alumni_user_id: highestBid.alumni_user_id,
        status: 'accepted'
      }
    })

    const totalSponsorshipCharged = acceptedOffers.reduce((sum, offer) => sum + toNumber(offer.amount_offered), 0)
    const alumniProfit = Math.max(0, totalSponsorshipCharged - toNumber(highestBid.amount))

    const payout = await tx.sponsorshipPayout.create({
      data: {
        winner_id: winner.winner_id,
        alumni_user_id: highestBid.alumni_user_id,
        winning_bid_amount: highestBid.amount,
        alumni_payout: alumniProfit,
        status: 'processed'
      }
    })

    if (acceptedOffers.length > 0) {
      await tx.sponsorshipPayoutLine.createMany({
        data: acceptedOffers.map((offer) => ({
          payout_id: payout.payout_id,
          offer_id: offer.offer_id,
          amount_charged: offer.amount_offered
        }))
      })

      await tx.sponsorshipOffer.updateMany({
        where: {
          offer_id: {
            in: acceptedOffers.map((offer) => offer.offer_id)
          },
          status: 'accepted'
        },
        data: {
          status: 'paid'
        }
      })
    }

    const payoutWithBreakdown = await tx.sponsorshipPayout.findUnique({
      where: {
        payout_id: payout.payout_id
      },
      include: {
        payout_lines: {
          include: {
            offer: {
              include: {
                sponsor_org: true,
                credential: true
              }
            }
          }
        }
      }
    })

    return {
      ok: true,
      notificationContext: {
        winnerBid: highestBid,
        losingBids: bidsForDate.filter((bid) => bid.bid_id !== highestBid.bid_id),
        featuredDate: winner.featured_date,
        winningBidAmount: toNumber(winner.winning_bid_amount)
      },
      winner: {
        date: winner.featured_date,
        winnerId: winner.alumni_user_id,
        winningBidAmount: toNumber(winner.winning_bid_amount),
        payout: formatPayout(payoutWithBreakdown),
        selectedAt: winner.selected_at
      }
    }
  })
}

const listWinners = async ({ month }) => {
  const where = {}

  if (month) {
    const { start, end } = parseMonthToRange(month)
    where.featured_date = {
      gte: start,
      lt: end
    }
  }

  const winners = await prisma.featuredWinner.findMany({
    where,
    include: {
      sponsorship_payouts: {
        include: {
          payout_lines: {
            include: {
              offer: {
                include: {
                  sponsor_org: true,
                  credential: true
                }
              }
            }
          }
        },
        take: 1,
        orderBy: {
          created_at: 'desc'
        }
      }
    },
    orderBy: {
      featured_date: 'desc'
    }
  })

  return winners.map((winner) => ({
    date: winner.featured_date,
    winnerId: winner.alumni_user_id,
    winningBidAmount: toNumber(winner.winning_bid_amount),
    payout: winner.sponsorship_payouts[0] ? formatPayout(winner.sponsorship_payouts[0]) : null,
    selectedAt: winner.selected_at
  }))
}

const recordEventAttendance = async ({ alumniUserId, eventName, eventDate, recordedByUserId }) => {
  const alumni = await prisma.user.findUnique({
    where: {
      user_id: alumniUserId
    },
    include: {
      role: true
    }
  })

  if (!alumni || alumni.role.name !== 'alumni') {
    return {
      ok: false,
      reason: 'alumni_not_found'
    }
  }

  const attendance = await prisma.eventAttendance.create({
    data: {
      alumni_user_id: alumniUserId,
      event_name: eventName,
      event_date: toUtcDateOnly(eventDate),
      recorded_by_user_id: recordedByUserId
    }
  })

  return {
    ok: true,
    attendance
  }
}

module.exports = {
  createWinner,
  getBidById,
  getCurrentBid,
  getMonthlySummary,
  listMyBids,
  listWinners,
  placeBid,
  recordEventAttendance,
  updateBid
}
