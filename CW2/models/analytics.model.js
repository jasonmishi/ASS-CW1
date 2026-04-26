const { fetchAlumniUsers } = require('./analytics.repository')
const { buildAnalyticsAggregates } = require('../services/analytics/aggregate')
const { CAREER_RULES, DOMAIN_RULES } = require('../services/analytics/config')
const { normalizeAlumniUsers } = require('../services/analytics/normalize')
const { buildAnalyticsResponse } = require('../services/analytics/presenter')

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

module.exports = {
  CAREER_RULES,
  DOMAIN_RULES,
  getAlumniDashboardAnalytics
}
