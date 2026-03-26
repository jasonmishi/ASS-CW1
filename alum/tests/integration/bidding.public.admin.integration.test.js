const { api, authHeader } = require('../helpers/http')
const { createApiClientWithToken, createAuthenticatedUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')
const { API_CLIENT_SCOPES } = require('../../utils/api-client-scopes')
const emailService = require('../../services/email.service')

const toUtcDateOnly = (dateInput) => {
  const date = new Date(dateInput)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const addUtcDays = (date, days) => {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return toUtcDateOnly(result)
}

describe('Bidding, Public, and Admin winner/attendance endpoints', () => {
  let winnerEmailSpy
  let loserEmailSpy
  let outbidEmailSpy

  beforeEach(() => {
    winnerEmailSpy = jest.spyOn(emailService, 'sendWinnerNotificationEmail').mockResolvedValue({})
    loserEmailSpy = jest.spyOn(emailService, 'sendLosingBidNotificationEmail').mockResolvedValue({})
    outbidEmailSpy = jest.spyOn(emailService, 'sendOutbidNotificationEmail').mockResolvedValue({})
  })

  afterEach(() => {
    winnerEmailSpy.mockRestore()
    loserEmailSpy.mockRestore()
    outbidEmailSpy.mockRestore()
  })

  it('prevents bidding without accepted sponsorship balance', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'bid.no.funds@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await api()
      .post('/api/v1/bids')
      .set(authHeader(token))
      .send({
        amount: 200
      })

    expect(response.status).toBe(403)
    expect(response.body.message).toMatch(/Insufficient sponsorship funds/i)
  })

  it('blocks bidding for alumni accounts without an eastminster email', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'external.bidder@sponsor.com',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await api()
      .post('/api/v1/bids')
      .set(authHeader(token))
      .send({
        amount: 200
      })

    expect(response.status).toBe(403)
    expect(response.body.message).toMatch(/@eastminster\.ac\.uk/i)
  })

  it('allows alumni to place and view current bid when accepted sponsorship exists', async () => {
    const { user: alumniUser, token } = await createAuthenticatedUser({
      email: 'bid.with.funds@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'course',
        title: 'Kubernetes Fundamentals',
        provider_name: 'Coursera',
        credential_url: 'https://example.com/kubernetes-course',
        completion_date: new Date('2025-12-01T00:00:00.000Z')
      }
    })

    const sponsorOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Coursera',
        sponsor_email: 'sponsors@coursera.org'
      }
    })

    await prisma.sponsorshipOffer.create({
      data: {
        sponsor_org_id: sponsorOrg.sponsor_org_id,
        alumni_user_id: alumniUser.user_id,
        credential_id: credential.credential_id,
        amount_offered: 500,
        status: 'accepted',
        expires_at: addUtcDays(new Date(), 10)
      }
    })

    const bidResponse = await api()
      .post('/api/v1/bids')
      .set(authHeader(token))
      .send({
        amount: 250
      })

    expect(bidResponse.status).toBe(201)
    expect(bidResponse.body.success).toBe(true)
    expect(bidResponse.body.data.amount).toBe(250)

    const currentResponse = await api()
      .get('/api/v1/bids/current')
      .set(authHeader(token))

    expect(currentResponse.status).toBe(200)
    expect(currentResponse.body.data.hasBid).toBe(true)
    expect(currentResponse.body.data.currentBidAmount).toBe(250)
  })

  it('blocks overcommitting funds when unresolved bids already exist', async () => {
    const { user: alumniUser, token } = await createAuthenticatedUser({
      email: 'bid.overcommit@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'course',
        title: 'Data Engineering Foundations',
        provider_name: 'Udemy',
        credential_url: 'https://example.com/data-engineering',
        completion_date: new Date('2025-12-03T00:00:00.000Z')
      }
    })

    const sponsorOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Udemy',
        sponsor_email: 'sponsors@udemy.com'
      }
    })

    await prisma.sponsorshipOffer.create({
      data: {
        sponsor_org_id: sponsorOrg.sponsor_org_id,
        alumni_user_id: alumniUser.user_id,
        credential_id: credential.credential_id,
        amount_offered: 500,
        status: 'accepted',
        expires_at: addUtcDays(new Date(), 10)
      }
    })

    await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 300,
        status: 'pending',
        bid_date: addUtcDays(new Date(), 2)
      }
    })

    const response = await api()
      .post('/api/v1/bids')
      .set(authHeader(token))
      .send({
        amount: 250
      })

    expect(response.status).toBe(403)
    expect(response.body.message).toMatch(/insufficient sponsorship funds/i)
    expect(response.body.message).toMatch(/£200.00/)
  })

  it('allows bid updates up to total pool by excluding current bid from used amount', async () => {
    const { user: alumniUser, token } = await createAuthenticatedUser({
      email: 'bid.update.pool@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'course',
        title: 'Advanced Node.js',
        provider_name: 'Pluralsight',
        credential_url: 'https://example.com/advanced-nodejs',
        completion_date: new Date('2025-12-05T00:00:00.000Z')
      }
    })

    const sponsorOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Pluralsight',
        sponsor_email: 'sponsors@pluralsight.com'
      }
    })

    await prisma.sponsorshipOffer.create({
      data: {
        sponsor_org_id: sponsorOrg.sponsor_org_id,
        alumni_user_id: alumniUser.user_id,
        credential_id: credential.credential_id,
        amount_offered: 500,
        status: 'accepted',
        expires_at: addUtcDays(new Date(), 10)
      }
    })

    const bid = await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 200,
        status: 'pending',
        bid_date: addUtcDays(new Date(), 1)
      }
    })

    const updateTo450 = await api()
      .patch(`/api/v1/bids/${bid.bid_id}`)
      .set(authHeader(token))
      .send({
        amount: 450
      })

    expect(updateTo450.status).toBe(200)
    expect(updateTo450.body.data.amount).toBe(450)

    const updateTo550 = await api()
      .patch(`/api/v1/bids/${bid.bid_id}`)
      .set(authHeader(token))
      .send({
        amount: 550
      })

    expect(updateTo550.status).toBe(403)
    expect(updateTo550.body.message).toMatch(/insufficient sponsorship funds/i)
    expect(updateTo550.body.message).toMatch(/£500.00/)
  })

  it('sends outbid email when a leading bidder becomes losing', async () => {
    const { user: leadingAlumni, token: leadingToken } = await createAuthenticatedUser({
      email: 'bid.leader@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const { user: challengerAlumni, token: challengerToken } = await createAuthenticatedUser({
      email: 'bid.challenger@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const [leaderCredential, challengerCredential] = await Promise.all([
      prisma.credential.create({
        data: {
          user_id: leadingAlumni.user_id,
          credential_type: 'course',
          title: 'Leader Credential',
          provider_name: 'Provider A',
          credential_url: 'https://example.com/leader',
          completion_date: new Date('2025-12-05T00:00:00.000Z')
        }
      }),
      prisma.credential.create({
        data: {
          user_id: challengerAlumni.user_id,
          credential_type: 'course',
          title: 'Challenger Credential',
          provider_name: 'Provider B',
          credential_url: 'https://example.com/challenger',
          completion_date: new Date('2025-12-06T00:00:00.000Z')
        }
      })
    ])

    const sponsorOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Shared Sponsor',
        sponsor_email: 'shared@sponsor.org'
      }
    })

    await prisma.sponsorshipOffer.createMany({
      data: [
        {
          sponsor_org_id: sponsorOrg.sponsor_org_id,
          alumni_user_id: leadingAlumni.user_id,
          credential_id: leaderCredential.credential_id,
          amount_offered: 500,
          status: 'accepted',
          expires_at: addUtcDays(new Date(), 10)
        },
        {
          sponsor_org_id: sponsorOrg.sponsor_org_id,
          alumni_user_id: challengerAlumni.user_id,
          credential_id: challengerCredential.credential_id,
          amount_offered: 500,
          status: 'accepted',
          expires_at: addUtcDays(new Date(), 10)
        }
      ]
    })

    const leaderBidResponse = await api()
      .post('/api/v1/bids')
      .set(authHeader(leadingToken))
      .send({
        amount: 250
      })

    expect(leaderBidResponse.status).toBe(201)
    expect(outbidEmailSpy).toHaveBeenCalledTimes(0)

    const challengerBidResponse = await api()
      .post('/api/v1/bids')
      .set(authHeader(challengerToken))
      .send({
        amount: 300
      })

    expect(challengerBidResponse.status).toBe(201)
    expect(outbidEmailSpy).toHaveBeenCalledTimes(1)
    expect(outbidEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
      to: leadingAlumni.email
    }))
  })

  it('records event attendance and creates winner via admin endpoints', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'winner.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'winner.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const { user: losingAlumniUser } = await createAuthenticatedUser({
      email: 'loser.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const tomorrow = addUtcDays(new Date(), 1)

    await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 300,
        status: 'winning',
        bid_date: tomorrow
      }
    })

    await prisma.bid.create({
      data: {
        alumni_user_id: losingAlumniUser.user_id,
        amount: 280,
        status: 'losing',
        bid_date: tomorrow
      }
    })

    const attendanceResponse = await api()
      .post('/api/v1/admin/event-attendances')
      .set(authHeader(adminToken))
      .send({
        alumniId: alumniUser.user_id,
        eventName: 'Eastminster Spring Alumni Networking 2026',
        eventDate: tomorrow.toISOString().slice(0, 10)
      })

    expect(attendanceResponse.status).toBe(201)
    expect(attendanceResponse.body.success).toBe(true)

    const winnerResponse = await api()
      .post('/api/v1/admin/winners')
      .set(authHeader(adminToken))
      .send({
        date: tomorrow.toISOString().slice(0, 10)
      })

    expect(winnerResponse.status).toBe(201)
    expect(winnerResponse.body.success).toBe(true)
    expect(winnerResponse.body.data.winnerId).toBe(alumniUser.user_id)
    expect(winnerEmailSpy).toHaveBeenCalledTimes(1)
    expect(winnerEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
      to: alumniUser.email
    }))
    expect(loserEmailSpy).toHaveBeenCalledTimes(1)
    expect(loserEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
      to: losingAlumniUser.email
    }))

    const listResponse = await api()
      .get('/api/v1/admin/winners')
      .set(authHeader(adminToken))

    expect(listResponse.status).toBe(200)
    expect(Array.isArray(listResponse.body.data)).toBe(true)
    expect(listResponse.body.data.length).toBeGreaterThan(0)
  })

  it('serves public featured endpoints with api client bearer token', async () => {
    const { user: adminUser } = await createAuthenticatedUser({
      email: 'public.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'public.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const { plainToken } = await createApiClientWithToken({
      createdByUserId: adminUser.user_id,
      clientName: 'Public AR Client'
    })

    const today = toUtcDateOnly(new Date())

    const bid = await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 275,
        status: 'won',
        bid_date: today
      }
    })

    await prisma.featuredWinner.create({
      data: {
        featured_date: today,
        alumni_user_id: alumniUser.user_id,
        winning_bid_id: bid.bid_id,
        winning_bid_amount: 275,
        selected_by_user_id: adminUser.user_id
      }
    })

    const featuredResponse = await api()
      .get('/api/v1/public/alumni/featured')
      .set(authHeader(plainToken))

    expect(featuredResponse.status).toBe(200)
    expect(featuredResponse.body.success).toBe(true)
    expect(featuredResponse.body.data.alumni.firstName).toBeTruthy()

    const historyResponse = await api()
      .get('/api/v1/public/alumni/featured/history')
      .set(authHeader(plainToken))

    expect(historyResponse.status).toBe(200)
    expect(Array.isArray(historyResponse.body.data)).toBe(true)

    const profileResponse = await api()
      .get(`/api/v1/public/alumni/${alumniUser.user_id}`)
      .set(authHeader(plainToken))

    expect(profileResponse.status).toBe(200)
    expect(profileResponse.body.data.userId).toBe(alumniUser.user_id)
  })

  it('enforces api client scopes on public endpoints', async () => {
    const { user: adminUser } = await createAuthenticatedUser({
      email: 'public.scope.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'public.scope.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const { plainToken } = await createApiClientWithToken({
      createdByUserId: adminUser.user_id,
      clientName: 'Scoped Public Client',
      scopes: [API_CLIENT_SCOPES.PUBLIC_FEATURED_READ]
    })

    const today = toUtcDateOnly(new Date())

    const bid = await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 275,
        status: 'won',
        bid_date: today
      }
    })

    await prisma.featuredWinner.create({
      data: {
        featured_date: today,
        alumni_user_id: alumniUser.user_id,
        winning_bid_id: bid.bid_id,
        winning_bid_amount: 275,
        selected_by_user_id: adminUser.user_id
      }
    })

    const featuredResponse = await api()
      .get('/api/v1/public/alumni/featured')
      .set(authHeader(plainToken))
    expect(featuredResponse.status).toBe(200)

    const historyResponse = await api()
      .get('/api/v1/public/alumni/featured/history')
      .set(authHeader(plainToken))
    expect(historyResponse.status).toBe(403)

    const profileResponse = await api()
      .get(`/api/v1/public/alumni/${alumniUser.user_id}`)
      .set(authHeader(plainToken))
    expect(profileResponse.status).toBe(403)
  })
})
