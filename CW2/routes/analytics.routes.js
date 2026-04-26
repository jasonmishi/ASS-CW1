const express = require('express')
const analyticsController = require('../controllers/analytics.controller')
const { authenticateApiClient, authenticateJwt, recordApiClientUsage, requireApiClientScope } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { analyticsDashboardQuerySchema } = require('../schemas/analytics.schemas')
const { API_CLIENT_SCOPES } = require('../utils/api-client-scopes')

const router = express.Router()

router.get('/analytics/alumni-dashboard', authenticateJwt, authenticateApiClient, requireApiClientScope(API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ), recordApiClientUsage, validate(analyticsDashboardQuerySchema, 'query'), analyticsController.getAlumniDashboard)

module.exports = router
