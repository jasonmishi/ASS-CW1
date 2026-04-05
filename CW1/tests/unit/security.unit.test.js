const {
  comparePassword,
  generateSecureToken,
  hashPassword,
  hashToken,
  isStrongPassword,
  isUniversityEmail
} = require('../../utils/security')

describe('security utils', () => {
  test('isUniversityEmail validates eastminster domain', () => {
    expect(isUniversityEmail('jane@eastminster.ac.uk')).toBe(true)
    expect(isUniversityEmail('jane@gmail.com')).toBe(false)
  })

  test('isStrongPassword enforces complexity', () => {
    expect(isStrongPassword('Strong!Pass1')).toBe(true)
    expect(isStrongPassword('weakpass')).toBe(false)
  })

  test('hashPassword and comparePassword work together', async () => {
    const plainPassword = 'Strong!Pass1'
    const hash = await hashPassword(plainPassword)

    const isMatch = await comparePassword(plainPassword, hash)
    const isWrong = await comparePassword('Wrong!Pass1', hash)

    expect(isMatch).toBe(true)
    expect(isWrong).toBe(false)
  })

  test('generateSecureToken creates random token and hashToken is deterministic', () => {
    const token = generateSecureToken(16)
    const hashOne = hashToken(token)
    const hashTwo = hashToken(token)

    expect(token).toHaveLength(32)
    expect(hashOne).toEqual(hashTwo)
  })
})
