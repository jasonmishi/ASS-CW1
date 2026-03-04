const prisma = require('../lib/prisma')
const roleModel = require('./role.model')
const emailService = require('../services/email.service')
const { signUserToken } = require('../utils/jwt')
const {
  comparePassword,
  generateSecureToken,
  hashPassword,
  hashToken
} = require('../utils/security')

const createUser = async (data) => {
  return prisma.user.create({
    data,
    include: {
      role: true
    }
  })
}

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: true
    }
  })
}

const createEmailVerificationToken = async ({ user_id, token_hash, expires_at }) => {
  await prisma.emailVerificationToken.updateMany({
    where: {
      user_id,
      used_at: null
    },
    data: {
      used_at: new Date()
    }
  })

  return prisma.emailVerificationToken.create({
    data: {
      user_id,
      token_hash,
      expires_at
    }
  })
}

const consumeEmailVerificationToken = async (token_hash) => {
  const verification = await prisma.emailVerificationToken.findFirst({
    where: {
      token_hash,
      used_at: null,
      expires_at: {
        gt: new Date()
      }
    }
  })

  if (!verification) {
    return null
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: {
        token_id: verification.token_id
      },
      data: {
        used_at: now
      }
    }),
    prisma.user.update({
      where: {
        user_id: verification.user_id
      },
      data: {
        email_verified_at: now
      }
    })
  ])

  return verification
}

const createPasswordResetToken = async ({ user_id, token_hash, expires_at }) => {
  await prisma.passwordResetToken.updateMany({
    where: {
      user_id,
      used_at: null
    },
    data: {
      used_at: new Date()
    }
  })

  return prisma.passwordResetToken.create({
    data: {
      user_id,
      token_hash,
      expires_at
    }
  })
}

const findValidPasswordResetToken = async (token_hash) => {
  return prisma.passwordResetToken.findFirst({
    where: {
      token_hash,
      used_at: null,
      expires_at: {
        gt: new Date()
      }
    }
  })
}

const completePasswordReset = async ({ reset_id, user_id, password_hash }) => {
  const now = new Date()

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: {
        reset_id
      },
      data: {
        used_at: now
      }
    }),
    prisma.user.update({
      where: {
        user_id
      },
      data: {
        password_hash
      }
    }),
    prisma.authSession.updateMany({
      where: {
        user_id,
        revoked_at: null
      },
      data: {
        revoked_at: now
      }
    })
  ])
}

const createAuthSession = async ({ user_id, token_hash, expired_at }) => {
  return prisma.authSession.create({
    data: {
      user_id,
      token_hash,
      expired_at
    }
  })
}

const revokeAuthSession = async (token_hash) => {
  const result = await prisma.authSession.updateMany({
    where: {
      token_hash,
      revoked_at: null
    },
    data: {
      revoked_at: new Date()
    }
  })

  return result.count > 0
}

const isAuthSessionActive = async (token_hash) => {
  const session = await prisma.authSession.findFirst({
    where: {
      token_hash,
      revoked_at: null,
      expired_at: {
        gt: new Date()
      }
    }
  })

  return Boolean(session)
}

const getSessionSummaryByUserId = async (user_id) => {
  const now = new Date()

  const [activeSessionsCount, lastSession] = await Promise.all([
    prisma.authSession.count({
      where: {
        user_id,
        revoked_at: null,
        expired_at: {
          gt: now
        }
      }
    }),
    prisma.authSession.findFirst({
      where: {
        user_id
      },
      orderBy: {
        issued_at: 'desc'
      },
      select: {
        issued_at: true
      }
    })
  ])

  return {
    activeSessionsCount,
    lastLoginAt: lastSession ? lastSession.issued_at : null
  }
}

