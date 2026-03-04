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

module.exports = {
  createPrivilegedUserBodySchema,
  updateUserRoleBodySchema,
  updateUserRoleParamsSchema
}
