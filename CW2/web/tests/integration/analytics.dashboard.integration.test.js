const request = require('supertest')

let mockIsViewAuthenticated = false
let mockIsJwtAuthenticated = false
const mockGetAlumniDashboardAnalytics = jest.fn()

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

jest.mock('../../../api/models/analytics.model', () => ({
  getAlumniDashboardAnalytics: (...args) => mockGetAlumniDashboardAnalytics(...args),
  getAlumniDirectoryAnalytics: jest.fn()
}))

const app = require('../../app')

const originalDashboardToken = process.env.ANALYTICS_DASHBOARD_API_TOKEN

beforeEach(() => {
  mockIsViewAuthenticated = false
  mockIsJwtAuthenticated = false
  process.env.ANALYTICS_DASHBOARD_API_TOKEN = 'test-dashboard-token'
  global.fetch = jest.fn()
  mockGetAlumniDashboardAnalytics.mockResolvedValue({
    appliedFilters: {
      from: '',
      to: '',
      degreeTitle: '',
      credentialDomain: '',
      careerCategory: '',
      search: ''
    },
    filterOptions: {
      degreeTitles: ['BSc Computer Science'],
      credentialDomains: [{ key: 'cloud', label: 'Cloud' }],
      careerCategories: [{ key: 'software-engineering', label: 'Software Engineering' }],
      dateBounds: { min: '2020-01-01', max: '2024-12-31' }
    },
    summary: [{ label: 'Filtered alumni', value: 3, tone: 'neutral' }],
    insights: [],
    charts: {
      degreeTitles: {
        id: 'degreeTitles',
        type: 'bar',
        title: 'Top Degree Titles',
        subtitle: 'Most common academic backgrounds.',
        labels: ['BSc Computer Science'],
        items: [{ label: 'BSc Computer Science', value: 3 }],
        datasets: [{ label: 'Degree count', data: [3] }],
        axisLabels: { x: 'Degree title', y: 'Count' }
      }
    }
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  delete global.fetch
})

afterAll(() => {
  if (originalDashboardToken === undefined) {
    delete process.env.ANALYTICS_DASHBOARD_API_TOKEN
    return
  }

  process.env.ANALYTICS_DASHBOARD_API_TOKEN = originalDashboardToken
})

describe('analytics dashboard web routes', () => {
  it('renders the login page', async () => {
    const response = await request(app).get('/login')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Sign in to the analytics dashboard')
  })

  it('renders the register page', async () => {
    const response = await request(app).get('/register')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Create your Eastminster alumni account')
  })

  it('redirects unauthenticated users away from the dashboard page', async () => {
    const response = await request(app).get('/dashboard/alumni-analytics')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })

  it('renders the dashboard page for an authenticated user', async () => {
    mockIsViewAuthenticated = true

    const response = await request(app).get('/dashboard/alumni-analytics')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni Analytics')
    expect(response.text).toContain('Apply filters')
    expect(response.text).toContain('Top Degree Titles')
  })

  it('accepts blank query params from the filter form', async () => {
    mockIsViewAuthenticated = true

    const response = await request(app)
      .get('/dashboard/alumni-analytics')
      .query({
        from: '',
        to: '',
        degreeTitle: '',
        credentialDomain: '',
        careerCategory: '',
        search: ''
      })

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni Analytics')
  })
})

describe('GET /dashboard/alumni-analytics/data', () => {
  it('requires a valid session', async () => {
    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(401)
  })

  it('returns proxied dashboard data for authenticated users', async () => {
    mockIsJwtAuthenticated = true

    global.fetch.mockResolvedValue({
      status: 200,
      headers: {
        get: () => 'application/json; charset=utf-8'
      },
      text: async () => JSON.stringify({
        success: true,
        data: {
          summary: []
        }
      })
    })

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 503 when dashboard proxy token is not configured', async () => {
    mockIsJwtAuthenticated = true
    delete process.env.ANALYTICS_DASHBOARD_API_TOKEN

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_MISCONFIGURED')
  })

  it('returns 503 when upstream auth fails', async () => {
    mockIsJwtAuthenticated = true

    global.fetch.mockResolvedValue({
      status: 403,
      headers: {
        get: () => 'application/json; charset=utf-8'
      },
      text: async () => JSON.stringify({ success: false })
    })

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_AUTH_FAILED')
  })

  it('returns 502 when upstream is unreachable', async () => {
    mockIsJwtAuthenticated = true
    global.fetch.mockRejectedValue(new Error('ECONNREFUSED'))

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(502)
    expect(response.body.code).toBe('ANALYTICS_PROXY_UNREACHABLE')
  })
})
