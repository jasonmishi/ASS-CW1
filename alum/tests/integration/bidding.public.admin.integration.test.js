const { api, authHeader } = require('../helpers/http')
const { createApiClientWithToken, createAuthenticatedUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')

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

    const tomorrow = addUtcDays(new Date(), 1)

    await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 300,
        status: 'winning',
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
})
