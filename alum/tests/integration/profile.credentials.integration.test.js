const { api, authHeader } = require('../helpers/http')
const { createAuthenticatedUser } = require('../helpers/factories')

describe('Profile credentials endpoints', () => {
  it('supports certification CRUD', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'cred.cert@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const createResponse = await api()
      .post('/api/v1/profile/certifications')
      .set(authHeader(token))
      .send({
        title: 'AWS Solutions Architect',
        issuingOrganisation: 'Amazon',
        certificationUrl: 'https://aws.amazon.com/certification/',
        completionDate: '2026-03-01'
      })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body.data.title).toBe('AWS Solutions Architect')

    const listResponse = await api()
      .get('/api/v1/profile/certifications')
      .set(authHeader(token))

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data).toHaveLength(1)

    const certificationId = createResponse.body.data.id

    const updateResponse = await api()
      .put(`/api/v1/profile/certifications/${certificationId}`)
      .set(authHeader(token))
      .send({
        title: 'AWS SA Pro',
        issuingOrganisation: 'Amazon Web Services',
        certificationUrl: 'https://aws.amazon.com/certification/professional/',
        completionDate: '2026-03-02'
      })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data.title).toBe('AWS SA Pro')

    const deleteResponse = await api()
      .delete(`/api/v1/profile/certifications/${certificationId}`)
      .set(authHeader(token))

    expect(deleteResponse.status).toBe(204)
  })

  it('supports licence CRUD', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'cred.licence@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const createResponse = await api()
      .post('/api/v1/profile/licences')
      .set(authHeader(token))
      .send({
        title: 'Chartered Engineer',
        awardingBody: 'Engineering Council',
        licenceUrl: 'https://www.engc.org.uk/',
        completionDate: '2026-03-01'
      })

    expect(createResponse.status).toBe(201)

    const licenceId = createResponse.body.data.id

    const listResponse = await api()
      .get('/api/v1/profile/licences')
      .set(authHeader(token))

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data).toHaveLength(1)

    const updateResponse = await api()
      .put(`/api/v1/profile/licences/${licenceId}`)
      .set(authHeader(token))
      .send({
        title: 'Chartered Engineer (CEng)',
        awardingBody: 'Engineering Council UK',
        licenceUrl: 'https://www.engc.org.uk/professional-registration/',
        completionDate: '2026-03-03'
      })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data.title).toMatch(/CEng/)

    const deleteResponse = await api()
      .delete(`/api/v1/profile/licences/${licenceId}`)
      .set(authHeader(token))

    expect(deleteResponse.status).toBe(204)
  })

  it('supports course CRUD', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'cred.course@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const createResponse = await api()
      .post('/api/v1/profile/courses')
      .set(authHeader(token))
      .send({
        title: 'Machine Learning Specialization',
        provider: 'Coursera',
        courseUrl: 'https://www.coursera.org/specializations/machine-learning',
        completionDate: '2026-03-01'
      })

    expect(createResponse.status).toBe(201)

    const courseId = createResponse.body.data.id

    const listResponse = await api()
      .get('/api/v1/profile/courses')
      .set(authHeader(token))

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data).toHaveLength(1)

    const updateResponse = await api()
      .put(`/api/v1/profile/courses/${courseId}`)
      .set(authHeader(token))
      .send({
        title: 'ML Specialization',
        provider: 'Coursera / Stanford',
        courseUrl: 'https://www.coursera.org/specializations/ml',
        completionDate: '2026-03-04'
      })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data.title).toBe('ML Specialization')

    const deleteResponse = await api()
      .delete(`/api/v1/profile/courses/${courseId}`)
      .set(authHeader(token))

    expect(deleteResponse.status).toBe(204)
  })
})
