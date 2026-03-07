const express = require('express')
const adminController = require('../controllers/admin.controller')
const { authenticateJwt, requireAdmin } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  createPrivilegedUserBodySchema,
  createWinnerBodySchema,
  eventAttendanceBodySchema,
  listWinnersQuerySchema,
  updateUserRoleBodySchema,
  updateUserRoleParamsSchema
} = require('../schemas/admin.schemas')

const router = express.Router()

router.get('/admin/users', authenticateJwt, requireAdmin, adminController.listAdminUsers)
router.post('/admin/users', authenticateJwt, requireAdmin, validate(createPrivilegedUserBodySchema), adminController.createPrivilegedUser)
router.put('/admin/users/:userId/role', authenticateJwt, requireAdmin, validate(updateUserRoleParamsSchema, 'params'), validate(updateUserRoleBodySchema), adminController.updateUserRole)
router.post('/admin/event-attendances', authenticateJwt, requireAdmin, validate(eventAttendanceBodySchema), adminController.recordEventAttendance)
router.post('/admin/winners', authenticateJwt, requireAdmin, validate(createWinnerBodySchema), adminController.createWinner)
router.get('/admin/winners', authenticateJwt, requireAdmin, validate(listWinnersQuerySchema, 'query'), adminController.listWinners)

module.exports = router
