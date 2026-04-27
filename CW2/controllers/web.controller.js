const buildQueryString = (query = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value)
    }
  })

  return searchParams.toString()
}

const getAnalyticsProxyBaseUrl = () => {
  return process.env.INTERNAL_API_BASE_URL || process.env.APP_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`
}

const buildDashboardProxyError = (code, message) => ({
  success: false,
  code,
  message
})

const proxyAnalyticsRequest = async (req, res, {
  logLabel,
  tokenEnvVar,
  upstreamPath,
  userMessage
}) => {
  const analyticsApiToken = process.env[tokenEnvVar]

  if (!analyticsApiToken) {
    return res.status(503).json(buildDashboardProxyError(
      'ANALYTICS_PROXY_MISCONFIGURED',
      userMessage
    ))
  }

  const query = req.validated?.query || req.query
  const queryString = buildQueryString(query)
  const upstreamUrl = `${getAnalyticsProxyBaseUrl()}${upstreamPath}${queryString ? `?${queryString}` : ''}`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${analyticsApiToken}`,
        Cookie: req.headers.cookie || ''
      }
    })

    if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
      console.error(`${logLabel} proxy authentication failed`, {
        upstreamStatus: upstreamResponse.status
      })

      return res.status(503).json(buildDashboardProxyError(
        'ANALYTICS_PROXY_AUTH_FAILED',
        userMessage
      ))
    }

    const responseText = await upstreamResponse.text()
    const contentType = upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8'

    res.status(upstreamResponse.status)
    res.set('Content-Type', contentType)

    return res.send(responseText)
  } catch (_error) {
    return res.status(502).json(buildDashboardProxyError(
      'ANALYTICS_PROXY_UNREACHABLE',
      userMessage
    ))
  }
}

const renderLoginPage = (_req, res) => {
  return res.status(200).render('login', {
    pageTitle: 'Login',
    bodyClass: 'login-page'
  })
}

const renderRegisterPage = (_req, res) => {
  return res.status(200).render('register', {
    pageTitle: 'Register',
    bodyClass: 'login-page',
    csrfCookieName: process.env.CSRF_COOKIE_NAME || 'csrf_token'
  })
}

const renderAnalyticsDashboard = (req, res) => {
  return res.status(200).render('alumni-analytics', {
    pageTitle: 'Alumni Analytics Dashboard',
    bodyClass: 'dashboard-page',
    currentUser: req.user,
    analyticsEndpoint: '/dashboard/alumni-analytics/data'
  })
}

const renderAlumniDirectory = (req, res) => {
  return res.status(200).render('alumni-directory', {
    pageTitle: 'Alumni Directory Analytics',
    bodyClass: 'dashboard-page',
    currentUser: req.user,
    analyticsEndpoint: '/dashboard/alumni-directory/data'
  })
}

const proxyAnalyticsDashboard = async (req, res) => {
  return proxyAnalyticsRequest(req, res, {
    logLabel: 'Analytics dashboard',
    tokenEnvVar: 'ANALYTICS_DASHBOARD_API_TOKEN',
    upstreamPath: '/api/v1/analytics/alumni-dashboard',
    userMessage: 'Analytics dashboard is unavailable right now.'
  })
}

const proxyAlumniDirectory = async (req, res) => {
  return proxyAnalyticsRequest(req, res, {
    logLabel: 'Alumni directory',
    tokenEnvVar: 'ANALYTICS_ALUMNI_DIRECTORY_API_TOKEN',
    upstreamPath: '/api/v1/analytics/alumni-directory',
    userMessage: 'Alumni directory is unavailable right now.'
  })
}

module.exports = {
  proxyAlumniDirectory,
  proxyAnalyticsDashboard,
  renderAlumniDirectory,
  renderAnalyticsDashboard,
  renderLoginPage,
  renderRegisterPage
}
