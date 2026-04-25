const express = require('express')
const analyticsController = require('../controllers/analytics.controller')
const { authenticateJwt } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { analyticsDashboardQuerySchema } = require('../schemas/analytics.schemas')

const router = express.Router()

router.get('/analytics/alumni-dashboard', authenticateJwt, validate(analyticsDashboardQuerySchema, 'query'), analyticsController.getAlumniDashboard)

module.exports = router
