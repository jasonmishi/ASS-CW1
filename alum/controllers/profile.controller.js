const profileModel = require('../models/profile.model')

const listVariant = (variant) => {
  return async (req, res) => {
    const credentials = await profileModel.listCredentialVariant(req.user.user_id, variant)
    return res.status(200).json({
      success: true,
      data: credentials
    })
  }
}

const addVariant = (variant, entityName) => {
  return async (req, res) => {
    const created = await profileModel.createCredentialVariant(req.user.user_id, variant, req.body)
    return res.status(201).json({
      success: true,
      message: `${entityName} added successfully.`,
      data: created
    })
  }
}

const updateVariant = (variant, idParam, entityName) => {
  return async (req, res) => {
    const updated = await profileModel.updateCredentialVariant(
      req.user.user_id,
      variant,
      req.params[idParam],
      req.body
    )

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `${entityName} not found.`
      })
    }

    return res.status(200).json({
      success: true,
      message: `${entityName} updated successfully.`,
      data: updated
    })
  }
}

const deleteVariant = (variant, idParam, entityName) => {
  return async (req, res) => {
    const deleted = await profileModel.deleteCredentialVariant(
      req.user.user_id,
      variant,
      req.params[idParam]
    )

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `${entityName} not found.`
      })
    }

    return res.status(204).send()
  }
}

const listDegrees = async (req, res) => {
  const degrees = await profileModel.listDegrees(req.user.user_id)
  return res.status(200).json({
    success: true,
    data: degrees
  })
}

const addDegree = async (req, res) => {
  const created = await profileModel.createDegree(req.user.user_id, req.body)
  return res.status(201).json({
    success: true,
    message: 'Degree added successfully.',
    data: created
  })
}

const updateDegree = async (req, res) => {
  const updated = await profileModel.updateDegree(req.user.user_id, req.params.degreeId, req.body)

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: 'Degree not found.'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Degree updated successfully.',
    data: updated
  })
}

const deleteDegree = async (req, res) => {
  const deleted = await profileModel.deleteDegree(req.user.user_id, req.params.degreeId)

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Degree not found.'
    })
  }

  return res.status(204).send()
}

const listEmployment = async (req, res) => {
  const employments = await profileModel.listEmployments(req.user.user_id)
  return res.status(200).json({
    success: true,
    data: employments
  })
}

const addEmployment = async (req, res) => {
  const created = await profileModel.createEmployment(req.user.user_id, req.body)
  return res.status(201).json({
    success: true,
    message: 'Employment entry added successfully.',
    data: created
  })
}

const updateEmployment = async (req, res) => {
  const updated = await profileModel.updateEmployment(
    req.user.user_id,
    req.params.employmentId,
    req.body
  )

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: 'Employment not found.'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Employment entry updated successfully.',
    data: updated
  })
}

const deleteEmployment = async (req, res) => {
  const deleted = await profileModel.deleteEmployment(req.user.user_id, req.params.employmentId)

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Employment not found.'
    })
  }

  return res.status(204).send()
}

module.exports = {
  addDegree,
  addCertification: addVariant(profileModel.CREDENTIAL_TYPES.certification, 'Certification'),
  addCourse: addVariant(profileModel.CREDENTIAL_TYPES.course, 'Course'),
  addEmployment,
  addLicence: addVariant(profileModel.CREDENTIAL_TYPES.licence, 'Licence'),
  deleteDegree,
  deleteCertification: deleteVariant(profileModel.CREDENTIAL_TYPES.certification, 'certificationId', 'Certification'),
  deleteCourse: deleteVariant(profileModel.CREDENTIAL_TYPES.course, 'courseId', 'Course'),
  deleteEmployment,
  deleteLicence: deleteVariant(profileModel.CREDENTIAL_TYPES.licence, 'licenceId', 'Licence'),
  listDegrees,
  listCertifications: listVariant(profileModel.CREDENTIAL_TYPES.certification),
  listCourses: listVariant(profileModel.CREDENTIAL_TYPES.course),
  listEmployment,
  listLicences: listVariant(profileModel.CREDENTIAL_TYPES.licence),
  updateDegree,
  updateCertification: updateVariant(profileModel.CREDENTIAL_TYPES.certification, 'certificationId', 'Certification'),
  updateCourse: updateVariant(profileModel.CREDENTIAL_TYPES.course, 'courseId', 'Course'),
  updateEmployment,
  updateLicence: updateVariant(profileModel.CREDENTIAL_TYPES.licence, 'licenceId', 'Licence')
}
