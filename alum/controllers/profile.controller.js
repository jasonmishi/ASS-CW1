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

module.exports = {
  addCertification: addVariant(profileModel.CREDENTIAL_TYPES.certification, 'Certification'),
  addCourse: addVariant(profileModel.CREDENTIAL_TYPES.course, 'Course'),
  addLicence: addVariant(profileModel.CREDENTIAL_TYPES.licence, 'Licence'),
  deleteCertification: deleteVariant(profileModel.CREDENTIAL_TYPES.certification, 'certificationId', 'Certification'),
  deleteCourse: deleteVariant(profileModel.CREDENTIAL_TYPES.course, 'courseId', 'Course'),
  deleteLicence: deleteVariant(profileModel.CREDENTIAL_TYPES.licence, 'licenceId', 'Licence'),
  listCertifications: listVariant(profileModel.CREDENTIAL_TYPES.certification),
  listCourses: listVariant(profileModel.CREDENTIAL_TYPES.course),
  listLicences: listVariant(profileModel.CREDENTIAL_TYPES.licence),
  updateCertification: updateVariant(profileModel.CREDENTIAL_TYPES.certification, 'certificationId', 'Certification'),
  updateCourse: updateVariant(profileModel.CREDENTIAL_TYPES.course, 'courseId', 'Course'),
  updateLicence: updateVariant(profileModel.CREDENTIAL_TYPES.licence, 'licenceId', 'Licence')
}
