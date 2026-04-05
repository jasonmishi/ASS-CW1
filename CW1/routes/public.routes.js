const express = require('express')
const publicController = require('../controllers/public.controller')
const { authenticateApiClient, recordApiClientUsage, requireApiClientScope } = require('../middleware/auth.middleware')
const { API_CLIENT_SCOPES } = require('../utils/api-client-scopes')
const { validate } = require('../middleware/validate.middleware')
const { alumniParamsSchema, publicHistoryQuerySchema } = require('../schemas/public.schemas')

const router = express.Router()

router.get('/public/alumni/featured', authenticateApiClient, requireApiClientScope(API_CLIENT_SCOPES.PUBLIC_FEATURED_READ), recordApiClientUsage, publicController.getFeaturedAlumni)
router.get('/public/alumni/featured/history', authenticateApiClient, requireApiClientScope(API_CLIENT_SCOPES.PUBLIC_HISTORY_READ), recordApiClientUsage, validate(publicHistoryQuerySchema, 'query'), publicController.getFeaturedHistory)
router.get('/public/alumni/:alumniId', authenticateApiClient, requireApiClientScope(API_CLIENT_SCOPES.PUBLIC_PROFILE_READ), recordApiClientUsage, validate(alumniParamsSchema, 'params'), publicController.getAlumniPublicProfile)

module.exports = router
