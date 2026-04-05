const prisma = require('../../lib/prisma')
const roleModel = require('../../models/role.model')

const TABLES = [
  'api_client_endpoint_usage',
  'rate_limit_counters',
  'api_client_tokens',
  'api_clients',
  'SPONSORSHIP_PAYOUT_LINES',
  'SPONSORSHIP_PAYOUTS',
  'FEATURED_WINNERS',
  'BIDS',
  'EVENT_ATTENDANCES',
  'SPONSORSHIP_OFFERS',
  'ORG_USER_ASSOCIATION',
  'SPONSOR_ORGANIZATION',
  'degrees',
  'credentials',
  'employments',
  'profiles',
  'auth_sessions',
  'password_reset_tokens',
  'email_verification_tokens',
  'revoked_jwt_tokens',
  'users',
  'roles'
]

const assertSafeTestDatabase = () => {
  const databaseUrl = process.env.DATABASE_URL || prisma.databaseUrl || ''

  if (databaseUrl.includes('/alum_test')) {
    return
  }

  throw new Error(`Refusing to reset non-test database: ${databaseUrl || 'DATABASE_URL is not set'}`)
}

const resetDatabase = async () => {
  assertSafeTestDatabase()

  const quotedTables = TABLES.map((table) => `"${table}"`).join(', ')
  const truncateStatement = `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`

  await prisma.$executeRawUnsafe(truncateStatement)
  await roleModel.ensureDefaultRoles()
}

const disconnectDatabase = async () => {
  await prisma.$disconnect()
}

module.exports = {
  disconnectDatabase,
  prisma,
  resetDatabase
}
