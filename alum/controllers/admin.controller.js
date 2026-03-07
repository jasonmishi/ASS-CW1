const adminModel = require('../models/admin.model')
const biddingModel = require('../models/bidding.model')

const createPrivilegedUser = async (req, res) => {
  const result = await adminModel.createPrivilegedUser(req.body)

  if (!result.ok && result.reason === 'duplicate') {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.'
    })
  }

  if (!result.ok && result.reason === 'role_not_found') {
    return res.status(400).json({
      success: false,
      message: 'Invalid role.'
    })
  }

  return res.status(201).json({
    success: true,
    message: 'User created successfully.',
    data: result.user
  })
}

const listAdminUsers = async (req, res) => {
  const users = await adminModel.listAdminUsers()

  return res.status(200).json({
    success: true,
    data: users
  })
}

const updateUserRole = async (req, res) => {
  const { userId } = req.params
  const { role } = req.body

  const result = await adminModel.updateUserRole(userId, role)

  if (!result.ok && result.reason === 'user_not_found') {
    return res.status(404).json({
      success: false,
      message: 'User not found.'
    })
  }

  if (!result.ok && result.reason === 'role_not_found') {
    return res.status(400).json({
      success: false,
      message: 'Invalid role.'
    })
  }

  if (!result.ok && result.reason === 'last_admin_demotion') {
    return res.status(400).json({
      success: false,
      message: 'The last remaining Admin cannot be demoted.'
    })
  }

  return res.status(200).json({
    success: true,
    message: `User role updated to ${result.role}.`
  })
}

const createWinner = async (req, res) => {
  const result = await biddingModel.createWinner({
    date: req.body.date,
    selectedByUserId: req.user.user_id
  })

  if (!result.ok && result.reason === 'already_exists') {
    return res.status(400).json({
      success: false,
      message: 'Winner already exists for this date.'
    })
  }

  if (!result.ok && result.reason === 'no_bids') {
    return res.status(400).json({
      success: false,
      message: 'No bids exist for this date.'
    })
  }

  if (!result.ok && result.reason === 'monthly_limit') {
    return res.status(400).json({
      success: false,
      message: `Cannot create winner because the selected alumni has reached the monthly win limit (${result.maxWinsAllowed}).`
    })
  }

  return res.status(201).json({
    success: true,
    message: `Winner created for ${req.body.date.toISOString().slice(0, 10)}.`,
    data: result.winner
  })
}

const listWinners = async (req, res) => {
  const query = req.validated?.query || req.query

  const winners = await biddingModel.listWinners({
    month: query.month
  })

  return res.status(200).json({
    success: true,
    data: winners
  })
}

const recordEventAttendance = async (req, res) => {
  const result = await biddingModel.recordEventAttendance({
    alumniUserId: req.body.alumniId,
    eventName: req.body.eventName,
    eventDate: req.body.eventDate,
    recordedByUserId: req.user.user_id
  })

  if (!result.ok && result.reason === 'alumni_not_found') {
    return res.status(404).json({
      success: false,
      message: 'Alumni user not found.'
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Event attendance recorded. Alumni now has 4 available slots this month.'
  })
}

module.exports = {
  createPrivilegedUser,
  createWinner,
  listAdminUsers,
  listWinners,
  recordEventAttendance,
  updateUserRole
}
