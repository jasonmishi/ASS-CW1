const { z } = require('zod')

const createClientBodySchema = z.object({
  clientName: z.string().min(1),
  description: z.string().min(1),
  contactEmail: z.string().email()
})

const clientParamsSchema = z.object({
  clientId: z.string().min(1)
})

const clientTokenParamsSchema = z.object({
  clientId: z.string().min(1),
  tokenId: z.string().min(1)
})

module.exports = {
  clientParamsSchema,
  clientTokenParamsSchema,
  createClientBodySchema
}
