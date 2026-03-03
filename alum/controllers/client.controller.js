const clientModel = require('../models/client.model')

const createClient = async (req, res) => {
  const { clientName, description, contactEmail } = req.body

  const result = await clientModel.registerClientWithToken({
    clientName,
    description,
    contactEmail,
    createdByUserId: req.user.user_id
  })

  if (!result.ok && result.reason === 'duplicate') {
    return res.status(409).json({
      success: false,
      message: 'An API client with this name already exists.'
    })
  }

  const { client, token } = result

  return res.status(201).json({
    success: true,
    message: 'API client registered successfully. Store your token securely; it will not be shown again.',
    data: {
      client_id: client.client_id,
      client_name: client.client_name,
      description: client.description,
      contact_email: client.contact_email,
      is_revoked: client.is_revoked,
      created_by_user_id: client.created_by_user_id,
      created_at: client.created_at,
      token
    }
  })
}

const listClients = async (req, res) => {
  const clients = await clientModel.listClientsSummary()

  return res.status(200).json({
    success: true,
    data: clients
  })
}

const getClientUsageStats = async (req, res) => {
  const { clientId } = req.params
  const { from, to } = req.query

  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null

  const usageStats = await clientModel.getClientUsageSummary(clientId, fromDate, toDate)

  if (usageStats === null) {
    return res.status(404).json({
      success: false,
      message: 'API client not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: usageStats
  })
}

const createClientToken = async (req, res) => {
  const { clientId } = req.params
  const tokenData = await clientModel.createAdditionalTokenForClient(clientId)

  if (!tokenData) {
    return res.status(404).json({
      success: false,
      message: 'API client not found.'
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Client token created successfully. Store it securely; it will not be shown again.',
    data: tokenData
  })
}

const listClientTokens = async (req, res) => {
  const { clientId } = req.params
  const tokens = await clientModel.listTokensByClientId(clientId)

  if (tokens === null) {
    return res.status(404).json({
      success: false,
      message: 'API client not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: tokens
  })
}

const revokeClientTokenByTokenId = async (req, res) => {
  const { clientId, tokenId } = req.params
  const result = await clientModel.revokeClientTokenByTokenId(clientId, tokenId)

  if (!result.ok && result.reason === 'client_not_found') {
    return res.status(404).json({
      success: false,
      message: 'API client not found.'
    })
  }

  if (!result.ok && result.reason === 'token_not_found') {
    return res.status(404).json({
      success: false,
      message: 'API client token not found.'
    })
  }

  return res.status(204).send()
}

module.exports = {
  createClientToken,
  createClient,
  getClientUsageStats,
  listClientTokens,
  listClients,
  revokeClientTokenByTokenId
}
