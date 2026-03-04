const prisma = require('../lib/prisma')
const roleModel = require('./role.model')
const { hashPassword } = require('../utils/security')

const normalizeRole = (role) => role.toLowerCase()

const displayRole = (roleName) => roleName.charAt(0).toUpperCase() + roleName.slice(1)

const createPrivilegedUser = async ({
  email,
  password,
  firstName,
  lastName,
  role
}) => {
  const normalizedEmail = email.toLowerCase()
  const roleName = normalizeRole(role)

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
      last_name: lastName || '',
      email_verified_at: new Date()
    },
    include: {
      role: true
    }
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
    lastName: user.last_name
  }))
}

module.exports = {
  createPrivilegedUser,
  listAdminUsers,
  updateUserRole
}
