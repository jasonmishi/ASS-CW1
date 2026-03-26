const prisma = require('../lib/prisma')
const roleModel = require('./role.model')
const emailService = require('../services/email.service')
const { generateSecureToken, hashPassword, hashToken, isUniversityEmail } = require('../utils/security')

const normalizeRole = (role) => role.toLowerCase()

const displayRole = (roleName) => roleName.charAt(0).toUpperCase() + roleName.slice(1)

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

const createPrivilegedUser = async ({
  email,
  password,
  firstName,
  lastName,
  role,
  emailVerificationTtlHours
}) => {
  const normalizedEmail = email.toLowerCase()
  const roleName = normalizeRole(role)

  if (roleName === 'alumni' && !isUniversityEmail(normalizedEmail)) {
    return {
      ok: false,
      reason: 'invalid_alumni_email_domain'
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  })

  if (existingUser) {
    return {
      ok: false,
      reason: 'duplicate'
    }
  }

  const targetRole = await roleModel.findRoleByName(roleName)

  if (!targetRole) {
    return {
      ok: false,
      reason: 'role_not_found'
    }
  }

  const password_hash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password_hash,
      role_id: targetRole.role_id,
      first_name: firstName,
      last_name: lastName || ''
    },
    include: {
      role: true
    }
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
    user: {
      id: user.user_id,
      email: user.email,
      role: displayRole(user.role.name),
      firstName: user.first_name,
      lastName: user.last_name
    }
  }
}

const updateUserRole = async (userId, role) => {
  const targetRoleName = normalizeRole(role)

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        user_id: userId
      },
      include: {
        role: true
      }
    })

    if (!user) {
      return {
        ok: false,
        reason: 'user_not_found'
      }
    }

    const targetRole = await tx.role.findUnique({
      where: {
        name: targetRoleName
      }
    })

    if (!targetRole) {
      return {
        ok: false,
        reason: 'role_not_found'
      }
    }

    if (targetRoleName === 'alumni' && !isUniversityEmail(user.email)) {
      return {
        ok: false,
        reason: 'invalid_alumni_email_domain'
      }
    }

    const isDemotingFromAdmin = user.role.name === 'admin' && targetRoleName !== 'admin'

    if (isDemotingFromAdmin) {
      const adminCount = await tx.user.count({
        where: {
          role: {
            name: 'admin'
          }
        }
      })

      if (adminCount <= 1) {
        return {
          ok: false,
          reason: 'last_admin_demotion'
        }
      }
    }

    const updatedUser = await tx.user.update({
      where: {
        user_id: userId
      },
      data: {
        role_id: targetRole.role_id
      },
      include: {
        role: true
      }
    })

    return {
      ok: true,
      role: displayRole(updatedUser.role.name)
    }
  })
}

const listAdminUsers = async () => {
  const users = await prisma.user.findMany({
    include: {
      role: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  return users.map((user) => ({
    id: user.user_id,
    email: user.email,
    role: displayRole(user.role.name),
    firstName: user.first_name,
    lastName: user.last_name,
    emailVerified: Boolean(user.email_verified_at)
  }))
}

const getOrCreateSystemSchedulerAdminUserId = async () => {
  const email = (process.env.SCHEDULER_SYSTEM_EMAIL || 'system.scheduler@eastminster.local').toLowerCase()

  const existing = await prisma.user.findUnique({
    where: {
      email
    }
  })

  if (existing) {
    return existing.user_id
  }

  const adminRole = await roleModel.findRoleByName('admin')

  if (!adminRole) {
    throw new Error('Admin role is not configured.')
  }

  const password_hash = await hashPassword(`${generateSecureToken(16)}Aa1!`)

  const created = await prisma.user.create({
    data: {
      email,
      password_hash,
      role_id: adminRole.role_id,
      first_name: 'System',
      last_name: 'Scheduler',
      email_verified_at: new Date()
    }
  })

  return created.user_id
}

module.exports = {
  createPrivilegedUser,
  getOrCreateSystemSchedulerAdminUserId,
  listAdminUsers,
  updateUserRole
}
