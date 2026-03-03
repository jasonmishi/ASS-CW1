const { disconnectDatabase, resetDatabase } = require('./helpers/test-db')

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await disconnectDatabase()
})
