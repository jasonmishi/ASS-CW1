const express = require('express')
const profileController = require('../controllers/profile.controller')
const { authenticateJwt } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  certificationBodySchema,
  certificationParamsSchema,
  courseBodySchema,
  courseParamsSchema,
  degreeBodySchema,
  degreeParamsSchema,
  employmentBodySchema,
  employmentParamsSchema,
  licenceBodySchema,
  licenceParamsSchema
} = require('../schemas/profile.schemas')

const router = express.Router()

router.get('/profile/degrees', authenticateJwt, profileController.listDegrees)
router.post('/profile/degrees', authenticateJwt, validate(degreeBodySchema), profileController.addDegree)
router.put('/profile/degrees/:degreeId', authenticateJwt, validate(degreeParamsSchema, 'params'), validate(degreeBodySchema), profileController.updateDegree)
router.delete('/profile/degrees/:degreeId', authenticateJwt, validate(degreeParamsSchema, 'params'), profileController.deleteDegree)

router.get('/profile/certifications', authenticateJwt, profileController.listCertifications)
router.post('/profile/certifications', authenticateJwt, validate(certificationBodySchema), profileController.addCertification)
router.put('/profile/certifications/:certificationId', authenticateJwt, validate(certificationParamsSchema, 'params'), validate(certificationBodySchema), profileController.updateCertification)
router.delete('/profile/certifications/:certificationId', authenticateJwt, validate(certificationParamsSchema, 'params'), profileController.deleteCertification)

router.get('/profile/licences', authenticateJwt, profileController.listLicences)
router.post('/profile/licences', authenticateJwt, validate(licenceBodySchema), profileController.addLicence)
router.put('/profile/licences/:licenceId', authenticateJwt, validate(licenceParamsSchema, 'params'), validate(licenceBodySchema), profileController.updateLicence)
router.delete('/profile/licences/:licenceId', authenticateJwt, validate(licenceParamsSchema, 'params'), profileController.deleteLicence)

router.get('/profile/courses', authenticateJwt, profileController.listCourses)
router.post('/profile/courses', authenticateJwt, validate(courseBodySchema), profileController.addCourse)
router.put('/profile/courses/:courseId', authenticateJwt, validate(courseParamsSchema, 'params'), validate(courseBodySchema), profileController.updateCourse)
router.delete('/profile/courses/:courseId', authenticateJwt, validate(courseParamsSchema, 'params'), profileController.deleteCourse)

router.get('/profile/employment', authenticateJwt, profileController.listEmployment)
router.post('/profile/employment', authenticateJwt, validate(employmentBodySchema), profileController.addEmployment)
router.put('/profile/employment/:employmentId', authenticateJwt, validate(employmentParamsSchema, 'params'), validate(employmentBodySchema), profileController.updateEmployment)
router.delete('/profile/employment/:employmentId', authenticateJwt, validate(employmentParamsSchema, 'params'), profileController.deleteEmployment)

module.exports = router
