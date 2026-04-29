const request = require('supertest')

let mockIsViewAuthenticated = false
let mockIsApiAuthenticated = false

jest.mock('../../middleware/session-auth.middleware', () => ({
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
  },
  authenticateSessionApi: (req, res, next) => {
    if (!mockIsApiAuthenticated) {
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
const directoryPayload = {
  filterOptions: {
    programmes: ['BSc Computer Science'],
    industrySectors: ['Technology']
  },
  totalCount: 1,
  alumni: [
    {
      userId: 'alumni-1',
      name: 'Alice Ng',
      email: 'alice.ng@eastminster.ac.uk',
      programme: 'BSc Computer Science',
      graduationDate: '2024-07-10',
      latestEmployment: {
        jobTitle: 'Software Engineer',
        company: 'Northwind Labs',
        industrySector: 'Technology'
      }
    }
  ]
}

beforeEach(() => {
  mockIsViewAuthenticated = false
  mockIsApiAuthenticated = false
  process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN = 'test-directory-token'
  global.fetch = jest.fn()
  global.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: () => 'application/json; charset=utf-8'
    },
    json: async () => ({
      success: true,
      data: directoryPayload
    }),
    text: async () => JSON.stringify({
      success: true,
      data: directoryPayload
    })
  })
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
    expect(response.text).toContain('Apply filters')
    expect(response.text).toContain('Alice Ng')
  })

  it('accepts blank query params from the filter form', async () => {
    mockIsViewAuthenticated = true

    const response = await request(app)
      .get('/dashboard/alumni-directory')
      .query({
        programme: '',
        graduationFrom: '',
        graduationTo: '',
        industrySector: ''
      })

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni By Programme')
  })
})

describe('GET /dashboard/alumni-directory/data', () => {
  it('requires a valid session', async () => {
    const response = await request(app).get('/dashboard/alumni-directory/data')

    expect(response.status).toBe(401)
  })

  it('returns proxied directory data for authenticated users', async () => {
    mockIsApiAuthenticated = true

    const response = await request(app)
      .get('/dashboard/alumni-directory/data')
      .query({ programme: 'BSc Computer Science' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.totalCount).toBe(1)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 503 when directory proxy token is not configured', async () => {
    mockIsApiAuthenticated = true
    delete process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN

    const response = await request(app).get('/dashboard/alumni-directory/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_MISCONFIGURED')
  })

  it('returns 503 when upstream auth fails', async () => {
    mockIsApiAuthenticated = true

    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: {
        get: () => 'application/json; charset=utf-8'
      },
      json: async () => ({ success: false }),
      text: async () => JSON.stringify({ success: false })
    })

    const response = await request(app).get('/dashboard/alumni-directory/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_AUTH_FAILED')
  })
})
