const prisma = require('../lib/prisma')

const CREDENTIAL_TYPES = {
  certification: 'certification',
  licence: 'licence',
  course: 'course'
}

const listCredentialsByType = async (userId, credentialType) => {
  return prisma.credential.findMany({
    where: {
      user_id: userId,
      credential_type: credentialType
    },
    orderBy: {
      completion_date: 'desc'
    }
  })
}

const createCredential = async ({
  userId,
  credentialType,
  title,
  providerName,
  credentialUrl,
  completionDate
}) => {
  return prisma.credential.create({
    data: {
      user_id: userId,
      credential_type: credentialType,
      title,
      provider_name: providerName,
      credential_url: credentialUrl,
      completion_date: completionDate
    }
  })
}

const findCredentialByIdAndType = async (userId, credentialId, credentialType) => {
  return prisma.credential.findFirst({
    where: {
      credential_id: credentialId,
      user_id: userId,
      credential_type: credentialType
    }
  })
}

const updateCredential = async (credentialId, data) => {
  return prisma.credential.update({
    where: {
      credential_id: credentialId
    },
    data
  })
}

const deleteCredential = async (credentialId) => {
  return prisma.credential.delete({
    where: {
      credential_id: credentialId
    }
  })
}

const mapCredential = (credential, variant) => {
  const base = {
    id: credential.credential_id,
    title: credential.title,
    completionDate: credential.completion_date
  }

  if (variant === CREDENTIAL_TYPES.certification) {
    return {
      ...base,
      issuingOrganisation: credential.provider_name,
      certificationUrl: credential.credential_url
    }
  }

  if (variant === CREDENTIAL_TYPES.licence) {
    return {
      ...base,
      awardingBody: credential.provider_name,
      licenceUrl: credential.credential_url
    }
  }

  return {
    ...base,
    provider: credential.provider_name,
    courseUrl: credential.credential_url
  }
}

const listCredentialVariant = async (userId, variant) => {
  const credentials = await listCredentialsByType(userId, variant)
  return credentials.map((credential) => mapCredential(credential, variant))
}

const createCredentialVariant = async (userId, variant, payload) => {
  let providerName = payload.provider
  let credentialUrl = payload.courseUrl

  if (variant === CREDENTIAL_TYPES.certification) {
    providerName = payload.issuingOrganisation
    credentialUrl = payload.certificationUrl
  } else if (variant === CREDENTIAL_TYPES.licence) {
    providerName = payload.awardingBody
    credentialUrl = payload.licenceUrl
  }

  const credential = await createCredential({
    userId,
    credentialType: variant,
    title: payload.title,
    providerName,
    credentialUrl,
    completionDate: payload.completionDate
  })

  return mapCredential(credential, variant)
}

const updateCredentialVariant = async (userId, variant, credentialId, payload) => {
  const existingCredential = await findCredentialByIdAndType(userId, credentialId, variant)

  if (!existingCredential) {
    return null
  }

  let providerName = payload.provider
  let credentialUrl = payload.courseUrl

  if (variant === CREDENTIAL_TYPES.certification) {
    providerName = payload.issuingOrganisation
    credentialUrl = payload.certificationUrl
  } else if (variant === CREDENTIAL_TYPES.licence) {
    providerName = payload.awardingBody
    credentialUrl = payload.licenceUrl
  }

  const updated = await updateCredential(credentialId, {
    title: payload.title,
    provider_name: providerName,
    credential_url: credentialUrl,
    completion_date: payload.completionDate
  })

  return mapCredential(updated, variant)
}

const deleteCredentialVariant = async (userId, variant, credentialId) => {
  const existingCredential = await findCredentialByIdAndType(userId, credentialId, variant)

  if (!existingCredential) {
    return false
  }

  await deleteCredential(credentialId)
  return true
}

const mapDegree = (degree) => {
  return {
    degreeId: degree.degree_id,
    title: degree.title,
    university: degree.university,
    degreeUrl: degree.degree_url,
    completionDate: degree.completion_date
  }
}

const mapEmployment = (employment) => {
  return {
    employmentId: employment.employment_id,
    jobTitle: employment.job_title,
    company: employment.company,
    industrySector: employment.industry_sector,
    startDate: employment.start_date,
    endDate: employment.end_date
  }
}

const listDegrees = async (userId) => {
  const degrees = await prisma.degree.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      completion_date: 'desc'
    }
  })

  return degrees.map(mapDegree)
}

const createDegree = async (userId, payload) => {
  const degree = await prisma.degree.create({
    data: {
      user_id: userId,
      title: payload.title,
      university: payload.university,
      degree_url: payload.degreeUrl,
      completion_date: payload.completionDate
    }
  })

  return mapDegree(degree)
}

const updateDegree = async (userId, degreeId, payload) => {
  const existingDegree = await prisma.degree.findFirst({
    where: {
      degree_id: degreeId,
      user_id: userId
    }
  })

  if (!existingDegree) {
    return null
  }

  const degree = await prisma.degree.update({
    where: {
      degree_id: degreeId
    },
    data: {
      title: payload.title,
      university: payload.university,
      degree_url: payload.degreeUrl,
      completion_date: payload.completionDate
    }
  })

  return mapDegree(degree)
}

const deleteDegree = async (userId, degreeId) => {
  const existingDegree = await prisma.degree.findFirst({
    where: {
      degree_id: degreeId,
      user_id: userId
    }
  })

  if (!existingDegree) {
    return false
  }

  await prisma.degree.delete({
    where: {
      degree_id: degreeId
    }
  })

  return true
}

