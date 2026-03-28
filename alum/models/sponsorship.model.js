const prisma = require('../lib/prisma')

const ACTIVE_OFFER_STATUSES = ['pending', 'accepted']
const OFFER_CREATION_BLOCKING_STATUSES = ['pending']
const ACTIVE_BID_STATUSES = ['pending', 'winning', 'losing']

const toNumber = Number

const formatOffer = (offer) => ({
  id: offer.offer_id,
  sponsorName: offer.sponsor_org.sponsor_name,
  sponsorEmail: offer.sponsor_org.sponsor_email,
  credentialType: offer.credential.credential_type,
  credentialId: offer.credential_id,
  credentialTitle: offer.credential.title,
  amountOffered: toNumber(offer.amount_offered),
  status: offer.status,
  message: offer.message,
  expiresAt: offer.expires_at,
  createdAt: offer.created_at,
  updatedAt: offer.updated_at
})

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

const formatOrganization = (organization) => ({
  sponsorOrgId: organization.sponsor_org_id,
  sponsorName: organization.sponsor_name,
  sponsorEmail: organization.sponsor_email,
  createdAt: organization.created_at,
  deletedAt: organization.deleted_at || null
})

const formatOrganizationAssignment = (association) => ({
  userId: association.user_id,
  sponsorOrgId: association.sponsor_org_id,
  sponsorName: association.sponsor_org.sponsor_name,
  sponsorEmail: association.sponsor_org.sponsor_email
})

const formatOrganizationUser = (association) => ({
  userId: association.user.user_id,
  email: association.user.email,
  firstName: association.user.first_name,
  lastName: association.user.last_name,
  role: association.user.role.name,
  sponsorOrgId: association.sponsor_org_id
})

const expirePendingSponsorshipOffers = async () => {
  const result = await prisma.sponsorshipOffer.updateMany({
    where: {
      status: 'pending',
      expires_at: {
        lte: new Date()
      }
    },
    data: {
      status: 'expired'
    }
  })

  return result.count
}

const getSponsorOrgAssociation = async (userId) => {
  const association = await prisma.orgUserAssociation.findUnique({
    where: {
      user_id: userId
    },
    include: {
      sponsor_org: true
    }
  })

  if (!association || association.sponsor_org.deleted_at) {
    return null
  }

  return association
}

const createSponsorOrganization = async ({ sponsorName, sponsorEmail }) => {
  const organization = await prisma.sponsorOrganization.create({
    data: {
      sponsor_name: sponsorName,
      sponsor_email: sponsorEmail.toLowerCase()
    }
  })

  return formatOrganization(organization)
}

