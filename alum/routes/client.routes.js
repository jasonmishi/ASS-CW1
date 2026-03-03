const express = require('express')
const clientController = require('../controllers/client.controller')
const { authenticateJwt, requireAdmin } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  clientParamsSchema,
  clientTokenParamsSchema,
  createClientBodySchema
} = require('../schemas/client.schemas')

const router = express.Router()

router.post('/clients', authenticateJwt, requireAdmin, validate(createClientBodySchema), clientController.createClient)
router.get('/clients', authenticateJwt, requireAdmin, clientController.listClients)
router.get('/clients/:clientId/usage', authenticateJwt, requireAdmin, validate(clientParamsSchema, 'params'), clientController.getClientUsageStats)
router.post('/clients/:clientId/tokens', authenticateJwt, requireAdmin, validate(clientParamsSchema, 'params'), clientController.createClientToken)
router.get('/clients/:clientId/tokens', authenticateJwt, requireAdmin, validate(clientParamsSchema, 'params'), clientController.listClientTokens)
router.delete('/clients/:clientId/tokens/:tokenId', authenticateJwt, requireAdmin, validate(clientTokenParamsSchema, 'params'), clientController.revokeClientTokenByTokenId)

module.exports = router
