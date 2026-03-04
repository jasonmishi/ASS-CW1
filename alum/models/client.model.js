const prisma = require('../lib/prisma')
const { generateSecureToken, hashToken } = require('../utils/security')

const createClient = async (data) => {
  return prisma.apiClient.create({
    data
  })
}

const findClientByName = async (client_name) => {
  return prisma.apiClient.findUnique({
    where: { client_name }
  })
}

const listClients = async () => {
  return prisma.apiClient.findMany({
    orderBy: {
      created_at: 'desc'
    }
  })
}

const findClientById = async (client_id) => {
  return prisma.apiClient.findUnique({
    where: {
      client_id
    }
  })
}

const createClientToken = async ({ client_id, token_hash, expires_at = null }) => {
  return prisma.apiClientToken.create({
    data: {
      client_id,
      token_hash,
      expires_at
    }
  })
}

const getActiveTokenForClient = async (client_id) => {
  return prisma.apiClientToken.findFirst({
    where: {
      client_id,
      revoked_at: null,
      OR: [
        { expires_at: null },
        { expires_at: { gt: new Date() } }
      ]
    },
    orderBy: {
      issued_at: 'desc'
    }
  })
}

const revokeClientToken = async (client_id) => {
  const now = new Date()

  const [tokenResult] = await prisma.$transaction([
    prisma.apiClientToken.updateMany({
      where: {
        client_id,
        revoked_at: null
      },
      data: {
        revoked_at: now
      }
    }),
    prisma.apiClient.update({
      where: {
        client_id
      },
      data: {
        is_revoked: true
      }
    })
  ])

  return tokenResult.count > 0
}

const activateClient = async (client_id) => {
  return prisma.apiClient.update({
    where: {
      client_id
    },
    data: {
      is_revoked: false
    }
  })
}

const getClientUsageStats = async (client_id, from, to) => {
  const filters = {
    token: {
      client_id
    }
  }

  if (from || to) {
    filters.usage_date = {}

    if (from) {
      filters.usage_date.gte = from
    }

    if (to) {
      filters.usage_date.lte = to
    }
  }

  const [client, tokens, usageRecords] = await Promise.all([
    prisma.apiClient.findUnique({
      where: { client_id }
    }),
    prisma.apiClientToken.findMany({
      where: { client_id },
      orderBy: { issued_at: 'desc' }
    }),
    prisma.apiClientEndpointUsage.findMany({
      where: filters,
      orderBy: { last_accessed_at: 'desc' }
    })
  ])

  if (!client) {
    return null
  }

  let totalRequests = 0
  let lastAccessed = null

  for (const usage of usageRecords) {
    totalRequests += usage.request_count

    if (!lastAccessed || usage.last_accessed_at > lastAccessed) {
      lastAccessed = usage.last_accessed_at
    }

  }

  return {
    client,
    tokens,
    totalRequests,
    lastAccessed,
    endpointUsage: usageRecords
  }
}

const registerClientWithToken = async ({
  clientName,
  description,
  contactEmail,
  createdByUserId
}) => {
  const existingClient = await findClientByName(clientName)

  if (existingClient) {
    return {
      ok: false,
      reason: 'duplicate'
    }
  }

  const client = await createClient({
    client_name: clientName,
    description,
    contact_email: contactEmail,
    created_by_user_id: createdByUserId
  })

  const plainToken = generateSecureToken(40)
  const tokenHash = hashToken(plainToken)

  await createClientToken({
    client_id: client.client_id,
    token_hash: tokenHash
  })

  return {
    ok: true,
    client,
    token: plainToken
  }
}

const listClientsSummary = async () => {
  const clients = await listClients()

  return clients.map((client) => ({
    client_id: client.client_id,
    client_name: client.client_name,
    description: client.description,
    contact_email: client.contact_email,
    is_revoked: client.is_revoked,
    created_by_user_id: client.created_by_user_id,
    created_at: client.created_at
  }))
}

const getClientUsageSummary = async (clientId, fromDate, toDate) => {
  const usageStats = await getClientUsageStats(clientId, fromDate, toDate)

  if (!usageStats) {
    return null
  }

  const latestToken = usageStats.tokens[0]

  return {
    client_id: usageStats.client.client_id,
    client_name: usageStats.client.client_name,
    description: usageStats.client.description,
    contact_email: usageStats.client.contact_email,
    is_revoked: usageStats.client.is_revoked,
    created_by_user_id: usageStats.client.created_by_user_id,
    created_at: usageStats.client.created_at,
    total_request_count: usageStats.totalRequests,
    last_accessed_at: usageStats.lastAccessed,
    tokens: usageStats.tokens.map((token) => ({
      token_id: token.token_id,
      client_id: token.client_id,
      issued_at: token.issued_at,
      expires_at: token.expires_at,
      revoked_at: token.revoked_at
    })),
    endpoint_usage: usageStats.endpointUsage.map((usage) => ({
      usage_id: usage.usage_id,
      token_id: usage.token_id,
      endpoint: usage.endpoint,
      http_method: usage.http_method,
      usage_date: usage.usage_date,
      request_count: usage.request_count,
      last_accessed_at: usage.last_accessed_at
    })),
    latest_token: latestToken
      ? {
        token_id: latestToken.token_id,
        client_id: latestToken.client_id,
        issued_at: latestToken.issued_at,
        expires_at: latestToken.expires_at,
        revoked_at: latestToken.revoked_at
      }
      : null
  }
}

const createAdditionalTokenForClient = async (clientId, expiresAt = null) => {
  const client = await findClientById(clientId)

  if (!client) {
    return null
  }

  const plainToken = generateSecureToken(40)
  const tokenHash = hashToken(plainToken)

  const newToken = await createClientToken({
    client_id: clientId,
    token_hash: tokenHash,
    expires_at: expiresAt
  })

  await activateClient(clientId)

  return {
    client_id: clientId,
    token: plainToken,
    token_id: newToken.token_id,
    issued_at: newToken.issued_at,
    expires_at: newToken.expires_at,
    revoked_at: newToken.revoked_at
  }
}

const listTokensByClientId = async (clientId) => {
  const client = await findClientById(clientId)

  if (!client) {
    return null
  }

  const tokens = await prisma.apiClientToken.findMany({
    where: { client_id: clientId },
    orderBy: { issued_at: 'desc' }
  })

  return tokens.map((token) => ({
    token_id: token.token_id,
    client_id: token.client_id,
    issued_at: token.issued_at,
    expires_at: token.expires_at,
    revoked_at: token.revoked_at
  }))
}

const revokeClientTokenByTokenId = async (clientId, tokenId) => {
  const client = await findClientById(clientId)

  if (!client) {
    return {
      ok: false,
      reason: 'client_not_found'
    }
  }

  const token = await prisma.apiClientToken.findFirst({
    where: {
      token_id: tokenId,
      client_id: clientId
    }
  })

  if (!token) {
    return {
      ok: false,
      reason: 'token_not_found'
    }
  }

  if (!token.revoked_at) {
    await prisma.apiClientToken.update({
      where: {
        token_id: tokenId
      },
      data: {
        revoked_at: new Date()
      }
    })
  }

  return {
    ok: true
  }
}

module.exports = {
  activateClient,
  createAdditionalTokenForClient,
  createClient,
  createClientToken,
  findClientById,
  findClientByName,
  getActiveTokenForClient,
  getClientUsageStats,
  getClientUsageSummary,
  listClients,
  listClientsSummary,
  listTokensByClientId,
  registerClientWithToken,
  revokeClientTokenByTokenId,
  revokeClientToken
}
