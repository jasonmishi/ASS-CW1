const analyticsModel = require('../models/analytics.model')

const getAlumniDashboard = async (req, res) => {
  const query = req.validated?.query || req.query
  const data = await analyticsModel.getAlumniDashboardAnalytics(query)

  return res.status(200).json({
    success: true,
    data
  })
}

const getAlumniDirectory = async (req, res) => {
  const query = req.validated?.query || req.query
  const data = await analyticsModel.getAlumniDirectoryAnalytics(query)

  return res.status(200).json({
    success: true,
    data
  })
}

module.exports = {
  getAlumniDirectory,
  getAlumniDashboard
}
