const express = require('express')
const webController = require('../controllers/web.controller')
const { authenticateSessionApi, authenticateViewSession } = require('../middleware/session-auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { alumniDirectoryQuerySchema, analyticsDashboardQuerySchema } = require('../schemas/analytics.schemas')
const { alumniParamsSchema } = require('../schemas/alumni.schemas')

const router = express.Router()

router.get('/login', webController.renderLoginPage)
router.get('/register', webController.renderRegisterPage)
router.get('/bidding', authenticateViewSession, webController.renderBiddingPage)
router.get('/alumni/:alumniId', authenticateViewSession, validate(alumniParamsSchema, 'params'), webController.renderAlumniProfilePage)
router.get('/dashboard/alumni-analytics', authenticateViewSession, validate(analyticsDashboardQuerySchema, 'query'), webController.renderAnalyticsDashboard)
router.get('/dashboard/alumni-analytics/data', authenticateSessionApi, validate(analyticsDashboardQuerySchema, 'query'), webController.proxyAnalyticsDashboard)
router.get('/dashboard/alumni-directory', authenticateViewSession, validate(alumniDirectoryQuerySchema, 'query'), webController.renderAlumniDirectory)
router.get('/dashboard/alumni-directory/data', authenticateSessionApi, validate(alumniDirectoryQuerySchema, 'query'), webController.proxyAlumniDirectory)

module.exports = router
