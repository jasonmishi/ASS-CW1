const { z } = require('zod')
const { UNIVERSITY_DOMAIN } = require('../utils/security')

const parseHostname = (value) => {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch (_error) {
    return null
  }
}

const matchesDomain = (hostname, domain) => {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

const universityUrlSchema = z.string().url().refine((value) => {
  const hostname = parseHostname(value)
  return Boolean(hostname) && matchesDomain(hostname, UNIVERSITY_DOMAIN)
}, {
  message: `URL must use the ${UNIVERSITY_DOMAIN} domain.`
})

const linkedinUrlSchema = z.string().url().refine((value) => {
  const hostname = parseHostname(value)
  return Boolean(hostname) && matchesDomain(hostname, 'linkedin.com')
}, {
  message: 'LinkedIn URL must use the linkedin.com domain.'
})

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

const degreeBodySchema = z.object({
  title: z.string().min(1),
  university: z.string().min(1),
  degreeUrl: universityUrlSchema,
  completionDate: z.coerce.date()
})

const degreeParamsSchema = z.object({
  degreeId: z.string().min(1)
})

const employmentBodySchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  industrySector: z.string().trim().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional()
}).superRefine((value, ctx) => {
  if (value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'endDate must be on or after startDate.'
    })
  }
})

const employmentParamsSchema = z.object({
  employmentId: z.string().min(1)
})

const profileUpdateBodySchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  biography: z.string().min(1).optional(),
  linkedinUrl: linkedinUrlSchema.optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided.'
})

module.exports = {
  certificationBodySchema,
  certificationParamsSchema,
  courseBodySchema,
  courseParamsSchema,
  degreeBodySchema,
  degreeParamsSchema,
  employmentBodySchema,
  employmentParamsSchema,
  licenceBodySchema,
  licenceParamsSchema,
  profileUpdateBodySchema
}
