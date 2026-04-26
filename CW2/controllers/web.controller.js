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

const renderLoginPage = (_req, res) => {
  return res.status(200).render('login', {
    pageTitle: 'Login',
    bodyClass: 'login-page'
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

const proxyAnalyticsDashboard = async (req, res) => {
  const analyticsApiToken = process.env.ANALYTICS_DASHBOARD_API_TOKEN

  if (!analyticsApiToken) {
    return res.status(503).json(buildDashboardProxyError(
      'ANALYTICS_PROXY_MISCONFIGURED',
      'Analytics dashboard is unavailable right now.'
    ))
  }

  const query = req.validated?.query || req.query
  const queryString = buildQueryString(query)
  const upstreamUrl = `${getAnalyticsProxyBaseUrl()}/api/v1/analytics/alumni-dashboard${queryString ? `?${queryString}` : ''}`

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${analyticsApiToken}`,
        Cookie: req.headers.cookie || ''
      }
    })

    if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
      console.error('Analytics dashboard proxy authentication failed', {
        upstreamStatus: upstreamResponse.status
      })

      return res.status(503).json(buildDashboardProxyError(
        'ANALYTICS_PROXY_AUTH_FAILED',
        'Analytics dashboard is unavailable right now.'
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
      'Analytics dashboard is unavailable right now.'
    ))
  }
}

module.exports = {
  proxyAnalyticsDashboard,
  renderAnalyticsDashboard,
  renderLoginPage
}
