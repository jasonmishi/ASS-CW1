const request = require('supertest')
const originalRateLimitEnabled = process.env.RATE_LIMIT_ENABLED

process.env.RATE_LIMIT_ENABLED = 'false'

const app = require('../../app')
const { generateCsrfToken } = require('../../utils/csrf')

describe('Security middleware', () => {
  afterAll(() => {
    if (originalRateLimitEnabled === undefined) {
      delete process.env.RATE_LIMIT_ENABLED
      return
    }

    process.env.RATE_LIMIT_ENABLED = originalRateLimitEnabled
  })

  describe('CORS', () => {
    it('returns CORS headers for an allowed origin', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .set('Origin', 'http://localhost:5173')

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
      expect(response.headers.vary).toMatch(/Origin/i)
    })

    it('does not return allow-origin header for disallowed origin', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .set('Origin', 'https://evil.example')

      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('handles preflight OPTIONS for allowed origin', async () => {
      const response = await request(app)
        .options('/api/v1/auth/users')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')

      expect(response.status).toBe(204)
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
      expect(response.headers['access-control-allow-methods']).toMatch(/POST/)
    })
  })

  describe('CSRF', () => {
    it('issues CSRF token via dedicated endpoint', async () => {
      const response = await request(app).get('/api/v1/auth/csrf-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.csrfToken).toBeTruthy()
      expect(response.headers['set-cookie']).toBeDefined()
      expect(response.headers['set-cookie'][0]).toMatch(/csrf_token=/)
    })

    it('rejects mutating requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/users')
        .send({
          email: 'csrf.blocked@eastminster.ac.uk',
          password: 'Strong!Pass1',
          confirmPassword: 'Strong!Pass1',
          firstName: 'Csrf',
          lastName: 'Blocked'
        })

      expect(response.status).toBe(403)
      expect(response.body.message).toMatch(/csrf/i)
    })

    it('allows bootstrapping CSRF via endpoint then posting', async () => {
      const bootstrap = await request(app).get('/api/v1/auth/csrf-token')
      const csrfToken = bootstrap.body.data.csrfToken
      const csrfCookie = bootstrap.headers['set-cookie']
        .find((cookie) => cookie.startsWith('csrf_token='))
        .split(';')[0]

      const response = await request(app)
        .post('/api/v1/auth/users')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'csrf.endpoint@eastminster.ac.uk',
          password: 'Strong!Pass1',
          confirmPassword: 'Strong!Pass1',
          firstName: 'Csrf',
          lastName: 'Endpoint'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('allows mutating requests with valid CSRF cookie and header', async () => {
      const csrfToken = generateCsrfToken()

      const response = await request(app)
        .post('/api/v1/auth/users')
        .set('Cookie', `csrf_token=${encodeURIComponent(csrfToken)}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'csrf.allowed@eastminster.ac.uk',
          password: 'Strong!Pass1',
          confirmPassword: 'Strong!Pass1',
          firstName: 'Csrf',
          lastName: 'Allowed'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })
})
