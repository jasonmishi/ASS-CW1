const request = require('supertest')

let mockIsViewAuthenticated = false

jest.mock('../../middleware/session-auth.middleware', () => ({
  authenticateSessionApi: (_req, _res, next) => next(),
  authenticateViewSession: (req, res, next) => {
    if (!mockIsViewAuthenticated) {
      return res.redirect('/login')
    }

    req.user = {
      user_id: 1,
      email: 'viewer@eastminster.ac.uk',
      role: 'alumni'
    }

    return next()
  }
}))

const app = require('../../app')

describe('alumni profile page route', () => {
  beforeEach(() => {
    mockIsViewAuthenticated = false
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete global.fetch
  })

  it('redirects unauthenticated users', async () => {
    const response = await request(app).get('/alumni/alumni-123')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })

  it('renders a simple full profile page', async () => {
    mockIsViewAuthenticated = true

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          userId: 'alumni-123',
          firstName: 'Alice',
          lastName: 'Ng',
          biography: 'Short bio',
          linkedinUrl: 'https://linkedin.com/in/alice',
          degrees: [{ title: 'BSc Computer Science', university: 'UE' }],
          certifications: [{ title: 'AWS Solutions Architect Associate' }],
          licences: [{ title: 'Cisco CCNA' }],
          courses: [{ title: 'Data Analytics Essentials' }],
          employmentHistory: [{ jobTitle: 'Engineer', company: 'Northwind Labs' }]
        }
      })
    })

    const response = await request(app).get('/alumni/alumni-123')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni Profile')
    expect(response.text).toContain('Alice Ng')
    expect(response.text).toContain('BSc Computer Science')
  })

  it('renders not-found state when profile does not exist', async () => {
    mockIsViewAuthenticated = true
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        success: false
      })
    })

    const response = await request(app).get('/alumni/missing-id')

    expect(response.status).toBe(404)
    expect(response.text).toContain('Profile not found')
  })
})
