const { z } = require('zod')

const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()

const analyticsDashboardQuerySchema = z.object({
  from: optionalDate,
  to: optionalDate,
  degreeTitle: z.string().trim().min(1).optional(),
  credentialDomain: z.string().trim().min(1).optional(),
  careerCategory: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional()
})

module.exports = {
  analyticsDashboardQuerySchema
}
