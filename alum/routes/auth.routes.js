const express = require('express')
const authController = require('../controllers/auth.controller')
const { authenticateJwt } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  completePasswordResetBodySchema,
  createEmailVerificationBodySchema,
  createPasswordResetBodySchema,
  createSessionBodySchema,
  registerBodySchema,
  verifyEmailParamsSchema
} = require('../schemas/auth.schemas')

const router = express.Router()

router.post('/auth/users', validate(registerBodySchema), authController.register)
router.get('/auth/verify-email/:token', validate(verifyEmailParamsSchema, 'params'), authController.verifyEmail)
router.post('/auth/verify-email', validate(createEmailVerificationBodySchema), authController.createEmailVerification)
router.post('/auth/sessions', validate(createSessionBodySchema), authController.createSession)
router.delete('/auth/sessions', authenticateJwt, authController.deleteSession)
router.get('/auth/sessions/summary', authenticateJwt, authController.getSessionSummary)
router.post('/auth/password-resets', validate(createPasswordResetBodySchema), authController.createPasswordReset)
router.patch('/auth/password-resets', validate(completePasswordResetBodySchema), authController.completePasswordReset)

module.exports = router
