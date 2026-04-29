const { z } = require('zod')

const alumniParamsSchema = z.object({
  alumniId: z.string().min(1)
})

module.exports = {
  alumniParamsSchema
}
