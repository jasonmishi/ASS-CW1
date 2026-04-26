const express = require('express')
const webController = require('../controllers/web.controller')
const { authenticateJwt } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { analyticsDashboardQuerySchema } = require('../schemas/analytics.schemas')
const { authenticateViewSession } = require('../middleware/web-auth.middleware')

const router = express.Router()

router.get('/login', webController.renderLoginPage)
router.get('/dashboard/alumni-analytics', authenticateViewSession, webController.renderAnalyticsDashboard)
router.get('/dashboard/alumni-analytics/data', authenticateJwt, validate(analyticsDashboardQuerySchema, 'query'), webController.proxyAnalyticsDashboard)

module.exports = router
