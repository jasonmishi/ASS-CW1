const express = require('express')
const fs = require('node:fs')
const path = require('node:path')
const multer = require('multer')
const profileController = require('../controllers/profile.controller')
const { authenticateJwt, requireAlumni } = require('../middleware/auth.middleware')
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
  licenceParamsSchema,
  profileUpdateBodySchema
} = require('../schemas/profile.schemas')

const router = express.Router()
const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'profiles')
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname || '') || '.jpg'
      cb(null, `${req.user.user_id}-${Date.now()}${extension.toLowerCase()}`)
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      return cb(null, true)
    }

    return cb(new Error('INVALID_FILE_TYPE'))
  }
})

const uploadProfileImage = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      return next()
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors: [{
          field: 'image',
          message: 'File size must be 5 MB or less.'
        }]
      })
    }

    if (error.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors: [{
          field: 'image',
          message: 'Only JPEG, PNG, or WebP images are allowed.'
        }]
      })
    }

    return next(error)
  })
}

router.get('/profile', authenticateJwt, requireAlumni, profileController.getMyProfile)
router.put('/profile', authenticateJwt, requireAlumni, validate(profileUpdateBodySchema), profileController.updateProfile)
router.delete('/profile', authenticateJwt, requireAlumni, profileController.clearProfile)

router.put('/profile/image', authenticateJwt, requireAlumni, uploadProfileImage, profileController.replaceProfileImage)
router.delete('/profile/image', authenticateJwt, requireAlumni, profileController.deleteProfileImage)

router.get('/profile/degrees', authenticateJwt, requireAlumni, profileController.listDegrees)
router.post('/profile/degrees', authenticateJwt, requireAlumni, validate(degreeBodySchema), profileController.addDegree)
router.put('/profile/degrees/:degreeId', authenticateJwt, requireAlumni, validate(degreeParamsSchema, 'params'), validate(degreeBodySchema), profileController.updateDegree)
router.delete('/profile/degrees/:degreeId', authenticateJwt, requireAlumni, validate(degreeParamsSchema, 'params'), profileController.deleteDegree)

router.get('/profile/certifications', authenticateJwt, requireAlumni, profileController.listCertifications)
router.post('/profile/certifications', authenticateJwt, requireAlumni, validate(certificationBodySchema), profileController.addCertification)
router.put('/profile/certifications/:certificationId', authenticateJwt, requireAlumni, validate(certificationParamsSchema, 'params'), validate(certificationBodySchema), profileController.updateCertification)
router.delete('/profile/certifications/:certificationId', authenticateJwt, requireAlumni, validate(certificationParamsSchema, 'params'), profileController.deleteCertification)

router.get('/profile/licences', authenticateJwt, requireAlumni, profileController.listLicences)
router.post('/profile/licences', authenticateJwt, requireAlumni, validate(licenceBodySchema), profileController.addLicence)
router.put('/profile/licences/:licenceId', authenticateJwt, requireAlumni, validate(licenceParamsSchema, 'params'), validate(licenceBodySchema), profileController.updateLicence)
router.delete('/profile/licences/:licenceId', authenticateJwt, requireAlumni, validate(licenceParamsSchema, 'params'), profileController.deleteLicence)

router.get('/profile/courses', authenticateJwt, requireAlumni, profileController.listCourses)
router.post('/profile/courses', authenticateJwt, requireAlumni, validate(courseBodySchema), profileController.addCourse)
router.put('/profile/courses/:courseId', authenticateJwt, requireAlumni, validate(courseParamsSchema, 'params'), validate(courseBodySchema), profileController.updateCourse)
router.delete('/profile/courses/:courseId', authenticateJwt, requireAlumni, validate(courseParamsSchema, 'params'), profileController.deleteCourse)

router.get('/profile/employment', authenticateJwt, requireAlumni, profileController.listEmployment)
router.post('/profile/employment', authenticateJwt, requireAlumni, validate(employmentBodySchema), profileController.addEmployment)
router.put('/profile/employment/:employmentId', authenticateJwt, requireAlumni, validate(employmentParamsSchema, 'params'), validate(employmentBodySchema), profileController.updateEmployment)
router.delete('/profile/employment/:employmentId', authenticateJwt, requireAlumni, validate(employmentParamsSchema, 'params'), profileController.deleteEmployment)

module.exports = router
