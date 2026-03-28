const express = require('express')
const clientController = require('../controllers/client.controller')
const { authenticateJwt, requireDeveloper } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  clientParamsSchema,
  clientTokenParamsSchema,
  createClientTokenBodySchema,
  createClientBodySchema
} = require('../schemas/client.schemas')

const router = express.Router()

router.post('/clients', authenticateJwt, requireDeveloper, validate(createClientBodySchema), clientController.createClient)
router.get('/clients', authenticateJwt, requireDeveloper, clientController.listClients)
router.get('/clients/:clientId/usage', authenticateJwt, requireDeveloper, validate(clientParamsSchema, 'params'), clientController.getClientUsageStats)
router.post('/clients/:clientId/tokens', authenticateJwt, requireDeveloper, validate(clientParamsSchema, 'params'), validate(createClientTokenBodySchema), clientController.createClientToken)
router.get('/clients/:clientId/tokens', authenticateJwt, requireDeveloper, validate(clientParamsSchema, 'params'), clientController.listClientTokens)
router.delete('/clients/:clientId/tokens/:tokenId', authenticateJwt, requireDeveloper, validate(clientTokenParamsSchema, 'params'), clientController.revokeClientTokenByTokenId)

module.exports = router
