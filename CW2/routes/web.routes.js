const express = require('express')
const webController = require('../controllers/web.controller')
const { authenticateViewSession } = require('../middleware/web-auth.middleware')

const router = express.Router()

router.get('/login', webController.renderLoginPage)
router.get('/dashboard/alumni-analytics', authenticateViewSession, webController.renderAnalyticsDashboard)

module.exports = router
