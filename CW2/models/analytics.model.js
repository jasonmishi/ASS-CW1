const { fetchAlumniUsers } = require('./analytics.repository')
const { buildAnalyticsAggregates } = require('../services/analytics/aggregate')
const { CAREER_RULES, DOMAIN_RULES } = require('../services/analytics/config')
const { normalizeAlumniUsers } = require('../services/analytics/normalize')
const { buildAnalyticsResponse } = require('../services/analytics/presenter')

const getMatchingDegree = (degrees, filters) => {
  const graduationFrom = filters.graduationFrom || null
  const graduationTo = filters.graduationTo || null

  const matchingDegrees = degrees.filter((degree) => {
    if (filters.programme && degree.title !== filters.programme) {
      return false
    }

    if (graduationFrom && degree.completionDate < graduationFrom) {
      return false
    }

    if (graduationTo && degree.completionDate > graduationTo) {
      return false
    }

    return true
  })

  return matchingDegrees[0] || null
}

const getLatestEmployment = (alumni) => alumni.employments[0] || null

const matchesIndustrySector = (latestEmployment, filters) => {
  if (!filters.industrySector) {
    return true
  }

  return latestEmployment?.industrySector === filters.industrySector
}

const buildAlumniDirectoryResponse = (normalized, filters = {}) => {
  const alumni = normalized
    .map((person) => {
      const matchingDegree = getMatchingDegree(person.degrees, filters)
      const latestEmployment = getLatestEmployment(person)

      if (!matchingDegree || !matchesIndustrySector(latestEmployment, filters)) {
        return null
      }

      return {
        userId: person.userId,
        name: person.name,
        email: person.email,
        programme: matchingDegree.title,
        graduationDate: matchingDegree.completionDate,
        latestEmployment: latestEmployment
          ? {
              jobTitle: latestEmployment.jobTitle,
              company: latestEmployment.company,
              industrySector: latestEmployment.industrySector,
              startDate: latestEmployment.startDate,
              endDate: latestEmployment.endDate
            }
          : null
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.graduationDate === right.graduationDate) {
        return left.name.localeCompare(right.name)
      }

      return right.graduationDate.localeCompare(left.graduationDate)
    })

  const programmeOptions = [...new Set(normalized.flatMap((person) => person.degrees.map((degree) => degree.title)))].sort()
  const industrySectorOptions = [...new Set(normalized
    .map((person) => getLatestEmployment(person)?.industrySector)
    .filter(Boolean))].sort()

  return {
    generatedAt: new Date().toISOString(),
    appliedFilters: {
      programme: filters.programme || '',
      graduationFrom: filters.graduationFrom || '',
      graduationTo: filters.graduationTo || '',
      industrySector: filters.industrySector || ''
    },
    filterOptions: {
      programmes: programmeOptions,
      industrySectors: industrySectorOptions
    },
    totalCount: alumni.length,
    alumni
  }
}

const getAlumniDashboardAnalytics = async (filters = {}) => {
  const alumniUsers = await fetchAlumniUsers()
  const normalized = normalizeAlumniUsers(alumniUsers)
  const aggregates = buildAnalyticsAggregates(normalized, filters)

  return buildAnalyticsResponse({
    filters,
    normalized,
    aggregates
  })
}

const getAlumniDirectoryAnalytics = async (filters = {}) => {
  const alumniUsers = await fetchAlumniUsers()
  const normalized = normalizeAlumniUsers(alumniUsers)

  return buildAlumniDirectoryResponse(normalized, filters)
}

module.exports = {
  CAREER_RULES,
  DOMAIN_RULES,
  getAlumniDirectoryAnalytics,
  getAlumniDashboardAnalytics
}
