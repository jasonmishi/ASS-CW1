const request = require('supertest')

let mockIsViewAuthenticated = false
const mockGetUserProfileById = jest.fn()

jest.mock('../../../api/middleware/web-auth.middleware', () => ({
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

jest.mock('../../../api/models/profile.model', () => ({
  getUserProfileById: (...args) => mockGetUserProfileById(...args)
}))

const app = require('../../app')

describe('alumni profile page route', () => {
  beforeEach(() => {
    mockIsViewAuthenticated = false
    mockGetUserProfileById.mockReset()
  })

  it('redirects unauthenticated users', async () => {
    const response = await request(app).get('/alumni/alumni-123')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })

  it('renders a simple full profile page', async () => {
    mockIsViewAuthenticated = true
    mockGetUserProfileById.mockResolvedValue({
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
    })

    const response = await request(app).get('/alumni/alumni-123')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni Profile')
    expect(response.text).toContain('Alice Ng')
    expect(response.text).toContain('BSc Computer Science')
  })

  it('renders not-found state when profile does not exist', async () => {
    mockIsViewAuthenticated = true
    mockGetUserProfileById.mockResolvedValue(null)

    const response = await request(app).get('/alumni/missing-id')

    expect(response.status).toBe(404)
    expect(response.text).toContain('Profile not found')
  })
})
