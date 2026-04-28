const request = require('supertest')

let mockIsViewAuthenticated = false

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

const app = require('../../app')

describe('bidding page web routes', () => {
  beforeEach(() => {
    mockIsViewAuthenticated = false
  })

  it('redirects unauthenticated users away from the bidding page', async () => {
    const response = await request(app).get('/bidding')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })

  it('renders the bidding page for authenticated users', async () => {
    mockIsViewAuthenticated = true

    const response = await request(app).get('/bidding')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Blind Bidding')
    expect(response.text).toContain('Place or update your bid')
    expect(response.text).toContain('/assets/bidding.js')
  })
})
