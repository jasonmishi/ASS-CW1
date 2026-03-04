const { z } = require('zod')

const certificationBodySchema = z.object({
  title: z.string().min(1),
  issuingOrganisation: z.string().min(1),
  certificationUrl: z.string().url(),
  completionDate: z.coerce.date()
})

const licenceBodySchema = z.object({
  title: z.string().min(1),
  awardingBody: z.string().min(1),
  licenceUrl: z.string().url(),
  completionDate: z.coerce.date()
})

const courseBodySchema = z.object({
  title: z.string().min(1),
  provider: z.string().min(1),
  courseUrl: z.string().url(),
  completionDate: z.coerce.date()
})

const certificationParamsSchema = z.object({
  certificationId: z.string().min(1)
})

const licenceParamsSchema = z.object({
  licenceId: z.string().min(1)
})

const courseParamsSchema = z.object({
  courseId: z.string().min(1)
})

module.exports = {
  certificationBodySchema,
  certificationParamsSchema,
  courseBodySchema,
  courseParamsSchema,
  licenceBodySchema,
  licenceParamsSchema
}