const listSponsorOrganizations = async () => {
  const organizations = await prisma.sponsorOrganization.findMany({
    where: {
      deleted_at: null
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  return organizations.map(formatOrganization)
}

const getSponsorOrganizationById = async (sponsorOrgId) => {
  const organization = await prisma.sponsorOrganization.findUnique({
    where: {
      sponsor_org_id: sponsorOrgId
    }
  })

  if (!organization || organization.deleted_at) {
    return null
  }

  return formatOrganization(organization)
}

const updateSponsorOrganization = async ({ sponsorOrgId, sponsorName, sponsorEmail }) => {
  const existing = await prisma.sponsorOrganization.findUnique({
    where: {
      sponsor_org_id: sponsorOrgId
    }
  })

  if (!existing) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  if (existing.deleted_at) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  const updated = await prisma.sponsorOrganization.update({
    where: {
      sponsor_org_id: sponsorOrgId
    },
    data: {
      ...(sponsorName ? { sponsor_name: sponsorName } : {}),
      ...(sponsorEmail ? { sponsor_email: sponsorEmail.toLowerCase() } : {})
    }
  })

  return {
    ok: true,
    organization: formatOrganization(updated)
  }
}

const deleteSponsorOrganization = async (sponsorOrgId) => {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.sponsorOrganization.findUnique({
      where: {
        sponsor_org_id: sponsorOrgId
      }
    })

    if (!organization || organization.deleted_at) {
      return {
        ok: false,
        reason: 'not_found'
      }
    }

    await tx.orgUserAssociation.deleteMany({
      where: {
        sponsor_org_id: sponsorOrgId
      }
    })

    await tx.sponsorOrganization.update({
      where: {
        sponsor_org_id: sponsorOrgId
      },
      data: {
        deleted_at: new Date()
      }
    })

    return {
      ok: true
    }
  })
}

const assignSponsorUserToOrganization = async ({ userId, sponsorOrgId }) => {
  return prisma.$transaction(async (tx) => {
    const [user, sponsorOrganization, existingAssociation] = await Promise.all([
      tx.user.findUnique({
        where: {
          user_id: userId
        },
        include: {
          role: true
        }
      }),
      tx.sponsorOrganization.findUnique({
        where: {
          sponsor_org_id: sponsorOrgId
        }
      }),
      tx.orgUserAssociation.findUnique({
        where: {
          user_id: userId
        },
        include: {
          sponsor_org: true
        }
      })
    ])

    if (!user) {
      return {
        ok: false,
        reason: 'user_not_found'
      }
    }

    if (!sponsorOrganization) {
      return {
        ok: false,
        reason: 'sponsor_org_not_found'
      }
    }

    if (sponsorOrganization.deleted_at) {
      return {
        ok: false,
        reason: 'sponsor_org_not_found'
      }
    }

    if (user.role.name !== 'sponsor') {
      return {
        ok: false,
        reason: 'user_not_sponsor'
      }
    }

    if (existingAssociation) {
      return {
        ok: false,
        reason: 'user_already_assigned',
        existingAssignment: formatOrganizationAssignment(existingAssociation)
      }
    }

    const association = await tx.orgUserAssociation.create({
      data: {
        user_id: userId,
        sponsor_org_id: sponsorOrgId
      },
      include: {
        sponsor_org: true,
        user: {
          include: {
            role: true
          }
        }
      }
    })

    return {
      ok: true,
      assignment: formatOrganizationAssignment(association)
    }
  })
}

const listSponsorableAlumniCredentials = async ({ actorUserId, actorRole, credentialType, query }) => {
  let sponsorOrgId = null

  if (actorRole === 'sponsor') {
    const sponsorAssociation = await getSponsorOrgAssociation(actorUserId)

    if (!sponsorAssociation) {
      return {
        ok: false,
        reason: 'sponsor_org_required'
      }
    }

    sponsorOrgId = sponsorAssociation.sponsor_org_id
  }

  const credentials = await prisma.credential.findMany({
    where: {
      ...(credentialType ? { credential_type: credentialType } : {}),
      user: {
        role: {
          name: 'alumni'
        }
      }
    },
    include: {
      user: true,
      ...(sponsorOrgId
        ? {
          sponsorship_offers: {
            where: {
              sponsor_org_id: sponsorOrgId,
              status: {
                in: OFFER_CREATION_BLOCKING_STATUSES
              }
            }
          }
        }
        : {})
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  const search = query ? query.toLowerCase() : null

  const mapped = credentials.map((credential) => ({
    alumniId: credential.user_id,
    alumniEmail: credential.user.email,
    alumniFirstName: credential.user.first_name,
    alumniLastName: credential.user.last_name,
    credentialId: credential.credential_id,
    credentialType: credential.credential_type,
    credentialTitle: credential.title,
    providerName: credential.provider_name,
    credentialUrl: credential.credential_url,
    completionDate: credential.completion_date,
    hasActiveOfferFromMyOrg: sponsorOrgId ? credential.sponsorship_offers.length > 0 : false
  }))

  if (!search) {
    return {
      ok: true,
      data: mapped
    }
  }

  return {
    ok: true,
    data: mapped.filter((item) => {
      return [
        item.alumniEmail,
        item.alumniFirstName,
        item.alumniLastName,
        item.credentialTitle,
        item.providerName
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    })
  }
}

const listSponsorOrganizationUsers = async ({ actorUserId, actorRole, sponsorOrgId }) => {
  const organization = await prisma.sponsorOrganization.findUnique({
    where: {
      sponsor_org_id: sponsorOrgId
    }
  })

  if (!organization || organization.deleted_at) {
    return {
      ok: false,
      reason: 'sponsor_org_not_found'
    }
  }

  if (actorRole === 'sponsor') {
    const association = await getSponsorOrgAssociation(actorUserId)

    if (!association || association.sponsor_org_id !== sponsorOrgId) {
      return {
        ok: false,
        reason: 'not_found'
      }
    }
  }

  const users = await prisma.orgUserAssociation.findMany({
    where: {
      sponsor_org_id: sponsorOrgId
    },
    include: {
      user: {
        include: {
          role: true
        }
      }
    },
    orderBy: {
      user: {
        created_at: 'desc'
      }
    }
  })

  return {
    ok: true,
    data: users.map(formatOrganizationUser)
  }
}

const getMySponsorOrganization = async (userId) => {
  const association = await getSponsorOrgAssociation(userId)

  if (!association) {
    return null
  }

  return formatOrganizationAssignment(association)
}

const leaveSponsorOrganization = async (userId) => {
  const association = await prisma.orgUserAssociation.findUnique({
    where: {
      user_id: userId
    }
  })

  if (!association) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  await prisma.orgUserAssociation.delete({
    where: {
      user_id: userId
    }
  })

  return {
    ok: true
  }
}

const removeUserFromSponsorOrganization = async ({ userId, sponsorOrgId }) => {
  const association = await prisma.orgUserAssociation.findUnique({
    where: {
      user_id: userId
    }
  })

  if (!association) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  if (association.sponsor_org_id !== sponsorOrgId) {
    return {
      ok: false,
      reason: 'not_in_org'
    }
  }

  await prisma.orgUserAssociation.delete({
    where: {
      user_id: userId
    }
  })

  return {
    ok: true
  }
}

const createSponsorshipOffer = async ({
  actorUserId,
  actorRole,
  alumniId,
  credentialType,
  credentialId,
  amountOffered,
  message,
  expiresInDays
}) => {
  await expirePendingSponsorshipOffers()

  const sponsorAssociation = await getSponsorOrgAssociation(actorUserId)

  if (!sponsorAssociation && (actorRole === 'sponsor' || actorRole === 'admin')) {
    return {
      ok: false,
      reason: 'sponsor_org_required'
    }
  }

  const credential = await prisma.credential.findFirst({
    where: {
      credential_id: credentialId,
      credential_type: credentialType
    },
    include: {
      user: {
        include: {
          role: true
        }
      }
    }
  })

  if (credential?.user?.role?.name !== 'alumni') {
    return {
      ok: false,
      reason: 'credential_not_found'
    }
  }

  if (alumniId && alumniId !== credential.user_id) {
    return {
      ok: false,
      reason: 'credential_alumni_mismatch'
    }
  }

  const resolvedAlumniId = credential.user_id

  const duplicateCount = await prisma.sponsorshipOffer.count({
    where: {
      sponsor_org_id: sponsorAssociation.sponsor_org_id,
      alumni_user_id: resolvedAlumniId,
      credential_id: credentialId,
      status: {
        in: OFFER_CREATION_BLOCKING_STATUSES
      }
    }
  })

  if (duplicateCount > 0) {
    return {
      ok: false,
      reason: 'duplicate_active_offer'
    }
  }

  const expiresAt = new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000))

  const offer = await prisma.sponsorshipOffer.create({
    data: {
      sponsor_org_id: sponsorAssociation.sponsor_org_id,
      alumni_user_id: resolvedAlumniId,
      credential_id: credentialId,
      amount_offered: amountOffered,
      status: 'pending',
      message: message || null,
      expires_at: expiresAt
    },
    include: {
      sponsor_org: true,
      credential: true
    }
  })

  return {
    ok: true,
    offer: formatOffer(offer)
  }
}

const buildOfferWhereClause = ({ status, alumniId, sponsorName, sponsorOrgId }) => {
  const where = {}

  if (status) {
    where.status = status
  }

  if (alumniId) {
    where.alumni_user_id = alumniId
  }

  if (sponsorOrgId) {
    where.sponsor_org_id = sponsorOrgId
  }

  if (sponsorName) {
    where.sponsor_org = {
      sponsor_name: {
        contains: sponsorName,
        mode: 'insensitive'
      }
    }
  }

  return where
}

const listSponsorshipOffers = async ({
  actorUserId,
  actorRole,
  status,
  alumniId,
  sponsorName
}) => {
  await expirePendingSponsorshipOffers()

  if (actorRole !== 'sponsor') {
    return {
      ok: false,
      reason: 'forbidden'
    }
  }

  const sponsorAssociation = await getSponsorOrgAssociation(actorUserId)

  if (!sponsorAssociation) {
    return {
      ok: false,
      reason: 'sponsor_org_required'
    }
  }

  const sponsorOrgId = sponsorAssociation.sponsor_org_id

  const where = buildOfferWhereClause({
    status,
    alumniId,
    sponsorName,
    sponsorOrgId
  })

  const offers = await prisma.sponsorshipOffer.findMany({
    where,
    include: {
      sponsor_org: true,
      credential: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  return {
    ok: true,
    data: offers.map(formatOffer)
  }
}

const getSponsorshipOfferById = async ({ actorUserId, actorRole, offerId }) => {
  await expirePendingSponsorshipOffers()

  const offer = await prisma.sponsorshipOffer.findUnique({
    where: {
      offer_id: offerId
    },
    include: {
      sponsor_org: true,
      credential: true
    }
  })

  if (!offer) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  if (actorRole === 'admin') {
    return {
      ok: true,
      offer: formatOffer(offer)
    }
  }

  if (actorRole === 'alumni' && offer.alumni_user_id === actorUserId) {
    return {
      ok: true,
      offer: formatOffer(offer)
    }
  }

  if (actorRole === 'sponsor') {
    const sponsorAssociation = await getSponsorOrgAssociation(actorUserId)

    if (!sponsorAssociation || sponsorAssociation.sponsor_org_id !== offer.sponsor_org_id) {
      return {
        ok: false,
        reason: 'not_found'
      }
    }

    return {
      ok: true,
      offer: formatOffer(offer)
    }
  }

  return {
    ok: false,
    reason: 'not_found'
  }
}

const cancelSponsorshipOffer = async ({ actorUserId, actorRole, offerId }) => {
  await expirePendingSponsorshipOffers()

  const offer = await prisma.sponsorshipOffer.findUnique({
    where: {
      offer_id: offerId
    }
  })

  if (!offer) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  if (actorRole === 'sponsor') {
    const sponsorAssociation = await getSponsorOrgAssociation(actorUserId)

    if (!sponsorAssociation || sponsorAssociation.sponsor_org_id !== offer.sponsor_org_id) {
      return {
        ok: false,
        reason: 'not_found'
      }
    }
  }

  if (offer.status !== 'pending') {
    return {
      ok: false,
      reason: 'invalid_status'
    }
  }

  await prisma.sponsorshipOffer.update({
    where: {
      offer_id: offerId
    },
    data: {
      status: 'cancelled'
    }
  })

  return {
    ok: true
  }
}

const setSponsorshipOfferResponse = async ({ alumniUserId, offerId, action }) => {
  await expirePendingSponsorshipOffers()

  const offer = await prisma.sponsorshipOffer.findUnique({
    where: {
      offer_id: offerId
    },
    include: {
      sponsor_org: true,
      credential: true
    }
  })

  if (!offer || offer.alumni_user_id !== alumniUserId) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  if (offer.status !== 'pending') {
    return {
      ok: false,
      reason: 'invalid_status'
    }
  }

  if (offer.expires_at <= new Date()) {
    await prisma.sponsorshipOffer.update({
      where: {
        offer_id: offerId
      },
      data: {
        status: 'expired'
      }
    })

    return {
      ok: false,
      reason: 'expired'
    }
  }

  const nextStatus = action === 'accept' ? 'accepted' : 'declined'

  const updated = await prisma.sponsorshipOffer.update({
    where: {
      offer_id: offerId
    },
    data: {
      status: nextStatus
    },
    include: {
      sponsor_org: true,
      credential: true
    }
  })

  return {
    ok: true,
    offer: formatOffer(updated)
  }
}

const listMyReceivedSponsorshipOffers = async ({ alumniUserId, status }) => {
  await expirePendingSponsorshipOffers()

  const where = {
    alumni_user_id: alumniUserId
  }

  if (status) {
    where.status = status
  }

  const offers = await prisma.sponsorshipOffer.findMany({
    where,
    include: {
      sponsor_org: true,
      credential: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  return offers.map(formatOffer)
}

const getMySponsorshipBalance = async (alumniUserId) => {
  await expirePendingSponsorshipOffers()

  const [acceptedOffers, usedResult] = await Promise.all([
    prisma.sponsorshipOffer.findMany({
      where: {
        alumni_user_id: alumniUserId,
        status: 'accepted'
      },
      include: {
        sponsor_org: true,
        credential: true
      },
      orderBy: {
        created_at: 'desc'
      }
    }),
    prisma.bid.aggregate({
      where: {
        alumni_user_id: alumniUserId,
        status: {
          in: ACTIVE_BID_STATUSES
        }
      },
      _sum: {
        amount: true
      }
    })
  ])

  const totalOffered = acceptedOffers.reduce((sum, offer) => sum + toNumber(offer.amount_offered), 0)
  const totalUsedInBids = toNumber(usedResult._sum.amount || 0)

  return {
    alumniId: alumniUserId,
    totalOffered,
    totalUsedInBids,
    availableForBidding: Math.max(0, totalOffered - totalUsedInBids),
    acceptedOffers: acceptedOffers.map(formatOffer)
  }
}

const listSponsorshipPayouts = async ({ actorUserId, actorRole, alumniId, from, to }) => {
  const where = {}

  if (actorRole === 'alumni') {
    where.alumni_user_id = actorUserId
  } else if (actorRole === 'admin') {
    if (alumniId) {
      where.alumni_user_id = alumniId
    }
  } else {
    return {
      ok: false,
      reason: 'forbidden'
    }
  }

  if (from || to) {
    where.created_at = {}

    if (from) {
      where.created_at.gte = from
    }

    if (to) {
      where.created_at.lte = to
    }
  }

  const payouts = await prisma.sponsorshipPayout.findMany({
    where,
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
    orderBy: {
      created_at: 'desc'
    }
  })

  return {
    ok: true,
    data: payouts.map(formatPayout)
  }
}

const getSponsorshipPayoutById = async ({ actorUserId, actorRole, payoutId }) => {
  const payout = await prisma.sponsorshipPayout.findUnique({
    where: {
      payout_id: payoutId
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

  if (!payout) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  if (actorRole === 'alumni' && payout.alumni_user_id !== actorUserId) {
    return {
      ok: false,
      reason: 'not_found'
    }
  }

  if (actorRole !== 'admin' && actorRole !== 'alumni') {
    return {
      ok: false,
      reason: 'forbidden'
    }
  }

  return {
    ok: true,
    payout: formatPayout(payout)
  }
}

const getOrgProfitSummary = async ({ from, to }) => {
  const payoutWhere = {}

  if (from || to) {
    payoutWhere.created_at = {}

    if (from) {
      payoutWhere.created_at.gte = from
    }

    if (to) {
      payoutWhere.created_at.lte = to
    }
  }

  const [payoutAggregate, payoutLineAggregate] = await Promise.all([
    prisma.sponsorshipPayout.aggregate({
      where: payoutWhere,
      _sum: {
        winning_bid_amount: true,
        alumni_payout: true
      },
      _count: {
        _all: true
      }
    }),
    prisma.sponsorshipPayoutLine.aggregate({
      where: {
        payout: payoutWhere
      },
      _sum: {
        amount_charged: true
      }
    })
  ])

  const totalSponsorshipCharged = toNumber(payoutLineAggregate._sum.amount_charged || 0)
  const totalWinningBidAmount = toNumber(payoutAggregate._sum.winning_bid_amount || 0)
  const totalAlumniPayout = toNumber(payoutAggregate._sum.alumni_payout || 0)
  const orgProfit = totalWinningBidAmount

  return {
    payoutCount: payoutAggregate._count._all,
    totalSponsorshipCharged,
    totalWinningBidAmount,
    totalAlumniPayout,
    orgProfit
  }
}

module.exports = {
  assignSponsorUserToOrganization,
  cancelSponsorshipOffer,
  createSponsorOrganization,
  deleteSponsorOrganization,
  createSponsorshipOffer,
  getMySponsorOrganization,
  getMySponsorshipBalance,
  getSponsorOrganizationById,
  getSponsorshipOfferById,
  getSponsorshipPayoutById,
  getOrgProfitSummary,
  leaveSponsorOrganization,
  listSponsorableAlumniCredentials,
  listMyReceivedSponsorshipOffers,
  listSponsorOrganizationUsers,
  listSponsorOrganizations,
  listSponsorshipOffers,
  listSponsorshipPayouts,
  expirePendingSponsorshipOffers,
  removeUserFromSponsorOrganization,
  setSponsorshipOfferResponse,
  updateSponsorOrganization
}
