const express = require('express')
const webController = require('../controllers/web.controller')
const { authenticateJwt } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { alumniDirectoryQuerySchema, analyticsDashboardQuerySchema } = require('../schemas/analytics.schemas')
const { authenticateViewSession } = require('../middleware/web-auth.middleware')

const router = express.Router()

router.get('/login', webController.renderLoginPage)
router.get('/register', webController.renderRegisterPage)
router.get('/dashboard/alumni-analytics', authenticateViewSession, webController.renderAnalyticsDashboard)
router.get('/dashboard/alumni-analytics/data', authenticateJwt, validate(analyticsDashboardQuerySchema, 'query'), webController.proxyAnalyticsDashboard)
router.get('/dashboard/alumni-directory', authenticateViewSession, webController.renderAlumniDirectory)
router.get('/dashboard/alumni-directory/data', authenticateJwt, validate(alumniDirectoryQuerySchema, 'query'), webController.proxyAlumniDirectory)

module.exports = router
