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

module.exports = {
  CREDENTIAL_TYPES,
  createCredentialVariant,
  deleteCredentialVariant,
  listCredentialVariant,
  updateCredentialVariant
}
