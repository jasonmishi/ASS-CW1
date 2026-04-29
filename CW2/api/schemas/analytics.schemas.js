const { z } = require('zod')

const emptyStringToUndefined = (value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}

const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
)

const optionalTrimmedString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional()
)

const analyticsDashboardQuerySchema = z.object({
  from: optionalDate,
  to: optionalDate,
  degreeTitle: optionalTrimmedString,
  credentialDomain: optionalTrimmedString,
  careerCategory: optionalTrimmedString,
  search: optionalTrimmedString
})

const alumniDirectoryQuerySchema = z.object({
  programme: optionalTrimmedString,
  graduationFrom: optionalDate,
  graduationTo: optionalDate,
  industrySector: optionalTrimmedString
})

module.exports = {
  alumniDirectoryQuerySchema,
  analyticsDashboardQuerySchema
}
