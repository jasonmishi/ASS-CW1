jest.mock('../../lib/prisma', () => ({
  $transaction: jest.fn()
}))

jest.mock('../../utils/security', () => ({
  hashPassword: jest.fn(),
  isStrongPassword: jest.fn(),
  isUniversityEmail: jest.fn()
}))

const prisma = require('../../lib/prisma')
const { hashPassword, isStrongPassword, isUniversityEmail } = require('../../utils/security')
const { DEFAULT_BOOTSTRAP_ADMIN_EMAIL, ensureFirstAdmin } = require('../../lib/bootstrap-admin')

describe('bootstrap admin', () => {
  const originalEnv = { ...process.env }
  let consoleLogSpy

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    isUniversityEmail.mockReturnValue(true)
    isStrongPassword.mockReturnValue(true)
    hashPassword.mockResolvedValue('hashed-password')
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('creates first admin from env credentials when no admin exists', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'first.admin@eastminster.ac.uk'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'Strong!Pass1'

    const tx = {
      user: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ user_id: 'admin-user-1' })
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ role_id: 3, name: 'admin' })
      }
    }

    prisma.$transaction.mockImplementation(async (callback) => callback(tx))

    const result = await ensureFirstAdmin()

    expect(result).toEqual({ created: true, userId: 'admin-user-1' })
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'first.admin@eastminster.ac.uk',
        role_id: 3
      })
    }))
    expect(hashPassword).toHaveBeenCalledWith('Strong!Pass1')
  })

  test('uses fallback credentials when env is missing', async () => {
    delete process.env.BOOTSTRAP_ADMIN_EMAIL
    delete process.env.BOOTSTRAP_ADMIN_USERNAME
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD

    const tx = {
      user: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ user_id: 'admin-user-2' })
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ role_id: 3, name: 'admin' })
      }
    }

    prisma.$transaction.mockImplementation(async (callback) => callback(tx))

    await ensureFirstAdmin()

    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: DEFAULT_BOOTSTRAP_ADMIN_EMAIL
      })
    }))
  })

  test('does nothing when an admin already exists (permanent lock)', async () => {
    const tx = {
      user: {
        count: jest.fn().mockResolvedValue(1)
      },
      role: {
        findUnique: jest.fn()
      }
    }

    prisma.$transaction.mockImplementation(async (callback) => callback(tx))

    const result = await ensureFirstAdmin()

    expect(result).toEqual({ created: false })
    expect(hashPassword).not.toHaveBeenCalled()
    expect(tx.role.findUnique).not.toHaveBeenCalled()
  })

  test('fails for invalid bootstrap credentials', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@gmail.com'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'weak'
    isUniversityEmail.mockReturnValue(false)
    isStrongPassword.mockReturnValue(false)

    await expect(ensureFirstAdmin()).rejects.toThrow('Bootstrap admin email must be a valid @eastminster.ac.uk address.')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
