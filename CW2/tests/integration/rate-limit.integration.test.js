const request = require('supertest')
const app = require('../../app')

describe('Rate limiting', () => {
  it('enforces global API limit on /api/v1 routes', async () => {
    for (let index = 0; index < 100; index += 1) {
      const response = await request(app).get('/api/v1/auth/csrf-token')
      expect(response.status).toBe(200)
    }

    const blocked = await request(app).get('/api/v1/auth/csrf-token')

    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({
      success: false,
      message: 'Too many requests. Please try again later.'
    })
    expect(blocked.headers['retry-after']).toBeDefined()
  })

  it('does not rate limit docs endpoints', async () => {
    for (let index = 0; index < 130; index += 1) {
      const response = await request(app).get('/api-docs.json')
      expect(response.status).toBe(200)
    }
  })
})
