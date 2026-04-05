const { api } = require('../helpers/http')

describe('API docs endpoints', () => {
  it('serves Swagger UI at /api-docs', async () => {
    const response = await api().get('/api-docs')

    expect(response.status).toBe(301)
    expect(response.headers.location).toBe('/api-docs/')
  })

  it('serves OpenAPI JSON at /api-docs.json', async () => {
    const response = await api().get('/api-docs.json')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('openapi')
    expect(response.body).toHaveProperty('paths')
    expect(response.body.paths).toHaveProperty('/auth/users')
  })
})
