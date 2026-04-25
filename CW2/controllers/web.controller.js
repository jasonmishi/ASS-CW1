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
    analyticsEndpoint: '/api/v1/analytics/alumni-dashboard'
  })
}

module.exports = {
  renderAnalyticsDashboard,
  renderLoginPage
}
