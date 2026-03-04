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

const createClientTokenBodySchema = z.object({
  expiresAt: z.coerce.date().optional().refine((value) => {
    if (!value) {
      return true
    }

    return value.getTime() > Date.now()
  }, {
    message: 'expiresAt must be a future datetime.'
  })
})

module.exports = {
  clientParamsSchema,
  clientTokenParamsSchema,
  createClientTokenBodySchema,
  createClientBodySchema
}
