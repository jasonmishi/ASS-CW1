const publicModel = require('../models/public.model')

const getFeaturedAlumni = async (_req, res) => {
  const featured = await publicModel.getFeaturedAlumni()

  if (!featured) {
    return res.status(404).json({
      success: false,
      message: 'No Alumni of the Day has been selected for today.'
    })
  }

  return res.status(200).json({
    success: true,
    data: featured
  })
}

const getFeaturedHistory = async (req, res) => {
  const query = req.validated?.query || req.query

  const items = await publicModel.getFeaturedHistory({
    from: query.from,
    to: query.to
  })

  return res.status(200).json({
    success: true,
    data: items
  })
}

const getAlumniPublicProfile = async (req, res) => {
  const profile = await publicModel.getAlumniPublicProfile(req.params.alumniId)

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Alumni profile not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: profile
  })
}

module.exports = {
  getAlumniPublicProfile,
  getFeaturedAlumni,
  getFeaturedHistory
}
