const { api, authHeader } = require('../helpers/http')
const { createAuthenticatedUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')
const { runWinnerSelectionForDate } = require('../../services/scheduler.service')

const addUtcDays = (dateInput, days) => {
  const date = new Date(dateInput)
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  utcDate.setUTCDate(utcDate.getUTCDate() + days)
  return utcDate
}

describe('Sponsorship endpoints', () => {
  it('creates sponsor org, assigns sponsor user, and creates sponsorship offer for alumni credential', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'sponsor.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: sponsorUser, token: sponsorToken } = await createAuthenticatedUser({
      email: 'sponsor.user@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'sponsor'
    })

    const { user: alumniUser, token: alumniToken } = await createAuthenticatedUser({
      email: 'sponsored.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'certification',
        title: 'AWS Solutions Architect Associate',
        provider_name: 'Amazon Web Services',
        credential_url: 'https://www.credly.com/aws-saa',
        completion_date: new Date('2025-10-01T00:00:00.000Z')
      }
    })

    const createOrgResponse = await api()
      .post('/api/v1/sponsorships/organizations')
      .set(authHeader(adminToken))
      .send({
        sponsorName: 'Amazon Web Services',
        sponsorEmail: 'partnerships@aws.amazon.com'
      })

    expect(createOrgResponse.status).toBe(201)
    expect(createOrgResponse.body.success).toBe(true)

    const sponsorOrgId = createOrgResponse.body.data.sponsorOrgId

    const assignResponse = await api()
      .put(`/api/v1/sponsorships/organizations/${sponsorOrgId}/users/${sponsorUser.user_id}`)
      .set(authHeader(adminToken))

    expect(assignResponse.status).toBe(200)

    const listOrgUsersAsAdminResponse = await api()
      .get(`/api/v1/sponsorships/organizations/${sponsorOrgId}/users`)
      .set(authHeader(adminToken))

    expect(listOrgUsersAsAdminResponse.status).toBe(200)
    expect(listOrgUsersAsAdminResponse.body.data.some((user) => user.userId === sponsorUser.user_id)).toBe(true)

    const listOrgUsersAsSponsorResponse = await api()
      .get(`/api/v1/sponsorships/organizations/${sponsorOrgId}/users`)
      .set(authHeader(sponsorToken))

    expect(listOrgUsersAsSponsorResponse.status).toBe(200)
    expect(listOrgUsersAsSponsorResponse.body.data.some((user) => user.userId === sponsorUser.user_id)).toBe(true)
    expect(assignResponse.body.success).toBe(true)

    const createOfferResponse = await api()
      .post('/api/v1/sponsorships/offers')
      .set(authHeader(sponsorToken))
      .send({
        credentialType: 'certification',
        credentialId: credential.credential_id,
        amountOffered: 300,
        message: 'Promote your AWS certification with us',
        expiresInDays: 7
      })

    expect(createOfferResponse.status).toBe(201)
    expect(createOfferResponse.body.success).toBe(true)
    expect(createOfferResponse.body.data.status).toBe('pending')
    expect(createOfferResponse.body.data.sponsorName).toBe('Amazon Web Services')

    const myOffersResponse = await api()
      .get('/api/v1/sponsorships/offers/me')
      .set(authHeader(alumniToken))

    expect(myOffersResponse.status).toBe(200)
    expect(myOffersResponse.body.data).toHaveLength(1)
    expect(myOffersResponse.body.data[0].credentialId).toBe(credential.credential_id)

    const offerId = createOfferResponse.body.data.id

    const acceptResponse = await api()
      .put(`/api/v1/sponsorships/offers/${offerId}/response`)
      .set(authHeader(alumniToken))
      .send({
        action: 'accept'
      })

    expect(acceptResponse.status).toBe(200)
    expect(acceptResponse.body.data.status).toBe('accepted')

    const cancelAcceptedOfferResponse = await api()
      .delete(`/api/v1/sponsorships/offers/${offerId}`)
      .set(authHeader(sponsorToken))

    expect(cancelAcceptedOfferResponse.status).toBe(400)
    expect(cancelAcceptedOfferResponse.body.message).toMatch(/only pending offers can be cancelled/i)

    const balanceResponse = await api()
      .get('/api/v1/sponsorships/balance')
      .set(authHeader(alumniToken))

    expect(balanceResponse.status).toBe(200)
    expect(balanceResponse.body.data.totalOffered).toBe(300)
    expect(balanceResponse.body.data.availableForBidding).toBe(300)
    expect(balanceResponse.body.data.acceptedOffers).toHaveLength(1)
  })

  it('rejects sponsorship offer creation when sponsor is not assigned to an organization', async () => {
    const { token: sponsorToken } = await createAuthenticatedUser({
      email: 'unassigned.sponsor@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'sponsor'
    })

    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'another.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'course',
        title: 'Cloud Fundamentals',
        provider_name: 'Coursera',
        credential_url: 'https://www.coursera.org/cloud-fundamentals',
        completion_date: new Date('2025-11-01T00:00:00.000Z')
      }
    })

    const response = await api()
      .post('/api/v1/sponsorships/offers')
      .set(authHeader(sponsorToken))
      .send({
        credentialType: 'course',
        credentialId: credential.credential_id,
        amountOffered: 200
      })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/organization is not configured/i)
  })

  it('returns used bid commitments in sponsorship balance', async () => {
    const { user: alumniUser, token: alumniToken } = await createAuthenticatedUser({
      email: 'balance.used.bids@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'certification',
        title: 'Azure Administrator Associate',
        provider_name: 'Microsoft',
        credential_url: 'https://example.com/azure-admin',
        completion_date: new Date('2025-12-01T00:00:00.000Z')
      }
    })

    const sponsorOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Microsoft Learn',
        sponsor_email: 'partners@microsoft.com'
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
        amount: 250,
        status: 'pending',
        bid_date: addUtcDays(new Date(), 2)
      }
    })

    const balanceResponse = await api()
      .get('/api/v1/sponsorships/balance')
      .set(authHeader(alumniToken))

    expect(balanceResponse.status).toBe(200)
    expect(balanceResponse.body.data.totalOffered).toBe(500)
    expect(balanceResponse.body.data.totalUsedInBids).toBe(250)
    expect(balanceResponse.body.data.availableForBidding).toBe(250)
  })

  it('reports org profit as the winning bid and alumni payout as sponsorship surplus', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'profit.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'profit.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const sponsorOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Profit Sponsor',
        sponsor_email: 'profit@sponsor.org'
      }
    })

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'course',
        title: 'Profit Modeling',
        provider_name: 'Eastminster Labs',
        credential_url: 'https://example.com/profit-modeling',
        completion_date: new Date('2025-12-01T00:00:00.000Z')
      }
    })

    await prisma.sponsorshipOffer.createMany({
      data: [
        {
          sponsor_org_id: sponsorOrg.sponsor_org_id,
          alumni_user_id: alumniUser.user_id,
          credential_id: credential.credential_id,
          amount_offered: 100,
          status: 'accepted',
          expires_at: addUtcDays(new Date(), 10)
        },
        {
          sponsor_org_id: sponsorOrg.sponsor_org_id,
          alumni_user_id: alumniUser.user_id,
          credential_id: credential.credential_id,
          amount_offered: 50,
          status: 'accepted',
          expires_at: addUtcDays(new Date(), 10)
        }
      ]
    })

    const featuredDate = addUtcDays(new Date(), 1)

    await prisma.bid.create({
      data: {
        alumni_user_id: alumniUser.user_id,
        amount: 100,
        status: 'winning',
        bid_date: featuredDate
      }
    })

    await runWinnerSelectionForDate(featuredDate, {
      info: jest.fn(),
      warn: jest.fn()
    })

    const payoutsResponse = await api()
      .get('/api/v1/sponsorships/payouts')
      .set(authHeader(adminToken))

    expect(payoutsResponse.status).toBe(200)
    expect(payoutsResponse.body.data).toHaveLength(1)
    expect(payoutsResponse.body.data[0].winningBidAmount).toBe(100)
    expect(payoutsResponse.body.data[0].alumniPayout).toBe(50)

    const profitResponse = await api()
      .get('/api/v1/sponsorships/profit/org')
      .set(authHeader(adminToken))

    expect(profitResponse.status).toBe(200)
    expect(profitResponse.body.data.totalSponsorshipCharged).toBe(150)
    expect(profitResponse.body.data.totalWinningBidAmount).toBe(100)
    expect(profitResponse.body.data.totalAlumniPayout).toBe(50)
    expect(profitResponse.body.data.orgProfit).toBe(100)
  })

  it('supports sponsor organization admin management and user self-service assignment endpoints', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'org.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: sponsorUser, token: sponsorToken } = await createAuthenticatedUser({
      email: 'org.sponsor@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'sponsor'
    })

    const createOrgResponse = await api()
      .post('/api/v1/sponsorships/organizations')
      .set(authHeader(adminToken))
      .send({
        sponsorName: 'Coursera',
        sponsorEmail: 'partnerships@coursera.org'
      })

    expect(createOrgResponse.status).toBe(201)
    const sponsorOrgId = createOrgResponse.body.data.sponsorOrgId

    const listResponse = await api()
      .get('/api/v1/sponsorships/organizations')
      .set(authHeader(adminToken))

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data.some((org) => org.sponsorOrgId === sponsorOrgId)).toBe(true)

    const getResponse = await api()
      .get(`/api/v1/sponsorships/organizations/${sponsorOrgId}`)
      .set(authHeader(adminToken))

    expect(getResponse.status).toBe(200)
    expect(getResponse.body.data.sponsorName).toBe('Coursera')

    const updateResponse = await api()
      .put(`/api/v1/sponsorships/organizations/${sponsorOrgId}`)
      .set(authHeader(adminToken))
      .send({
        sponsorName: 'Coursera Plus'
      })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data.sponsorName).toBe('Coursera Plus')

    const assignResponse = await api()
      .put(`/api/v1/sponsorships/organizations/${sponsorOrgId}/users/${sponsorUser.user_id}`)
      .set(authHeader(adminToken))

    expect(assignResponse.status).toBe(200)

    const myOrgResponse = await api()
      .get('/api/v1/sponsorships/organizations/me')
      .set(authHeader(sponsorToken))

    expect(myOrgResponse.status).toBe(200)
    expect(myOrgResponse.body.data.sponsorOrgId).toBe(sponsorOrgId)

    const sponsorableCredentialsResponse = await api()
      .get('/api/v1/sponsorships/alumni/credentials')
      .set(authHeader(sponsorToken))

    expect(sponsorableCredentialsResponse.status).toBe(200)
    expect(Array.isArray(sponsorableCredentialsResponse.body.data)).toBe(true)

    const leaveResponse = await api()
      .delete('/api/v1/sponsorships/organizations/me')
      .set(authHeader(sponsorToken))

    expect(leaveResponse.status).toBe(204)

    const myOrgAfterLeaveResponse = await api()
      .get('/api/v1/sponsorships/organizations/me')
      .set(authHeader(sponsorToken))

    expect(myOrgAfterLeaveResponse.status).toBe(404)

    const deleteOrgResponse = await api()
      .delete(`/api/v1/sponsorships/organizations/${sponsorOrgId}`)
      .set(authHeader(adminToken))

    expect(deleteOrgResponse.status).toBe(204)
  })

  it('rejects assigning a sponsor user to a second organization before removal from the first', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'reassign.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: sponsorUser } = await createAuthenticatedUser({
      email: 'reassign.sponsor@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'sponsor'
    })

    const firstOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'First Sponsor Org',
        sponsor_email: 'first@sponsor.org'
      }
    })

    const secondOrg = await prisma.sponsorOrganization.create({
      data: {
        sponsor_name: 'Second Sponsor Org',
        sponsor_email: 'second@sponsor.org'
      }
    })

    const firstAssignResponse = await api()
      .put(`/api/v1/sponsorships/organizations/${firstOrg.sponsor_org_id}/users/${sponsorUser.user_id}`)
      .set(authHeader(adminToken))

    expect(firstAssignResponse.status).toBe(200)

    const secondAssignResponse = await api()
      .put(`/api/v1/sponsorships/organizations/${secondOrg.sponsor_org_id}/users/${sponsorUser.user_id}`)
      .set(authHeader(adminToken))

    expect(secondAssignResponse.status).toBe(400)
    expect(secondAssignResponse.body.message).toMatch(/delete the user from the existing sponsor organization first/i)
    expect(secondAssignResponse.body.data.sponsorOrgId).toBe(firstOrg.sponsor_org_id)

    const persistedAssignment = await prisma.orgUserAssociation.findUnique({
      where: {
        user_id: sponsorUser.user_id
      }
    })

    expect(persistedAssignment.sponsor_org_id).toBe(firstOrg.sponsor_org_id)
  })

  it('soft deletes sponsor organizations while preserving historical offers and removing active assignments', async () => {
    const { token: adminToken } = await createAuthenticatedUser({
      email: 'soft.delete.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { user: sponsorUser, token: sponsorToken } = await createAuthenticatedUser({
      email: 'soft.delete.sponsor@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'sponsor'
    })

    const { user: alumniUser } = await createAuthenticatedUser({
      email: 'soft.delete.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const createOrgResponse = await api()
      .post('/api/v1/sponsorships/organizations')
      .set(authHeader(adminToken))
      .send({
        sponsorName: 'Soft Delete Org',
        sponsorEmail: 'soft-delete@sponsor.org'
      })

    expect(createOrgResponse.status).toBe(201)
    const sponsorOrgId = createOrgResponse.body.data.sponsorOrgId

    const assignResponse = await api()
      .put(`/api/v1/sponsorships/organizations/${sponsorOrgId}/users/${sponsorUser.user_id}`)
      .set(authHeader(adminToken))

    expect(assignResponse.status).toBe(200)

    const credential = await prisma.credential.create({
      data: {
        user_id: alumniUser.user_id,
        credential_type: 'course',
        title: 'Soft Delete Credential',
        provider_name: 'Archive Provider',
        credential_url: 'https://example.com/soft-delete-credential',
        completion_date: new Date('2025-12-01T00:00:00.000Z')
      }
    })

    const offer = await prisma.sponsorshipOffer.create({
      data: {
        sponsor_org_id: sponsorOrgId,
        alumni_user_id: alumniUser.user_id,
        credential_id: credential.credential_id,
        amount_offered: 125,
        status: 'declined',
        expires_at: addUtcDays(new Date(), 10)
      }
    })

    const deleteResponse = await api()
      .delete(`/api/v1/sponsorships/organizations/${sponsorOrgId}`)
      .set(authHeader(adminToken))

    expect(deleteResponse.status).toBe(204)

    const deletedOrg = await prisma.sponsorOrganization.findUnique({
      where: {
        sponsor_org_id: sponsorOrgId
      }
    })

    expect(deletedOrg.deleted_at).toBeTruthy()

    const removedAssignment = await prisma.orgUserAssociation.findUnique({
      where: {
        user_id: sponsorUser.user_id
      }
    })

    expect(removedAssignment).toBeNull()

    const preservedOffer = await prisma.sponsorshipOffer.findUnique({
      where: {
        offer_id: offer.offer_id
      }
    })

    expect(preservedOffer.sponsor_org_id).toBe(sponsorOrgId)

    const listResponse = await api()
      .get('/api/v1/sponsorships/organizations')
      .set(authHeader(adminToken))

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data.some((org) => org.sponsorOrgId === sponsorOrgId)).toBe(false)

    const getResponse = await api()
      .get(`/api/v1/sponsorships/organizations/${sponsorOrgId}`)
      .set(authHeader(adminToken))

    expect(getResponse.status).toBe(404)

    const sponsorMyOrgResponse = await api()
      .get('/api/v1/sponsorships/organizations/me')
      .set(authHeader(sponsorToken))

    expect(sponsorMyOrgResponse.status).toBe(404)
  })
})
