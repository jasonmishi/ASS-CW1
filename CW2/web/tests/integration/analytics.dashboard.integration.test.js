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

const originalDashboardToken = process.env.ANALYTICS_DASHBOARD_API_TOKEN
const dashboardPayload = {
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
}

beforeEach(() => {
  mockIsViewAuthenticated = false
  mockIsApiAuthenticated = false
  process.env.ANALYTICS_DASHBOARD_API_TOKEN = 'test-dashboard-token'
  global.fetch = jest.fn()
  global.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: () => 'application/json; charset=utf-8'
    },
    json: async () => ({
      success: true,
      data: dashboardPayload
    }),
    text: async () => JSON.stringify({
      success: true,
      data: dashboardPayload
    })
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
    mockIsApiAuthenticated = true

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 503 when dashboard proxy token is not configured', async () => {
    mockIsApiAuthenticated = true
    delete process.env.ANALYTICS_DASHBOARD_API_TOKEN

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_MISCONFIGURED')
  })

  it('returns 503 when upstream auth fails', async () => {
    mockIsApiAuthenticated = true

    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      headers: {
        get: () => 'application/json; charset=utf-8'
      },
      json: async () => ({ success: false }),
      text: async () => JSON.stringify({ success: false })
    })

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_AUTH_FAILED')
  })

  it('returns 502 when upstream is unreachable', async () => {
    mockIsApiAuthenticated = true
    global.fetch.mockRejectedValue(new Error('ECONNREFUSED'))

    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(502)
    expect(response.body.code).toBe('ANALYTICS_PROXY_UNREACHABLE')
  })
})
