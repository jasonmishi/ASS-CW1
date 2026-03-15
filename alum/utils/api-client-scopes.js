const API_CLIENT_SCOPES = Object.freeze({
  PUBLIC_FEATURED_READ: 'public:featured:read',
  PUBLIC_HISTORY_READ: 'public:history:read',
  PUBLIC_PROFILE_READ: 'public:profile:read'
})

const DEFAULT_PUBLIC_SCOPES = Object.freeze([
  API_CLIENT_SCOPES.PUBLIC_FEATURED_READ,
  API_CLIENT_SCOPES.PUBLIC_HISTORY_READ,
  API_CLIENT_SCOPES.PUBLIC_PROFILE_READ
])

const normalizeScopes = (scopes) => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...DEFAULT_PUBLIC_SCOPES]
  }

  return [...new Set(scopes)]
}

module.exports = {
  API_CLIENT_SCOPES,
  DEFAULT_PUBLIC_SCOPES,
  normalizeScopes
}
