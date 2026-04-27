const request = require('supertest')
const app = require('../../app')
const { combinedAuthHeader } = require('../helpers/http')
const { createApiClientWithToken, createAuthenticatedUser, createUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')
const { API_CLIENT_SCOPES } = require('../../utils/api-client-scopes')

let proxyServer
let internalApiBaseUrl
const originalInternalApiBaseUrl = process.env.INTERNAL_API_BASE_URL
const originalAlumniDirectoryApiToken = process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN

const seedAlumniDirectoryFixture = async () => {
  const alice = await createUser({
    email: 'directory.alice@eastminster.ac.uk',
    roleName: 'alumni',
    firstName: 'Alice',
    lastName: 'Ng'
  })

  const ben = await createUser({
    email: 'directory.ben@eastminster.ac.uk',
    roleName: 'alumni',
    firstName: 'Ben',
    lastName: 'Carter'
  })

  const cara = await createUser({
    email: 'directory.cara@eastminster.ac.uk',
    roleName: 'alumni',
    firstName: 'Cara',
    lastName: 'Jones'
  })

  await prisma.degree.createMany({
    data: [
      {
        user_id: alice.user_id,
        title: 'BSc Computer Science',
        university: 'University of Eastminster',
        degree_url: 'https://example.com/alice-degree',
        completion_date: new Date('2023-07-01')
      },
      {
        user_id: ben.user_id,
        title: 'BSc Computer Science',
        university: 'University of Eastminster',
        degree_url: 'https://example.com/ben-degree',
        completion_date: new Date('2021-07-01')
      },
      {
        user_id: cara.user_id,
        title: 'Business Management',
        university: 'University of Eastminster',
        degree_url: 'https://example.com/cara-degree',
        completion_date: new Date('2022-07-01')
      }
    ]
  })

  await prisma.employment.createMany({
    data: [
      {
        user_id: alice.user_id,
        job_title: 'Analyst',
        company: 'Old Finance Co',
        industry_sector: 'Finance',
        start_date: new Date('2022-01-01'),
        end_date: new Date('2023-06-30')
      },
      {
        user_id: alice.user_id,
        job_title: 'Software Engineer',
        company: 'Northwind Labs',
        industry_sector: 'Technology',
        start_date: new Date('2024-01-01'),
        end_date: null
      },
      {
        user_id: ben.user_id,
        job_title: 'Operations Analyst',
        company: 'Ledger Group',
        industry_sector: 'Finance',
        start_date: new Date('2023-02-01'),
        end_date: null
      },
      {
        user_id: cara.user_id,
        job_title: 'Consultant',
        company: 'People Advisory',
        industry_sector: 'Consulting',
        start_date: new Date('2023-03-01'),
        end_date: null
      }
    ]
  })
}

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

  if (originalAlumniDirectoryApiToken === undefined) {
    delete process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN
    return
  }

  process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN = originalAlumniDirectoryApiToken
})

afterAll(async () => {
  if (originalInternalApiBaseUrl === undefined) {
    delete process.env.INTERNAL_API_BASE_URL
  } else {
    process.env.INTERNAL_API_BASE_URL = originalInternalApiBaseUrl
  }

  if (originalAlumniDirectoryApiToken === undefined) {
    delete process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN
  } else {
    process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN = originalAlumniDirectoryApiToken
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

describe('alumni directory web routes', () => {
  it('redirects unauthenticated users away from the directory page', async () => {
    const response = await request(app).get('/dashboard/alumni-directory')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })

  it('renders the directory page for an authenticated user', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'directory.page.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await request(app)
      .get('/dashboard/alumni-directory')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(200)
    expect(response.text).toContain('Alumni By Programme')
    expect(response.text).toContain('/dashboard/alumni-directory/data')
  })
})

describe('GET /api/v1/analytics/alumni-directory', () => {
  it('requires both session authentication and a bearer token', async () => {
    const response = await request(app).get('/api/v1/analytics/alumni-directory')

    expect(response.status).toBe(401)
  })

  it('returns 403 when the bearer token lacks the alumni directory scope', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'directory.forbidden.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const admin = await createAuthenticatedUser({
      email: 'directory.forbidden.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Dashboard Scope Only Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ]
    })

    const response = await request(app)
      .get('/api/v1/analytics/alumni-directory')
      .set(combinedAuthHeader(viewer.token, plainToken))

    expect(response.status).toBe(403)
  })

  it('returns filtered alumni and uses latest employment sector matching', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'directory.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const admin = await createAuthenticatedUser({
      email: 'directory.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Directory Analytics Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_ALUMNI_DIRECTORY_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_ALUMNI_DIRECTORY_READ]
    })

    await seedAlumniDirectoryFixture()

    const response = await request(app)
      .get('/api/v1/analytics/alumni-directory')
      .query({
        programme: 'BSc Computer Science',
        graduationFrom: '2023-01-01',
        graduationTo: '2023-12-31',
        industrySector: 'Technology'
      })
      .set(combinedAuthHeader(viewer.token, plainToken))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.totalCount).toBe(1)
    expect(response.body.data.alumni[0].name).toBe('Alice Ng')
    expect(response.body.data.alumni[0].latestEmployment.industrySector).toBe('Technology')
  })

  it('does not match older employment sectors when the latest sector differs', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'directory.latest.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const admin = await createAuthenticatedUser({
      email: 'directory.latest.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Directory Latest Employment Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_ALUMNI_DIRECTORY_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_ALUMNI_DIRECTORY_READ]
    })

    await seedAlumniDirectoryFixture()

    const response = await request(app)
      .get('/api/v1/analytics/alumni-directory')
      .query({
        programme: 'BSc Computer Science',
        industrySector: 'Finance'
      })
      .set(combinedAuthHeader(viewer.token, plainToken))

    expect(response.status).toBe(200)
    expect(response.body.data.totalCount).toBe(1)
    expect(response.body.data.alumni[0].name).toBe('Ben Carter')
  })
})

describe('GET /dashboard/alumni-directory/data', () => {
  it('proxies alumni directory results for authenticated users', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'directory.proxy.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const admin = await createAuthenticatedUser({
      email: 'directory.proxy.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { plainToken } = await createApiClientWithToken({
      clientName: 'Directory Proxy Client',
      createdByUserId: admin.user.user_id,
      allowedScopes: [API_CLIENT_SCOPES.ANALYTICS_ALUMNI_DIRECTORY_READ],
      scopes: [API_CLIENT_SCOPES.ANALYTICS_ALUMNI_DIRECTORY_READ]
    })

    process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN = plainToken
    await seedAlumniDirectoryFixture()

    const response = await request(app)
      .get('/dashboard/alumni-directory/data')
      .query({
        programme: 'Business Management',
        industrySector: 'Consulting'
      })
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.totalCount).toBe(1)
    expect(response.body.data.alumni[0].name).toBe('Cara Jones')
  })

  it('returns 503 when the alumni directory proxy token is not configured', async () => {
    const viewer = await createAuthenticatedUser({
      email: 'directory.missing-token.viewer@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    delete process.env.ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN

    const response = await request(app)
      .get('/dashboard/alumni-directory/data')
      .set('Cookie', [`access_token=${encodeURIComponent(viewer.token)}`])

    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ANALYTICS_PROXY_MISCONFIGURED')
    expect(response.body.message).toBe('Alumni directory is unavailable right now.')
  })
})
