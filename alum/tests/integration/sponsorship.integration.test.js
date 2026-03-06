const { api, authHeader } = require('../helpers/http')
const { createAuthenticatedUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')

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
})
