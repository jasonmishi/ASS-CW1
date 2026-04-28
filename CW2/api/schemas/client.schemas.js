const { z } = require('zod')
const { ALL_API_CLIENT_SCOPES } = require('../utils/api-client-scopes')

const apiClientScopeSchema = z.enum(ALL_API_CLIENT_SCOPES)

const createClientBodySchema = z.object({
  clientName: z.string().min(1),
  description: z.string().min(1),
  contactEmail: z.string().email(),
  allowedScopes: z.array(apiClientScopeSchema).min(1)
}).strict()

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
}).strict()

module.exports = {
  clientParamsSchema,
  clientTokenParamsSchema,
  createClientTokenBodySchema,
  createClientBodySchema
}
