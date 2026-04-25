const request = require('supertest')
const app = require('../../app')
const { authHeader } = require('../helpers/http')
const { createAuthenticatedUser, createUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')

describe('analytics dashboard web routes', () => {
  it('renders the login page', async () => {
    const response = await request(app).get('/login')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Sign in to the analytics dashboard')
  })

  it('redirects unauthenticated users away from the dashboard page', async () => {
    const response = await request(app).get('/dashboard/alumni-analytics')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('/login')
  })
})

describe('GET /api/v1/analytics/alumni-dashboard', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/analytics/alumni-dashboard')

    expect(response.status).toBe(401)
  })

  it('returns chart-ready alumni analytics data for authenticated users', async () => {
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

    const response = await request(app)
      .get('/api/v1/analytics/alumni-dashboard')
      .set(authHeader(viewer.token))

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
    expect(response.text).toContain('/api/v1/analytics/alumni-dashboard')
  })
})
