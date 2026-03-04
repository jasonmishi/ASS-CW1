const adminModel = require('../models/admin.model')

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

module.exports = {
  createPrivilegedUser,
  listAdminUsers,
  updateUserRole
}
