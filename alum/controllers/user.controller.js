const userModel = require('../models/user.model')

const listUsers = async (req, res) => {
  const users = await userModel.listUsers()
  res.json({
    success: true,
    data: users
  })
}

module.exports = {
  listUsers
}
