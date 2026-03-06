const prisma = require('../../lib/prisma')
const roleModel = require('../../models/role.model')

const TABLES = [
  'api_client_endpoint_usage',
  'api_client_tokens',
  'api_clients',
  'SPONSORSHIP_PAYOUT_LINES',
  'SPONSORSHIP_PAYOUTS',
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

const resetDatabase = async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE;`)
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
