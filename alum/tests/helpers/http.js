const request = require('supertest')
const app = require('../../app')

const api = () => request(app)

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`
})

module.exports = {
  api,
  authHeader
}
