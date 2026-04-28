const request = require('supertest')

let mockIsViewAuthenticated = false
let mockIsJwtAuthenticated = false

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

jest.mock('../../../api/middleware/auth.middleware', () => ({
  authenticateJwt: (req, res, next) => {
    if (!mockIsJwtAuthenticated) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      })
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

const originalDirectoryToken = process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN

beforeEach(() => {
  mockIsViewAuthenticated = false
  mockIsJwtAuthenticated = false
  process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN = 'test-directory-token'
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
  delete global.fetch
})

afterAll(() => {
  if (originalDirectoryToken === undefined) {
    delete process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN
    return
  }

  process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN = originalDirectoryToken
})

describe('alumni directory web routes', () => {
  it('redirects unauthenticated users away from the directory page', async () => {
    const response = await request(app).get('/dashboard/alumni-directory')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })

  it('renders the directory page for an authenticated user', async () => {
    mockIsViewAuthenticated = true

    const response = await request(app).get('/dashboard/alumni-directory')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni By Programme')
    expect(response.text).toContain('/dashboard/alumni-directory/data')
  })
})

describe('GET /dashboard/alumni-directory/data', () => {
  it('requires a valid session', async () => {
    const response = await request(app).get('/dashboard/alumni-directory/data')

    expect(response.status).toBe(401)
  })

  it('returns proxied directory data for authenticated users', async () => {
    mockIsJwtAuthenticated = true

    global.fetch.mockResolvedValue({
      status: 200,
      headers: {
        get: () => 'application/json; charset=utf-8'
      },
      text: async () => JSON.stringify({
        success: true,
        data: {
          totalCount: 1,
          alumni: [
            { name: 'Alice Ng' }
          ]
        }
      })
    })

    const response = await request(app)
      .get('/dashboard/alumni-directory/data')
      .query({ programme: 'BSc Computer Science' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.totalCount).toBe(1)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 503 when directory proxy token is not configured', async () => {
    mockIsJwtAuthenticated = true
    delete process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN

    const response = await request(app).get('/dashboard/alumni-directory/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_MISCONFIGURED')
  })

  it('returns 503 when upstream auth fails', async () => {
    mockIsJwtAuthenticated = true

    global.fetch.mockResolvedValue({
      status: 401,
      headers: {
        get: () => 'application/json; charset=utf-8'
      },
      text: async () => JSON.stringify({ success: false })
    })

    const response = await request(app).get('/dashboard/alumni-directory/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_AUTH_FAILED')
  })
})
