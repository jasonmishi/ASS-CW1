const { z } = require('zod')

const universityEmailSchema = z.string().email().refine((value) => value.toLowerCase().endsWith('@eastminster.ac.uk'), {
  message: 'Email must be a valid @eastminster.ac.uk address.'
})

const strongPasswordSchema = z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, {
  message: 'Password must be at least 8 chars with upper, lower, digit, and special char.'
})

const registerBodySchema = z.object({
  email: universityEmailSchema,
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1).optional()
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Password confirmation does not match.'
    })
  }
})

const verifyEmailParamsSchema = z.object({
  token: z.string().min(1)
})

const createEmailVerificationBodySchema = z.object({
  email: universityEmailSchema
})

const createSessionBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const createPasswordResetBodySchema = z.object({
  email: z.string().email()
})

const completePasswordResetBodySchema = z.object({
  token: z.string().min(1),
  newPassword: strongPasswordSchema,
  confirmNewPassword: z.string()
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirmNewPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmNewPassword'],
      message: 'Password confirmation does not match.'
    })
  }
})

module.exports = {
  completePasswordResetBodySchema,
  createEmailVerificationBodySchema,
  createPasswordResetBodySchema,
  createSessionBodySchema,
  registerBodySchema,
  verifyEmailParamsSchema
}
