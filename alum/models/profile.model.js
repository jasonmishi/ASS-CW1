const prisma = require('../lib/prisma')

const CREDENTIAL_TYPES = {
  certification: 'certification',
  licence: 'license',
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
  const providerName = variant === CREDENTIAL_TYPES.certification
    ? payload.issuingOrganisation
    : variant === CREDENTIAL_TYPES.licence
      ? payload.awardingBody
      : payload.provider

  const credentialUrl = variant === CREDENTIAL_TYPES.certification
    ? payload.certificationUrl
    : variant === CREDENTIAL_TYPES.licence
      ? payload.licenceUrl
      : payload.courseUrl

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

  const providerName = variant === CREDENTIAL_TYPES.certification
    ? payload.issuingOrganisation
    : variant === CREDENTIAL_TYPES.licence
      ? payload.awardingBody
      : payload.provider

  const credentialUrl = variant === CREDENTIAL_TYPES.certification
    ? payload.certificationUrl
    : variant === CREDENTIAL_TYPES.licence
      ? payload.licenceUrl
      : payload.courseUrl

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

  return employments.map((employment) => ({
    employmentId: employment.employment_id,
    jobTitle: employment.job_title,
    company: employment.company,
    startDate: employment.start_date,
    endDate: employment.end_date
  }))
}

const createEmployment = async (userId, payload) => {
  const employment = await prisma.employment.create({
    data: {
      user_id: userId,
      job_title: payload.jobTitle,
      company: payload.company,
      start_date: payload.startDate,
      end_date: payload.endDate || null
    }
  })

  return {
    employmentId: employment.employment_id,
    jobTitle: employment.job_title,
    company: employment.company,
    startDate: employment.start_date,
    endDate: employment.end_date
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
      start_date: payload.startDate,
      end_date: payload.endDate || null
    }
  })

  return {
    employmentId: employment.employment_id,
    jobTitle: employment.job_title,
    company: employment.company,
    startDate: employment.start_date,
    endDate: employment.end_date
  }
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

module.exports = {
  CREDENTIAL_TYPES,
  createDegree,
  createCredentialVariant,
  createEmployment,
  deleteDegree,
  deleteCredentialVariant,
  deleteEmployment,
  listDegrees,
  listCredentialVariant,
  listEmployments,
  updateDegree,
  updateEmployment,
  updateCredentialVariant
}
