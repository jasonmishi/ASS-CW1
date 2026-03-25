const { createAuthenticatedUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')
const { runRateLimitCounterCleanup, runSponsorshipExpirySweep, runWinnerSelectionForDate } = require('../../services/scheduler.service')

const toUtcDateOnly = (dateInput) => {
  const date = new Date(dateInput)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const addUtcDays = (date, days) => {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return toUtcDateOnly(result)
}

describe('Scheduler service', () => {
  it('expires pending sponsorship offers via worker sweep', async () => {
    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'expiry.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const sponsorOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Expiry Sponsor',
        sponsor_email: 'expiry@sponsor.org'
      }
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'course',
        title: 'Data Engineering 101',
        provider_name: 'Eastminster Labs',
        credential_url: 'https://example.com/de101',
        completion_date: new Date('2025-08-01T00:00:00.000Z')
      }
    })

    const expiredOffer = await prisma.sponsorshipOffer.create({
      data: {
        sponsor_org_id: sponsorOrg.sponsor_org_id,
        alumni_user_id: alumniUser.user_id,
        credential_id: credential.credential_id,
        amount_offered: 200,
        status: 'pending',
        expires_at: new Date(Date.now() - 60_000)
      }
    })

    await prisma.sponsorshipOffer.create({
      data: {
        sponsor_org_id: sponsorOrg.sponsor_org_id,
        alumni_user_id: alumniUser.user_id,
        credential_id: credential.credential_id,
        amount_offered: 300,
        status: 'accepted',
        expires_at: addUtcDays(new Date(), 2)
      }
    })

    const result = await runSponsorshipExpirySweep({
      info: jest.fn()
    })

    expect(result.ok).toBe(true)
    expect(result.expiredCount).toBe(1)

    const refreshedExpiredOffer = await prisma.sponsorshipOffer.findUnique({
      where: {
        offer_id: expiredOffer.offer_id
      }
    })

    expect(refreshedExpiredOffer.status).toBe('expired')
  })

  it('deletes expired rate limit counters via worker cleanup', async () => {
    const expiredWindowStart = new Date(Date.now() - (60 * 60 * 1000))
    const activeWindowStart = new Date()

    await prisma.rateLimitCounter.createMany({
      data: [
        {
          key: 'expired-counter',
          window_start: expiredWindowStart,
          request_count: 3,
          expires_at: new Date(Date.now() - 60_000)
        },
        {
          key: 'active-counter',
          window_start: activeWindowStart,
          request_count: 2,
          expires_at: new Date(Date.now() + (60 * 60 * 1000))
        }
      ]
    })

    const result = await runRateLimitCounterCleanup({
      info: jest.fn()
    })

    expect(result.ok).toBe(true)
    expect(result.deletedCount).toBe(1)

    const expiredCounter = await prisma.rateLimitCounter.findUnique({
      where: {
        key_window_start: {
          key: 'expired-counter',
          window_start: expiredWindowStart
        }
      }
    })

    const activeCounter = await prisma.rateLimitCounter.findUnique({
      where: {
        key_window_start: {
          key: 'active-counter',
          window_start: activeWindowStart
        }
      }
    })

    expect(expiredCounter).toBeNull()
    expect(activeCounter).toBeTruthy()
    expect(activeCounter.key).toBe('active-counter')
  })

  it('creates daily winner from existing bids via scheduler service', async () => {
    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'worker.winner.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const date = toUtcDateOnly(new Date())

    const bid = await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 350,
        status: 'winning',
        bid_date: date
      }
    })

    const result = await runWinnerSelectionForDate(date, {
      info: jest.fn(),
      warn: jest.fn()
    })

    expect(result.ok).toBe(true)
    expect(['created', 'already_exists']).toContain(result.action)

    const winner = await prisma.featuredWinner.findUnique({
      where: {
        featured_date: date
      }
    })

    expect(winner).toBeTruthy()
    expect(winner.alumni_user_id).toBe(alumniUser.user_id)

    const refreshedBid = await prisma.bid.findUnique({
      where: {
        bid_id: bid.bid_id
      }
    })

    expect(refreshedBid.status).toBe('won')
  })
})
