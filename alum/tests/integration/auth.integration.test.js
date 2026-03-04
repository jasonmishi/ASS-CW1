const { api, authHeader } = require('../helpers/http')
const { createAuthenticatedUser, createUser } = require('../helpers/factories')
const { prisma } = require('../helpers/test-db')
const { hashToken } = require('../../utils/security')

describe('POST /api/v1/auth/users', () => {
  it('returns 400 for non-university email', async () => {
    const requestBody = {
      email: 'jane@gmail.com',
      password: 'Strong!Pass1',
      confirmPassword: 'Strong!Pass1',
      firstName: 'Jane',
      lastName: 'Doe'
    }

    const response = await api()
      .post('/api/v1/auth/users')
      .send(requestBody)

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)

    const user = await prisma.user.findUnique({ where: { email: requestBody.email } })
    expect(user).toBeNull()
  })

  it('returns 409 for duplicate email', async () => {
    await createUser({ email: 'jane@eastminster.ac.uk' })

    const requestBody = {
      email: 'jane@eastminster.ac.uk',
      password: 'Strong!Pass1',
      confirmPassword: 'Strong!Pass1',
      firstName: 'Jane',
      lastName: 'Doe'
    }

    const response = await api()
      .post('/api/v1/auth/users')
      .send(requestBody)

    expect(response.status).toBe(409)

    const users = await prisma.user.findMany({ where: { email: requestBody.email } })
    expect(users).toHaveLength(1)
  })

  it('returns 201 and creates user + verification token', async () => {
    const requestBody = {
      email: 'new.alumni@eastminster.ac.uk',
      password: 'Strong!Pass1',
      confirmPassword: 'Strong!Pass1',
      firstName: 'New',
      lastName: 'Alumni'
    }

    const response = await api()
      .post('/api/v1/auth/users')
      .send(requestBody)

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data).not.toHaveProperty('verificationToken')

    const user = await prisma.user.findUnique({
      where: { email: requestBody.email },
      include: { role: true }
    })
    expect(user).toBeTruthy()
    expect(user.role.name).toBe('alumni')

    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: { user_id: user.user_id, used_at: null }
    })
    expect(tokenRecord).toBeTruthy()
  })

  it('returns 201 when lastName is omitted', async () => {
    const requestBody = {
      email: 'no.lastname@eastminster.ac.uk',
      password: 'Strong!Pass1',
      confirmPassword: 'Strong!Pass1',
      firstName: 'NoLastName'
    }

    const response = await api()
      .post('/api/v1/auth/users')
      .send(requestBody)

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)

    const user = await prisma.user.findUnique({
      where: { email: requestBody.email }
    })
    expect(user).toBeTruthy()
    expect(user.last_name).toBe('')
  })
})

