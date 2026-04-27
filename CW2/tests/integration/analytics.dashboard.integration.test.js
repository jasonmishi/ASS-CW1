const request = require('supertest')
const app = require('../../app')
const { combinedAuthHeader } = require('../helpers/http')
const { createApiClientWithToken, createAuthenticatedUser, createUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')
const { API_CLIENT_SCOPES } = require('../../utils/api-client-scopes')

let proxyServer
let internalApiBaseUrl
const originalInternalApiBaseUrl = process.env.INTERNAL_API_BASE_URL
const originalAnalyticsDashboardApiToken = process.env.ANALYTICS_DASHBOARD_API_TOKEN

beforeAll(async () => {
  proxyServer = await new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server))
  })

  const address = proxyServer.address()
  internalApiBaseUrl = `http://127.0.0.1:${address.port}`
  process.env.INTERNAL_API_BASE_URL = internalApiBaseUrl
})

afterEach(() => {
  process.env.INTERNAL_API_BASE_URL = internalApiBaseUrl

  if (originalAnalyticsDashboardApiToken === undefined) {
    delete process.env.ANALYTICS_DASHBOARD_API_TOKEN
    return
  }

  process.env.ANALYTICS_DASHBOARD_API_TOKEN = originalAnalyticsDashboardApiToken
})

