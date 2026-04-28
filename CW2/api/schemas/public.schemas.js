const { z } = require('zod')

const publicHistoryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
}).superRefine((value, ctx) => {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'to must be on or after from.'
    })
  }
})

const alumniParamsSchema = z.object({
  alumniId: z.string().min(1)
})

module.exports = {
  alumniParamsSchema,
  publicHistoryQuerySchema
}
