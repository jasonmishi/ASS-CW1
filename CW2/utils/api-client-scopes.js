const API_CLIENT_SCOPES = Object.freeze({
  PUBLIC_FEATURED_READ: 'public:featured:read',
  PUBLIC_HISTORY_READ: 'public:history:read',
  PUBLIC_PROFILE_READ: 'public:profile:read',
  ANALYTICS_DASHBOARD_READ: 'analytics:dashboard:read'
})

const DEFAULT_PUBLIC_SCOPES = Object.freeze([
  API_CLIENT_SCOPES.PUBLIC_FEATURED_READ,
  API_CLIENT_SCOPES.PUBLIC_HISTORY_READ,
  API_CLIENT_SCOPES.PUBLIC_PROFILE_READ
])

const ALL_API_CLIENT_SCOPES = Object.freeze([
  ...DEFAULT_PUBLIC_SCOPES,
  API_CLIENT_SCOPES.ANALYTICS_DASHBOARD_READ
])

const normalizeScopes = (scopes, fallbackScopes = DEFAULT_PUBLIC_SCOPES) => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...new Set(fallbackScopes)]
  }

  return [...new Set(scopes)]
}

const areValidScopes = (scopes) => {
  return Array.isArray(scopes) && scopes.every((scope) => ALL_API_CLIENT_SCOPES.includes(scope))
}

const areScopesSubset = (candidateScopes, allowedScopes) => {
  const allowedScopeSet = new Set(allowedScopes)

  return candidateScopes.every((scope) => allowedScopeSet.has(scope))
}

module.exports = {
  ALL_API_CLIENT_SCOPES,
  API_CLIENT_SCOPES,
  DEFAULT_PUBLIC_SCOPES,
  areScopesSubset,
  areValidScopes,
  normalizeScopes
}
