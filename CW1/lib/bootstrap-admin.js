const prisma = require('./prisma')
const { hashPassword, isStrongPassword, isUniversityEmail } = require('../utils/security')

const DEFAULT_BOOTSTRAP_ADMIN_EMAIL = 'admin@eastminster.ac.uk'
const DEFAULT_BOOTSTRAP_ADMIN_PASSWORD = 'ChangeMe!123!'
const DEFAULT_BOOTSTRAP_ADMIN_FIRST_NAME = 'System'
const DEFAULT_BOOTSTRAP_ADMIN_LAST_NAME = 'Admin'

const resolveBootstrapCredentials = () => {
  const emailFromEnv = process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_USERNAME
  const passwordFromEnv = process.env.BOOTSTRAP_ADMIN_PASSWORD

  return {
    email: (emailFromEnv || DEFAULT_BOOTSTRAP_ADMIN_EMAIL).toLowerCase(),
    password: passwordFromEnv || DEFAULT_BOOTSTRAP_ADMIN_PASSWORD,
    source: emailFromEnv && passwordFromEnv ? 'env' : 'fallback'
  }
}

const validateBootstrapCredentials = ({ email, password }) => {
  if (!isUniversityEmail(email)) {
    throw new Error('Bootstrap admin email must be a valid @eastminster.ac.uk address.')
  }

  if (!isStrongPassword(password)) {
    throw new Error('Bootstrap admin password does not meet complexity requirements.')
  }
}

const ensureFirstAdmin = async () => {
  const credentials = resolveBootstrapCredentials()
  validateBootstrapCredentials(credentials)

  const result = await prisma.$transaction(async (tx) => {
    const adminCount = await tx.user.count({
      where: {
        role: {
          name: 'admin'
        }
      }
    })

    if (adminCount > 0) {
      return {
        created: false
      }
    }

    const adminRole = await tx.role.findUnique({
      where: {
        name: 'admin'
      }
    })

    if (!adminRole) {
      throw new Error('Admin role is missing. Ensure default roles are seeded before bootstrap.')
    }

    const existingUser = await tx.user.findUnique({
      where: {
        email: credentials.email
      }
    })

    if (existingUser) {
      throw new Error('Bootstrap admin email already exists as a non-admin user. Use a different bootstrap email.')
    }

    const passwordHash = await hashPassword(credentials.password)

    const createdUser = await tx.user.create({
      data: {
        email: credentials.email,
        password_hash: passwordHash,
        role_id: adminRole.role_id,
        first_name: DEFAULT_BOOTSTRAP_ADMIN_FIRST_NAME,
        last_name: DEFAULT_BOOTSTRAP_ADMIN_LAST_NAME,
        email_verified_at: new Date()
      }
    })

    return {
      created: true,
      userId: createdUser.user_id
    }
  })

  if (result.created) {
    console.log(`Bootstrap admin created from ${credentials.source} credentials (${credentials.email}).`)
  }

  return result
}

module.exports = {
  DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
  DEFAULT_BOOTSTRAP_ADMIN_PASSWORD,
  ensureFirstAdmin
}
