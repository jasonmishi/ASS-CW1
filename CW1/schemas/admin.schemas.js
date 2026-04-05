const { z } = require('zod')

const strongPasswordSchema = z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, {
  message: 'Password must be at least 8 chars with upper, lower, digit, and special char.'
})

const roleSchema = z.enum(['Alumni', 'Developer', 'Sponsor', 'Admin'])

const createPrivilegedUserBodySchema = z.object({
  email: z.string().email(),
  password: strongPasswordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1).optional(),
  role: roleSchema
})

const updateUserRoleParamsSchema = z.object({
  userId: z.string().min(1)
})

const updateUserRoleBodySchema = z.object({
  role: roleSchema
})

const createWinnerBodySchema = z.object({
  date: z.coerce.date()
})

const listWinnersQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format.').optional()
})

const eventAttendanceBodySchema = z.object({
  alumniId: z.string().min(1),
  eventName: z.string().min(1),
  eventDate: z.coerce.date()
})

module.exports = {
  createPrivilegedUserBodySchema,
  createWinnerBodySchema,
  eventAttendanceBodySchema,
  listWinnersQuerySchema,
  updateUserRoleBodySchema,
  updateUserRoleParamsSchema
}