afterAll(async () => {
  if (originalInternalApiBaseUrl === undefined) {
    delete process.env.INTERNAL_API_BASE_URL
  } else {
    process.env.INTERNAL_API_BASE_URL = originalInternalApiBaseUrl
  }

  if (originalAnalyticsDashboardApiToken === undefined) {
    delete process.env.ANALYTICS_DASHBOARD_API_TOKEN
  } else {
    process.env.ANALYTICS_DASHBOARD_API_TOKEN = originalAnalyticsDashboardApiToken
  }

  await new Promise((resolve, reject) => {
    proxyServer.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
})

describe('analytics dashboard web routes', () => {
  it('renders the login page', async () => {
    const response = await request(app).get('/login')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Sign in to the analytics dashboard')
    expect(response.text).toContain('href="/register"')
  })

  it('renders the register page', async () => {
    const response = await request(app).get('/register')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Create your Eastminster alumni account')
    expect(response.text).toContain('form id="register-form"')
  })

  it('redirects unauthenticated users away from the dashboard page', async () => {
    const response = await request(app).get('/dashboard/alumni-analytics')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })
})

describe('GET /api/v1/analytics/alumni-dashboard', () => {
  it('requires both session authentication and a bearer token', async () => {
    const response = await request(app).get('/api/v1/analytics/alumni-dashboard')

    expect(response.status).toBe(401)
  })

  it('returns 401 when the session is present but the bearer token is missing', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'viewer.no-bearer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await request(app)
      .get('/api/v1/analytics/alumni-dashboard')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(401)
  })

  it('returns 401 when the bearer token is present but the session is missing', async () => {
    const admin = await createAuthenticatedUser({
      email: 'analytics.sessionless.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Sessionless Analytics Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ]
    })

    const response = await request(app)
      .get('/api/v1/analytics/alumni-dashboard')
      .set('Authorization', `Bearer ${plainToken}`)

    expect(response.status).toBe(401)
  })

  it('returns 403 when the bearer token lacks analytics scope', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'viewer.forbidden-bearer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const admin = await createAuthenticatedUser({
      email: 'analytics.forbidden.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Featured Only Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.PUBLIC_FEATURED_READ],
      scopes: [API_CLIENT_SCOPES.PUBLIC_FEATURED_READ]
    })

    const response = await request(app)
      .get('/api/v1/analytics/alumni-dashboard')
      .set(combinedAuthHeader(viewer.token, plainToken))

    expect(response.status).toBe(403)
  })

  it('returns chart-ready alumni analytics data when both auth layers are valid', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const csAlumni = await createUser({
      email: 'cs.analytics@eastminster.ac.uk',
      roleName: 'alumni',
      firstName: 'Casey',
      lastName: 'Stone'
    })

    const businessAlumni = await createUser({
      email: 'business.analytics@eastminster.ac.uk',
      roleName: 'alumni',
      firstName: 'Bree',
      lastName: 'Howard'
    })

    await prisma.degree.createMany({
      data: [
        {
          user_id: csAlumni.user_id,
          title: 'BSc Computer Science',
          university: 'University of Eastminster',
          degree_url: 'https://example.com/cs',
          completion_date: new Date('2021-07-10')
        },
        {
          user_id: businessAlumni.user_id,
          title: 'Business Management',
          university: 'University of Eastminster',
          degree_url: 'https://example.com/business',
          completion_date: new Date('2020-07-10')
        }
      ]
    })

    await prisma.credential.createMany({
      data: [
        {
          user_id: csAlumni.user_id,
          credential_type: 'certification',
          title: 'AWS Solutions Architect Associate',
          provider_name: 'Amazon Web Services',
          credential_url: 'https://example.com/aws',
          completion_date: new Date('2024-02-01')
        },
        {
          user_id: csAlumni.user_id,
          credential_type: 'course',
          title: 'Professional Scrum Master',
          provider_name: 'Scrum.org',
          credential_url: 'https://example.com/scrum',
          completion_date: new Date('2024-03-01')
        },
        {
          user_id: businessAlumni.user_id,
          credential_type: 'course',
          title: 'Data Analytics Essentials',
          provider_name: 'Coursera',
          credential_url: 'https://example.com/data',
          completion_date: new Date('2024-04-01')
        }
      ]
    })

    await prisma.employment.createMany({
      data: [
        {
          user_id: csAlumni.user_id,
          job_title: 'Senior Software Engineer',
          company: 'Northwind Labs',
          start_date: new Date('2023-01-01'),
          end_date: null
        },
        {
          user_id: businessAlumni.user_id,
          job_title: 'Data Analyst',
          company: 'Aperture Insights',
          start_date: new Date('2022-06-01'),
          end_date: null
        }
      ]
    })

    const admin = await createAuthenticatedUser({
      email: 'analytics.scope.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Analytics Dashboard Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ]
    })

    const response = await request(app)
      .get('/api/v1/analytics/alumni-dashboard')
      .set(combinedAuthHeader(viewer.token, plainToken))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.summary).toEqual(expect.any(Array))
    expect(response.body.data.charts.degreeTitles.labels).toContain('BSc Computer Science')
    expect(response.body.data.charts.topCertifications.labels).toContain('AWS Solutions Architect Associate')
    expect(response.body.data.charts.careerPathways.labels).toContain('Software Engineering')
    expect(response.body.data.filterOptions.careerCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'data-analytics' })
    ]))
  })

  it('renders the dashboard page for an authenticated user', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'render.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await request(app)
      .get('/dashboard/alumni-analytics')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni Analytics')
    expect(response.text).toContain('/dashboard/alumni-analytics/data')
    expect(response.text).toContain('retry-dashboard-load')
  })

  it('returns analytics data from the session-protected dashboard data route', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'dashboard.data.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const alumni = await createUser({
      email: 'dashboard.data.alumni@eastminster.ac.uk',
      roleName: 'alumni',
      firstName: 'Alex',
      lastName: 'Proxy'
    })

    await prisma.degree.create({
      data: {
        user_id: alumni.user_id,
        title: 'BSc Computer Science',
        university: 'University of Eastminster',
        degree_url: 'https://example.com/proxy-degree',
        completion_date: new Date('2022-07-10')
      }
    })

    const admin = await createAuthenticatedUser({
      email: 'dashboard.proxy.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Dashboard Proxy Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ]
    })

    process.env.ANALYTICS_DASHBOARD_API_TOKEN = plainToken

    const response = await request(app)
      .get('/dashboard/alumni-analytics/data')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.charts.degreeTitles.labels).toContain('BSc Computer Science')
  })

  it('requires a valid session for the dashboard data route', async () => {
    const response = await request(app).get('/dashboard/alumni-analytics/data')

    expect(response.status).toBe(401)
  })

  it('returns 500 when the dashboard proxy token is not configured', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'dashboard.missing-token.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    delete process.env.ANALYTICS_DASHBOARD_API_TOKEN

    const response = await request(app)
      .get('/dashboard/alumni-analytics/data')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_MISCONFIGURED')
    expect(response.body.message).toBe('Analytics dashboard is unavailable right now.')
  })

  it('returns 503 when the configured dashboard proxy token is invalid', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'dashboard.invalid-token.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    process.env.ANALYTICS_DASHBOARD_API_TOKEN = 'invalid-dashboard-proxy-token'

    const response = await request(app)
      .get('/dashboard/alumni-analytics/data')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_AUTH_FAILED')
    expect(response.body.message).toBe('Analytics dashboard is unavailable right now.')
  })

  it('returns 502 when the analytics upstream is unreachable', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'dashboard.unreachable.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    process.env.ANALYTICS_DASHBOARD_API_TOKEN = 'placeholder-token'
    process.env.INTERNAL_API_BASE_URL = 'http://127.0.0.1:9'

    const response = await request(app)
      .get('/dashboard/alumni-analytics/data')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(502)
    expect(response.body.code).toBe('ANALYTICS_PROXY_UNREACHABLE')
    expect(response.body.message).toBe('Analytics dashboard is unavailable right now.')
  })

  it('records analytics API usage against the bearer token', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'analytics.usage.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const admin = await createAuthenticatedUser({
      email: 'analytics.usage.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Analytics Usage Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ]
    })

    await request(app)
      .get('/api/v1/analytics/alumni-dashboard')
      .set(combinedAuthHeader(viewer.token, plainToken))
      .expect(200)

    const usageRows = await prisma.apiClientEndpointUsage.findMany({
      where: {
        endpoint: '/api/v1/analytics/alumni-dashboard'
      }
    })

    expect(usageRows).toHaveLength(1)
    expect(usageRows[0].http_method).toBe('GET')
  })
})
