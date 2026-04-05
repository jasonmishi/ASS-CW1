const { signUserToken, verifyToken } = require('../../utils/jwt')

describe('jwt utils', () => {
  test('signUserToken returns verifiable token payload', () => {
    const user = {
      user_id: 'user_123',
      email: 'jane@eastminster.ac.uk',
      role: {
        name: 'admin'
      }
    }

    const signed = signUserToken(user)
    const payload = verifyToken(signed.token)

    expect(payload.sub).toBe(user.user_id)
    expect(payload.email).toBe(user.email)
    expect(payload.role).toBe('admin')
    expect(signed.expiresIn).toBeGreaterThan(0)
  })
})
