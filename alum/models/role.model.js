const prisma = require('../lib/prisma')

const DEFAULT_ROLES = ['alumni', 'developer', 'admin']

const ensureDefaultRoles = async () => {
  for (const roleName of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName }
    })
  }
}

const findRoleByName = async (name) => {
  return prisma.role.findUnique({
    where: { name }
  })
}

module.exports = {
  ensureDefaultRoles,
  findRoleByName
}
