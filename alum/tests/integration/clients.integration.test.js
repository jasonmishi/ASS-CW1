const { api, authHeader } = require('../helpers/http')
const { createAuthenticatedUser, createApiClientWithToken } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')
const { API_CLIENT_SCOPES, DEFAULT_PUBLIC_SCOPES } = require('../../utils/api-client-scopes')

describe('POST /api/v1/clients', () => {
  it('returns 403 for non-admin user', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'alumni.user@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const requestBody = {
      clientName: 'Campus Mobile App',
      description: 'Mobile app for students',
      contactEmail: 'team@campusapp.io'
    }

    const response = await api()
      .post('/api/v1/clients')
      .set(authHeader(token))
      .send(requestBody)

    expect(response.status).toBe(403)

    const client = await prisma.apiClient.findUnique({ where: { client_name: requestBody.clientName } })
    expect(client).toBeNull()
  })

  it('returns 201 and stores only token hash for admin', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'admin.user@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const requestBody = {
      clientName: 'Campus Mobile App',
      description: 'Mobile app for students',
      contactEmail: 'team@campusapp.io'
    }

    const response = await api()
      .post('/api/v1/clients')
      .set(authHeader(token))
      .send(requestBody)

    expect(response.status).toBe(201)
    expect(response.body.data).toHaveProperty('token')
    expect(response.body.data.scopes).toEqual(DEFAULT_PUBLIC_SCOPES)

    const client = await prisma.apiClient.findUnique({ where: { client_name: requestBody.clientName } })
    expect(client.created_by_user_id).toBe(user.user_id)

    const tokenRecord = await prisma.apiClientToken.findFirst({ where: { client_id: client.client_id } })
    expect(tokenRecord.token_hash).not.toBe(response.body.data.token)
    expect(tokenRecord.scopes).toEqual(DEFAULT_PUBLIC_SCOPES)
  })
})

describe('GET /api/v1/clients/:clientId/usage', () => {
  it('returns usage aggregation for admin', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'admin.stats@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { client, token: clientToken } = await createApiClientWithToken({
      clientName: 'Stats Client',
      createdByUserId: user.user_id
    })

    await prisma.apiClientEndpointUsage.createMany({
      data: [
        {
          token_id: clientToken.token_id,
          endpoint: '/api/v1/public/featured',
          http_method: 'GET',
          usage_date: new Date('2026-03-02T00:00:00.000Z'),
          request_count: 5,
          last_accessed_at: new Date('2026-03-02T10:00:00.000Z')
        },
        {
          token_id: clientToken.token_id,
          endpoint: '/api/v1/public/alumni/123',
          http_method: 'GET',
          usage_date: new Date('2026-03-02T00:00:00.000Z'),
          request_count: 2,
          last_accessed_at: new Date('2026-03-02T10:30:00.000Z')
        }
      ]
    })

    const requestBody = {}

    const response = await api()
      .get(`/api/v1/clients/${client.client_id}/usage`)
      .set(authHeader(token))
      .send(requestBody)

    expect(response.status).toBe(200)
    expect(response.body.data.total_request_count).toBe(7)
    expect(response.body.data.endpoint_usage).toHaveLength(2)
    expect(response.body.data.latest_token).toBeTruthy()

    const usageRows = await prisma.apiClientEndpointUsage.findMany({ where: { token_id: clientToken.token_id } })
    expect(usageRows).toHaveLength(2)
  })
})

describe('POST /api/v1/clients/:clientId/tokens', () => {
  it('returns 201 and creates an additional token for admin', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'admin.multi-token@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { client } = await createApiClientWithToken({
      clientName: 'Multi Token Client',
      createdByUserId: user.user_id
    })

    const response = await api()
      .post(`/api/v1/clients/${client.client_id}/tokens`)
      .set(authHeader(token))
      .send({})

    expect(response.status).toBe(201)
    expect(response.body.data).toHaveProperty('token')
    expect(response.body.data.client_id).toBe(client.client_id)
    expect(response.body.data.scopes).toEqual(DEFAULT_PUBLIC_SCOPES)

    const tokens = await prisma.apiClientToken.findMany({
      where: { client_id: client.client_id }
    })
    expect(tokens.length).toBeGreaterThanOrEqual(2)
  })

  it('returns 201 and stores provided expiresAt', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'admin.token-expiry@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { client } = await createApiClientWithToken({
      clientName: 'Expiry Token Client',
      createdByUserId: user.user_id
    })

    const expiresAt = new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString()

    const response = await api()
      .post(`/api/v1/clients/${client.client_id}/tokens`)
      .set(authHeader(token))
      .send({ expiresAt })

    expect(response.status).toBe(201)
    expect(response.body.data.expires_at).toBeTruthy()

    const createdToken = await prisma.apiClientToken.findUnique({
      where: { token_id: response.body.data.token_id }
    })
    expect(createdToken.expires_at).toBeTruthy()
    expect(createdToken.scopes).toEqual(DEFAULT_PUBLIC_SCOPES)
  })

  it('returns 201 and stores provided scopes', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'admin.token-scopes@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { client } = await createApiClientWithToken({
      clientName: 'Scoped Token Client',
      createdByUserId: user.user_id
    })

    const response = await api()
      .post(`/api/v1/clients/${client.client_id}/tokens`)
      .set(authHeader(token))
      .send({
        scopes: [API_CLIENT_SCOPES.PUBLIC_FEATURED_READ]
      })

    expect(response.status).toBe(201)
    expect(response.body.data.scopes).toEqual([API_CLIENT_SCOPES.PUBLIC_FEATURED_READ])

    const createdToken = await prisma.apiClientToken.findUnique({
      where: { token_id: response.body.data.token_id }
    })
    expect(createdToken.scopes).toEqual([API_CLIENT_SCOPES.PUBLIC_FEATURED_READ])
  })
})

describe('GET /api/v1/clients/:clientId/tokens', () => {
  it('returns all tokens for a client for admin', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'admin.token-list@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { client } = await createApiClientWithToken({
      clientName: 'Token List Client',
      createdByUserId: user.user_id
    })

    await prisma.apiClientToken.create({
      data: {
        client_id: client.client_id,
        token_hash: `hash-${Date.now()}`
      }
    })

    const response = await api()
      .get(`/api/v1/clients/${client.client_id}/tokens`)
      .set(authHeader(token))

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeGreaterThanOrEqual(2)
    expect(response.body.data[0]).toHaveProperty('token_id')
    expect(response.body.data[0]).toHaveProperty('client_id')
    expect(response.body.data[0]).toHaveProperty('scopes')
  })
})

describe('DELETE /api/v1/clients/:clientId/tokens/:tokenId', () => {
  it('returns 204 and revokes a specific token for admin', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'admin.token-revoke@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { client } = await createApiClientWithToken({
      clientName: 'Token Revoke Client',
      createdByUserId: user.user_id
    })

    const extraToken = await prisma.apiClientToken.create({
      data: {
        client_id: client.client_id,
        token_hash: `hash-revoke-${Date.now()}`
      }
    })

    const response = await api()
      .delete(`/api/v1/clients/${client.client_id}/tokens/${extraToken.token_id}`)
      .set(authHeader(token))

    expect(response.status).toBe(204)

    const updatedToken = await prisma.apiClientToken.findUnique({
      where: { token_id: extraToken.token_id }
    })
    expect(updatedToken.revoked_at).toBeTruthy()
  })
})
