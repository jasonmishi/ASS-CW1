const prisma = require('../lib/prisma')

const fetchAlumniUsers = async () => prisma.user.findMany({
  where: {
    role: {
      name: 'alumni'
    }
  },
  include: {
    profile: true,
    degrees: {
      orderBy: {
        completion_date: 'desc'
      }
    },
    credentials: {
      orderBy: {
        completion_date: 'desc'
      }
    },
    employments: {
      orderBy: {
        start_date: 'desc'
      }
    }
  }
})

module.exports = {
  fetchAlumniUsers
}