const registerUserWithVerification = async ({
  email,
  password,
  firstName,
  lastName,
  emailVerificationTtlHours
}) => {
  const normalizedEmail = email.toLowerCase()
  const existingUser = await findUserByEmail(normalizedEmail)

  if (existingUser) {
    return {
      ok: false,
      reason: 'duplicate'
    }
  }

  const alumniRole = await roleModel.findRoleByName('alumni')

  if (!alumniRole) {
    return {
      ok: false,
      reason: 'role_config'
    }
  }

  const password_hash = await hashPassword(password)

  const user = await createUser({
    email: normalizedEmail,
    password_hash,
    role_id: alumniRole.role_id,
    first_name: firstName,
    last_name: lastName || ''
  })

  const verificationToken = generateSecureToken()
  const verificationTokenHash = hashToken(verificationToken)
  const expiresAt = new Date(Date.now() + (emailVerificationTtlHours * 60 * 60 * 1000))

  await createEmailVerificationToken({
    user_id: user.user_id,
    token_hash: verificationTokenHash,
    expires_at: expiresAt
  })

  await emailService.sendVerificationEmail({
    to: user.email,
    token: verificationToken
  })

  return {
    ok: true,
    user
  }
}

const verifyEmailByToken = async (token) => {
  const tokenHash = hashToken(token)
  const consumed = await consumeEmailVerificationToken(tokenHash)
  return Boolean(consumed)
}

const issueEmailVerification = async ({ email, emailVerificationTtlHours }) => {
  const user = await findUserByEmail(email.toLowerCase())

  if (!user) {
    return
  }

  const verificationToken = generateSecureToken()
  const verificationTokenHash = hashToken(verificationToken)
  const expiresAt = new Date(Date.now() + (emailVerificationTtlHours * 60 * 60 * 1000))

  await createEmailVerificationToken({
    user_id: user.user_id,
    token_hash: verificationTokenHash,
    expires_at: expiresAt
  })

  await emailService.sendVerificationEmail({
    to: user.email,
    token: verificationToken
  })
}

const createSessionForCredentials = async ({ email, password }) => {
  const user = await findUserByEmail(email.toLowerCase())

  if (!user) {
    return {
      ok: false,
      reason: 'invalid_credentials'
    }
  }

  if (!user.email_verified_at) {
    return {
      ok: false,
      reason: 'email_not_verified'
    }
  }

  const isPasswordValid = await comparePassword(password, user.password_hash)

  if (!isPasswordValid) {
    return {
      ok: false,
      reason: 'invalid_credentials'
    }
  }

  const signedToken = signUserToken(user)
  const tokenHash = hashToken(signedToken.token)

  await createAuthSession({
    user_id: user.user_id,
    token_hash: tokenHash,
    expired_at: signedToken.expiresAt
  })

  return {
    ok: true,
    user,
    signedToken
  }
}

const createPasswordResetRequest = async ({ email, passwordResetTtlHours }) => {
  const user = await findUserByEmail(email.toLowerCase())

  if (!user) {
    return
  }

  const resetToken = generateSecureToken()
  const resetTokenHash = hashToken(resetToken)
  const expiresAt = new Date(Date.now() + (passwordResetTtlHours * 60 * 60 * 1000))

  await createPasswordResetToken({
    user_id: user.user_id,
    token_hash: resetTokenHash,
    expires_at: expiresAt
  })

  await emailService.sendPasswordResetEmail({
    to: user.email,
    token: resetToken
  })
}

const completePasswordResetByToken = async ({ token, newPassword }) => {
  const tokenHash = hashToken(token)
  const resetRecord = await findValidPasswordResetToken(tokenHash)

  if (!resetRecord) {
    return false
  }

  const password_hash = await hashPassword(newPassword)

  await completePasswordReset({
    reset_id: resetRecord.reset_id,
    user_id: resetRecord.user_id,
    password_hash
  })

  return true
}

module.exports = {
  completePasswordReset,
  completePasswordResetByToken,
  consumeEmailVerificationToken,
  createAuthSession,
  createPasswordResetRequest,
  createSessionForCredentials,
  createEmailVerificationToken,
  createPasswordResetToken,
  createUser,
  findUserByEmail,
  findValidPasswordResetToken,
  getSessionSummaryByUserId,
  issueEmailVerification,
  isAuthSessionActive,
  registerUserWithVerification,
  revokeAuthSession,
  verifyEmailByToken
}
