const { z } = require('zod')
const { DEFAULT_PUBLIC_SCOPES } = require('../utils/api-client-scopes')

const apiClientScopeSchema = z.enum(DEFAULT_PUBLIC_SCOPES)

const createClientBodySchema = z.object({
  clientName: z.string().min(1),
  description: z.string().min(1),
  contactEmail: z.string().email(),
  scopes: z.array(apiClientScopeSchema).min(1).optional()
})

const clientParamsSchema = z.object({
  clientId: z.string().min(1)
})

const clientTokenParamsSchema = z.object({
  clientId: z.string().min(1),
  tokenId: z.string().min(1)
})

const createClientTokenBodySchema = z.object({
  scopes: z.array(apiClientScopeSchema).min(1).optional(),
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