describe('GET /api/v1/auth/verify-email/:token', () => {
  it('returns 200 and verifies email with valid token', async () => {
    const user = await createUser({
      email: 'verify.me@eastminster.ac.uk',
      password: 'Strong!Pass1',
      verified: false
    })

    const plainToken = 'plain-verify-token'
    const tokenHash = hashToken(plainToken)

    await prisma.emailVerificationToken.create({
      data: {
        user_id: user.user_id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + (30 * 60 * 1000))
      }
    })

    const response = await api()
      .get(`/api/v1/auth/verify-email/${plainToken}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    const updatedUser = await prisma.user.findUnique({ where: { email: user.email } })
    expect(updatedUser.email_verified_at).toBeTruthy()
  })
})

describe('POST /api/v1/auth/verify-email', () => {
  it('returns 201 and issues a new verification token when email exists', async () => {
    const user = await createUser({
      email: 'resend.verify@eastminster.ac.uk',
      password: 'Strong!Pass1',
      verified: false
    })

    const response = await api()
      .post('/api/v1/auth/verify-email')
      .send({ email: user.email })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)

    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: { user_id: user.user_id, used_at: null }
    })
    expect(tokenRecord).toBeTruthy()
  })
})

describe('POST /api/v1/auth/sessions', () => {
  it('returns 401 when user email is not verified', async () => {
    await createUser({
      email: 'pending@eastminster.ac.uk',
      password: 'Strong!Pass1',
      verified: false
    })

    const requestBody = {
      email: 'pending@eastminster.ac.uk',
      password: 'Strong!Pass1'
    }

    const response = await api()
      .post('/api/v1/auth/sessions')
      .send(requestBody)

    expect(response.status).toBe(401)
    expect(response.body.message).toMatch(/Email not verified/)

    const sessions = await prisma.authSession.findMany()
    expect(sessions).toHaveLength(0)
  })

  it('returns 201 and creates auth session for verified user', async () => {
    await createUser({
      email: 'verified@eastminster.ac.uk',
      password: 'Strong!Pass1',
      verified: true
    })

    const requestBody = {
      email: 'verified@eastminster.ac.uk',
      password: 'Strong!Pass1'
    }

    const response = await api()
      .post('/api/v1/auth/sessions')
      .send(requestBody)

    expect(response.status).toBe(201)
    expect(response.body.data).toHaveProperty('token')

    const session = await prisma.authSession.findFirst({ where: { revoked_at: null } })
    expect(session).toBeTruthy()
  })
})

describe('DELETE /api/v1/auth/sessions', () => {
  it('returns 204 and revokes active session', async () => {
    await createUser({
      email: 'logout@eastminster.ac.uk',
      password: 'Strong!Pass1',
      verified: true
    })

    const loginRequestBody = {
      email: 'logout@eastminster.ac.uk',
      password: 'Strong!Pass1'
    }

    const loginResponse = await api()
      .post('/api/v1/auth/sessions')
      .send(loginRequestBody)

    const token = loginResponse.body.data.token

    const requestBody = {}

    const response = await api()
      .delete('/api/v1/auth/sessions')
      .set(authHeader(token))
      .send(requestBody)

    expect(response.status).toBe(204)

    const tokenHash = hashToken(token)
    const session = await prisma.authSession.findFirst({ where: { token_hash: tokenHash } })
    expect(session.revoked_at).toBeTruthy()
  })
})

describe('PATCH /api/v1/auth/password-resets', () => {
  it('returns 400 for invalid reset token', async () => {
    const requestBody = {
      token: 'not-a-real-token',
      newPassword: 'N3w!StrongPass1',
      confirmNewPassword: 'N3w!StrongPass1'
    }

    const response = await api()
      .patch('/api/v1/auth/password-resets')
      .send(requestBody)

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('returns 200 and marks token as used for valid reset token', async () => {
    const user = await createUser({
      email: 'reset@eastminster.ac.uk',
      password: 'Strong!Pass1',
      verified: true
    })

    const plainToken = 'plain-reset-token'
    const tokenHash = hashToken(plainToken)

    const resetToken = await prisma.passwordResetToken.create({
      data: {
        user_id: user.user_id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + (30 * 60 * 1000))
      }
    })

    const requestBody = {
      token: plainToken,
      newPassword: 'N3w!StrongPass1',
      confirmNewPassword: 'N3w!StrongPass1'
    }

    const response = await api()
      .patch('/api/v1/auth/password-resets')
      .send(requestBody)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    const updatedResetRecord = await prisma.passwordResetToken.findUnique({
      where: { reset_id: resetToken.reset_id }
    })
    expect(updatedResetRecord.used_at).toBeTruthy()
  })
})

describe('GET /api/v1/auth/sessions/summary', () => {
  it('returns 401 without authentication token', async () => {
    const response = await api()
      .get('/api/v1/auth/sessions/summary')

    expect(response.status).toBe(401)
  })

  it('returns active sessions count and last login time for authenticated user', async () => {
    const { user, token } = await createAuthenticatedUser({
      email: 'summary@eastminster.ac.uk',
      password: 'Strong!Pass1'
    })

    await prisma.authSession.create({
      data: {
        user_id: user.user_id,
        token_hash: hashToken('expired-token'),
        issued_at: new Date(Date.now() - (2 * 60 * 60 * 1000)),
        expired_at: new Date(Date.now() - (60 * 60 * 1000))
      }
    })

    const response = await api()
      .get('/api/v1/auth/sessions/summary')
      .set(authHeader(token))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.activeSessionsCount).toBe(1)
    expect(response.body.data.lastLoginAt).toBeTruthy()
  })
})
