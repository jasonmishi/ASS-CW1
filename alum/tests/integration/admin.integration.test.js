const { api, authHeader } = require('../helpers/http')
const { createAuthenticatedUser, createUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')

describe('GET /api/v1/admin/users', () => {
  it('returns 403 for non-admin caller', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'list.nonadmin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(token))

    expect(response.status).toBe(403)
  })

  it('returns 200 with current users for admin', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'list.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    await createUser({
      email: 'listed.user@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'developer'
    })

    const response = await api()
      .get('/api/v1/admin/users')
      .set(authHeader(token))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.some((user) => user.email === 'listed.user@eastminster.ac.uk')).toBe(true)
  })
})

describe('POST /api/v1/admin/users', () => {
  it('returns 403 for non-admin caller', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'nonadmin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await api()
      .post('/api/v1/admin/users')
      .set(authHeader(token))
      .send({
        email: 'new.dev@eastminster.ac.uk',
        password: 'Strong!Pass1',
        firstName: 'New',
        lastName: 'Developer',
        role: 'Developer'
      })

    expect(response.status).toBe(403)
  })

  it('returns 201 and creates privileged user for admin', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'admin.creator@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const response = await api()
      .post('/api/v1/admin/users')
      .set(authHeader(token))
      .send({
        email: 'new.sponsor@eastminster.ac.uk',
        password: 'Strong!Pass1',
        firstName: 'New',
        lastName: 'Sponsor',
        role: 'Sponsor'
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.role).toBe('Sponsor')

    const created = await prisma.user.findUnique({
      where: { email: 'new.sponsor@eastminster.ac.uk' },
      include: { role: true }
    })
    expect(created).toBeTruthy()
    expect(created.role.name).toBe('sponsor')
  })

  it('returns 201 when lastName is omitted', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'admin.creator.optional@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const response = await api()
      .post('/api/v1/admin/users')
      .set(authHeader(token))
      .send({
        email: 'new.dev.optional@eastminster.ac.uk',
        password: 'Strong!Pass1',
        firstName: 'Optional',
        role: 'Developer'
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)

    const created = await prisma.user.findUnique({
      where: { email: 'new.dev.optional@eastminster.ac.uk' }
    })
    expect(created).toBeTruthy()
    expect(created.last_name).toBe('')
  })
})

describe('PUT /api/v1/admin/users/:userId/role', () => {
  it('returns 200 and updates user role', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'admin.promoter@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const user = await createUser({
      email: 'promote.me@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const response = await api()
      .put(`/api/v1/admin/users/${user.user_id}/role`)
      .set(authHeader(token))
      .send({
        role: 'Developer'
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    const updated = await prisma.user.findUnique({
      where: { user_id: user.user_id },
      include: { role: true }
    })
    expect(updated.role.name).toBe('developer')
  })

  it('returns 404 for unknown user', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'admin.notfound@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const response = await api()
      .put('/api/v1/admin/users/not-a-real-user/role')
      .set(authHeader(token))
      .send({
        role: 'Developer'
      })

    expect(response.status).toBe(404)
  })

  it('returns 400 when trying to demote the last admin', async () => {
    const onlyAdmin = await createUser({
      email: 'only.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    const { token } = await createAuthenticatedUser({
      email: 'second.admin@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'admin'
    })

    await prisma.user.delete({
      where: { user_id: onlyAdmin.user_id }
    })

    const remainingAdmin = await prisma.user.findUnique({
      where: { email: 'second.admin@eastminster.ac.uk' }
    })

    const response = await api()
      .put(`/api/v1/admin/users/${remainingAdmin.user_id}/role`)
      .set(authHeader(token))
      .send({
        role: 'Alumni'
      })

    expect(response.status).toBe(400)
    expect(response.body.message).toMatch(/last remaining Admin/i)
  })
})
