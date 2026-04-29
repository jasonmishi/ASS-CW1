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

const ANALYTICS_CHART_ORDER = [
  'degreeTitles',
  'qualificationMix',
  'learningTimeline',
  'topCertifications',
  'topCourses',
  'certificationCoverage',
  'careerPathways',
  'developmentRadar'
]

const buildDashboardProxyError = (code, message) => ({
  success: false,
  code,
  message
})

const serializeForInlineScript = (value) => {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

const getValidatedQuery = (req) => req.validated?.query || req.query || {}

const buildChartClickState = (analyticsData, filters) => ({
  charts: analyticsData?.charts || {},
  summary: analyticsData?.summary || [],
  filterOptions: analyticsData?.filterOptions || {},
  appliedFilters: analyticsData?.appliedFilters || {
    from: filters.from || '',
    to: filters.to || '',
    degreeTitle: filters.degreeTitle || '',
    credentialDomain: filters.credentialDomain || '',
    careerCategory: filters.careerCategory || '',
    search: filters.search || ''
  }
})

const buildAnalyticsDetailPanel = (analyticsData, filters) => {
  if (!analyticsData?.charts) {
    return null
  }

  const { charts, filterOptions } = analyticsData

  if (filters.degreeTitle && charts.degreeTitles?.items?.length) {
    const item = charts.degreeTitles.items.find((entry) => entry.label === filters.degreeTitle)
    if (item) {
      return {
        title: charts.degreeTitles.title,
        subtitle: charts.degreeTitles.subtitle,
        item
      }
    }
  }

  if (filters.careerCategory && charts.careerPathways?.items?.length) {
    const label = filterOptions?.careerCategories?.find((option) => option.key === filters.careerCategory)?.label
    const item = charts.careerPathways.items.find((entry) => entry.label === label)
    if (item) {
      return {
        title: charts.careerPathways.title,
        subtitle: charts.careerPathways.subtitle,
        item
      }
    }
  }

  if (filters.search) {
    const credentialMatch = charts.topCertifications?.items?.find((entry) => entry.label === filters.search)
    if (credentialMatch) {
      return {
        title: charts.topCertifications.title,
        subtitle: charts.topCertifications.subtitle,
        item: credentialMatch
      }
    }

    const courseMatch = charts.topCourses?.items?.find((entry) => entry.label === filters.search)
    if (courseMatch) {
      return {
        title: charts.topCourses.title,
        subtitle: charts.topCourses.subtitle,
        item: courseMatch
      }
    }
  }

  const fallback = charts.degreeTitles?.items?.[0]
  if (fallback) {
    return {
      title: charts.degreeTitles.title,
      subtitle: charts.degreeTitles.subtitle,
      item: fallback
    }
  }

  return null
}

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

const renderAnalyticsDashboard = async (req, res) => {
  const filters = getValidatedQuery(req)

  try {
    const analyticsData = await analyticsModel.getAlumniDashboardAnalytics(filters)

    return res.status(200).render('alumni-analytics', {
      pageTitle: 'Alumni Analytics Dashboard',
      bodyClass: 'dashboard-page',
      currentUser: req.user,
      analyticsData,
      analyticsError: null,
      analyticsFilters: filters,
      chartOrder: ANALYTICS_CHART_ORDER,
      detailPanel: buildAnalyticsDetailPanel(analyticsData, filters),
      dashboardClientStateJson: serializeForInlineScript(buildChartClickState(analyticsData, filters)),
      retryPath: req.originalUrl
    })
  } catch (_error) {
    return res.status(200).render('alumni-analytics', {
      pageTitle: 'Alumni Analytics Dashboard',
      bodyClass: 'dashboard-page',
      currentUser: req.user,
      analyticsData: null,
      analyticsError: 'We could not load analytics data right now. Please try again later or contact an administrator.',
      analyticsFilters: filters,
      chartOrder: ANALYTICS_CHART_ORDER,
      detailPanel: null,
      dashboardClientStateJson: serializeForInlineScript(buildChartClickState(null, filters)),
      retryPath: req.originalUrl
    })
  }
}

const renderAlumniDirectory = async (req, res) => {
  const filters = getValidatedQuery(req)

  try {
    const directoryData = await analyticsModel.getAlumniDirectoryAnalytics(filters)

    return res.status(200).render('alumni-directory', {
      pageTitle: 'Alumni Directory Analytics',
      bodyClass: 'dashboard-page',
      currentUser: req.user,
      directoryData,
      directoryError: null,
      directoryFilters: filters,
      retryPath: req.originalUrl
    })
  } catch (_error) {
    return res.status(200).render('alumni-directory', {
      pageTitle: 'Alumni Directory Analytics',
      bodyClass: 'dashboard-page',
      currentUser: req.user,
      directoryData: null,
      directoryError: 'We could not load alumni directory data right now. Please try again later or contact an administrator.',
      directoryFilters: filters,
      retryPath: req.originalUrl
    })
  }
}

const renderBiddingPage = (req, res) => {
  return res.status(200).render('bidding', {
    pageTitle: 'Blind Bidding',
    bodyClass: 'dashboard-page',
    currentUser: req.user
  })
}

const renderAlumniProfilePage = async (req, res) => {
  const profile = await profileModel.getUserProfileById(req.params.alumniId)

  if (!profile) {
    return res.status(404).render('alumni-profile', {
      pageTitle: 'Alumni Profile',
      bodyClass: 'dashboard-page',
      currentUser: req.user,
      profile: null
    })
  }

  return res.status(200).render('alumni-profile', {
    pageTitle: 'Alumni Profile',
    bodyClass: 'dashboard-page',
    currentUser: req.user,
    profile
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
  renderAlumniProfilePage,
  renderAnalyticsDashboard,
  renderBiddingPage,
  renderLoginPage,
  renderRegisterPage
}
const analyticsModel = require('../../api/models/analytics.model')
const profileModel = require('../../api/models/profile.model')
