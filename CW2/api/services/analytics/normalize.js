const { CAREER_RULES, DOMAIN_RULES } = require('./config')

const toIsoDate = (value) => {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

const getMonthKey = (value) => (value ? value.slice(0, 7) : null)

// Analytics stages operate on this normalized shape rather than raw Prisma
// records so the rest of the pipeline can focus on classification and counting.
const classifyByRules = (text, rules, fallbackKey, fallbackLabel) => {
  const haystack = (text || '').trim()

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return {
        key: rule.key,
        label: rule.label
      }
    }
  }

  return {
    key: fallbackKey,
    label: fallbackLabel
  }
}

const normalizeCredential = (credential) => ({
  id: credential.credential_id,
  type: credential.credential_type,
  title: credential.title,
  providerName: credential.provider_name,
  completionDate: toIsoDate(credential.completion_date),
  domain: classifyByRules(
    `${credential.title} ${credential.provider_name}`,
    DOMAIN_RULES,
    'other',
    'Other'
  )
})

const normalizeEmployment = (employment) => ({
  id: employment.employment_id,
  jobTitle: employment.job_title,
  company: employment.company,
  industrySector: employment.industry_sector,
  startDate: toIsoDate(employment.start_date),
  endDate: toIsoDate(employment.end_date),
  isCurrent: !employment.end_date,
  category: classifyByRules(employment.job_title, CAREER_RULES, 'other', 'Other')
})

const normalizeDegree = (degree) => ({
  id: degree.degree_id,
  title: degree.title,
  university: degree.university,
  completionDate: toIsoDate(degree.completion_date)
})

const normalizeAlumni = (user) => {
  // Split credentials once up front so later aggregation does not need to keep
  // re-partitioning every alumni record by credential type.
  const credentials = user.credentials.map(normalizeCredential)
  const employments = user.employments.map(normalizeEmployment)

  return {
    userId: user.user_id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    degrees: user.degrees.map(normalizeDegree),
    certifications: credentials.filter((credential) => credential.type === 'certification'),
    licences: credentials.filter((credential) => credential.type === 'licence'),
    courses: credentials.filter((credential) => credential.type === 'course'),
    credentials,
    employments,
    currentEmployments: employments.filter((employment) => employment.isCurrent)
  }
}

const normalizeAlumniUsers = (users) => users.map(normalizeAlumni)

module.exports = {
  getMonthKey,
  normalizeAlumniUsers,
  toIsoDate
}
