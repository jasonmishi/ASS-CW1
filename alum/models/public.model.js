const prisma = require('../lib/prisma')
const profileModel = require('./profile.model')

const toUtcDateOnly = (dateInput) => {
  const date = new Date(dateInput)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const addUtcDays = (date, days) => {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return toUtcDateOnly(result)
}

const mapFeaturedAlumni = ({ featuredDate, profile }) => ({
  date: featuredDate,
  alumni: {
    firstName: profile.firstName,
    lastName: profile.lastName,
    biography: profile.biography,
    linkedinUrl: profile.linkedinUrl,
    profileImageUrl: profile.profileImageUrl,
    degrees: profile.degrees,
    certifications: profile.certifications,
    licences: profile.licences,
    courses: profile.courses,
    employmentHistory: profile.employmentHistory
  }
})

const getAlumniPublicProfile = async (alumniId) => {
  const user = await prisma.user.findUnique({
    where: {
      user_id: alumniId
    },
    include: {
      role: true
    }
  })

  if (!user || user.role.name !== 'alumni') {
    return null
  }

  return profileModel.getUserProfileById(alumniId)
}

const getFeaturedAlumni = async () => {
  const today = toUtcDateOnly(new Date())

  const winner = await prisma.featuredWinner.findUnique({
    where: {
      featured_date: today
    },
    select: {
      featured_date: true,
      alumni_user_id: true
    }
  })

  if (!winner) {
    return null
  }

  const profile = await getAlumniPublicProfile(winner.alumni_user_id)

  if (!profile) {
    return null
  }

  return mapFeaturedAlumni({
    featuredDate: winner.featured_date,
    profile
  })
}

const getFeaturedHistory = async ({ from, to }) => {
  const where = {}

  if (from || to) {
    where.featured_date = {}

    if (from) {
      where.featured_date.gte = toUtcDateOnly(from)
    }

    if (to) {
      where.featured_date.lt = addUtcDays(toUtcDateOnly(to), 1)
    }
  }

  const winners = await prisma.featuredWinner.findMany({
    where,
    orderBy: {
      featured_date: 'desc'
    },
    select: {
      featured_date: true,
      alumni_user_id: true
    }
  })

  const profilesByAlumniId = new Map()

  await Promise.all(winners.map(async (winner) => {
    if (!profilesByAlumniId.has(winner.alumni_user_id)) {
      const profile = await getAlumniPublicProfile(winner.alumni_user_id)
      profilesByAlumniId.set(winner.alumni_user_id, profile)
    }
  }))

  const items = winners
    .map((winner) => {
      const profile = profilesByAlumniId.get(winner.alumni_user_id)

      if (!profile) {
        return null
      }

      return mapFeaturedAlumni({
        featuredDate: winner.featured_date,
        profile
      })
    })
    .filter(Boolean)

  return items
}

module.exports = {
  getAlumniPublicProfile,
  getFeaturedAlumni,
  getFeaturedHistory
}
