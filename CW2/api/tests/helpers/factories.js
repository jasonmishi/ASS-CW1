const { hashPassword, hashToken } = require('../../utils/security')
const { signUserToken } = require('../../utils/jwt')
const { DEFAULT_PUBLIC_SCOPES } = require('../../utils/api-client-scopes')
const { prisma } = require('./test-db')

const getRoleId = async (roleName) => {
  const role = await prisma.role.findUnique({
    where: {
      name: roleName
    }
  })

  if (!role) {
    throw new Error(`Role ${roleName} not found`) 
  }

  return role.role_id
}

const createUser = async ({
  email,
  password = 'Strong!Pass1',
  firstName = 'Jane',
  lastName = 'Doe',
  roleName = 'alumni',
  verified = true
}) => {
  const role_id = await getRoleId(roleName)
  const password_hash = await hashPassword(password)

  return prisma.user.create({
    data: {
      email,
      password_hash,
      role_id,
      first_name: firstName,
      last_name: lastName,
      email_verified_at: verified ? new Date() : null
    },
    include: {
      role: true
    }
  })
}

const createAuthenticatedUser = async ({
  email,
  password,
  roleName = 'admin',
  verified = true
}) => {
  const user = await createUser({ email, password, roleName, verified })
  const signed = signUserToken(user)

  await prisma.authSession.create({
    data: {
      user_id: user.user_id,
      token_hash: hashToken(signed.token),
      expired_at: signed.expiresAt
    }
  })

  return {
    user,
    token: signed.token
  }
}

const createApiClientWithToken = async ({
  clientName = 'AR Campus App',
  createdByUserId,
  allowedScopes = DEFAULT_PUBLIC_SCOPES,
  scopes = DEFAULT_PUBLIC_SCOPES
}) => {
  const client = await prisma.apiClient.create({
    data: {
      client_name: clientName,
      description: 'Integration test client',
      contact_email: 'api@example.com',
      allowed_scopes: allowedScopes,
      created_by_user_id: createdByUserId
    }
  })

  const plainToken = `token-${Math.random().toString(36).slice(2)}`
  const token = await prisma.apiClientToken.create({
    data: {
      client_id: client.client_id,
      token_hash: hashToken(plainToken),
      scopes
    }
  })

  return {
    client,
    token,
    plainToken
  }
}

module.exports = {
  createApiClientWithToken,
  createAuthenticatedUser,
  createUser
}
