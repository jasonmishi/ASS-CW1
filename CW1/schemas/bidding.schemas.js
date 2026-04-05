const { z } = require('zod')

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/

const bidBodySchema = z.object({
  amount: z.coerce.number().gt(0)
})

const bidParamsSchema = z.object({
  bidId: z.string().min(1)
})

const listBidsQuerySchema = z.object({
  month: z.string().regex(monthRegex, 'month must be in YYYY-MM format.').optional()
})

const bidSummaryQuerySchema = z.object({
  month: z.string().regex(monthRegex, 'month must be in YYYY-MM format.').optional()
})

module.exports = {
  bidBodySchema,
  bidParamsSchema,
  bidSummaryQuerySchema,
  listBidsQuerySchema
}
