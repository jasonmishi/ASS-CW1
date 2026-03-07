const request = require('supertest')
const app = require('../../app')
const { generateCsrfToken } = require('../../utils/csrf')

describe('Security middleware', () => {
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