const listEmployments = async (userId) => {
  const employments = await prisma.employment.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      start_date: 'desc'
    }
  })

  return employments.map(mapEmployment)
}

const createEmployment = async (userId, payload) => {
  const employment = await prisma.employment.create({
    data: {
      user_id: userId,
      job_title: payload.jobTitle,
      company: payload.company,
      industry_sector: payload.industrySector,
      start_date: payload.startDate,
      end_date: payload.endDate || null
    }
  })

  return {
    ...mapEmployment(employment)
  }
}

const updateEmployment = async (userId, employmentId, payload) => {
  const existingEmployment = await prisma.employment.findFirst({
    where: {
      employment_id: employmentId,
      user_id: userId
    }
  })

  if (!existingEmployment) {
    return null
  }

  const employment = await prisma.employment.update({
    where: {
      employment_id: employmentId
    },
    data: {
      job_title: payload.jobTitle,
      company: payload.company,
      industry_sector: payload.industrySector,
      start_date: payload.startDate,
      end_date: payload.endDate || null
    }
  })

  return mapEmployment(employment)
}

const deleteEmployment = async (userId, employmentId) => {
  const existingEmployment = await prisma.employment.findFirst({
    where: {
      employment_id: employmentId,
      user_id: userId
    }
  })

  if (!existingEmployment) {
    return false
  }

  await prisma.employment.delete({
    where: {
      employment_id: employmentId
    }
  })

  return true
}

const mapFullProfile = (user) => {
  const certifications = user.credentials
    .filter((credential) => credential.credential_type === CREDENTIAL_TYPES.certification)
    .map((credential) => mapCredential(credential, CREDENTIAL_TYPES.certification))

  const licences = user.credentials
    .filter((credential) => credential.credential_type === CREDENTIAL_TYPES.licence)
    .map((credential) => mapCredential(credential, CREDENTIAL_TYPES.licence))

  const courses = user.credentials
    .filter((credential) => credential.credential_type === CREDENTIAL_TYPES.course)
    .map((credential) => mapCredential(credential, CREDENTIAL_TYPES.course))

  return {
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    biography: user.profile?.biography || null,
    linkedinUrl: user.profile?.linkedin_url || null,
    profileImageUrl: user.profile?.profile_image_url || null,
    degrees: user.degrees.map(mapDegree),
    certifications,
    licences,
    courses,
    employmentHistory: user.employments.map(mapEmployment),
    createdAt: user.profile?.created_at || null,
    updatedAt: user.profile?.updated_at || null
  }
}

const getUserProfileById = async (userId, prismaClient = prisma) => {
  const user = await prismaClient.user.findUnique({
    where: {
      user_id: userId
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

  if (!user) {
    return null
  }

  return mapFullProfile(user)
}

const updateProfile = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const userUpdateData = {}

    if (Object.hasOwn(payload, 'firstName')) {
      userUpdateData.first_name = payload.firstName
    }

    if (Object.hasOwn(payload, 'lastName')) {
      userUpdateData.last_name = payload.lastName
    }

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: {
          user_id: userId
        },
        data: userUpdateData
      })
    }

    const profileUpdateData = {}

    if (Object.hasOwn(payload, 'biography')) {
      profileUpdateData.biography = payload.biography
    }

    if (Object.hasOwn(payload, 'linkedinUrl')) {
      profileUpdateData.linkedin_url = payload.linkedinUrl
    }

    if (Object.keys(profileUpdateData).length > 0) {
      await tx.profile.upsert({
        where: {
          user_id: userId
        },
        create: {
          user_id: userId,
          biography: profileUpdateData.biography || null,
          linkedin_url: profileUpdateData.linkedin_url || null
        },
        update: profileUpdateData
      })
    }

    return getUserProfileById(userId, tx)
  })
}

const replaceProfileImage = async (userId, profileImageUrl) => {
  const profile = await prisma.profile.upsert({
    where: {
      user_id: userId
    },
    create: {
      user_id: userId,
      profile_image_url: profileImageUrl
    },
    update: {
      profile_image_url: profileImageUrl
    }
  })

  return {
    profileImageUrl: profile.profile_image_url
  }
}

const deleteProfileImage = async (userId) => {
  const profile = await prisma.profile.findUnique({
    where: {
      user_id: userId
    }
  })

  if (!profile?.profile_image_url) {
    return null
  }

  const updatedProfile = await prisma.profile.update({
    where: {
      user_id: userId
    },
    data: {
      profile_image_url: null
    }
  })

  return {
    deletedImageUrl: profile.profile_image_url,
    profileImageUrl: updatedProfile.profile_image_url
  }
}

const clearProfileFields = async (userId) => {
  const profile = await prisma.profile.findUnique({
    where: {
      user_id: userId
    }
  })

  if (!profile) {
    return {
      deletedImageUrl: null
    }
  }

  const updatedProfile = await prisma.profile.update({
    where: {
      user_id: userId
    },
    data: {
      biography: null,
      linkedin_url: null,
      profile_image_url: null
    }
  })

  return {
    deletedImageUrl: profile.profile_image_url,
    profileImageUrl: updatedProfile.profile_image_url
  }
}

module.exports = {
  CREDENTIAL_TYPES,
  createDegree,
  createCredentialVariant,
  createEmployment,
  clearProfileFields,
  deleteProfileImage,
  deleteDegree,
  deleteCredentialVariant,
  deleteEmployment,
  getUserProfileById,
  listDegrees,
  listCredentialVariant,
  listEmployments,
  replaceProfileImage,
  updateProfile,
  updateDegree,
  updateEmployment,
  updateCredentialVariant
}
