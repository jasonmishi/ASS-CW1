const express = require('express')
const publicController = require('../controllers/public.controller')
const { authenticateApiClient, recordApiClientUsage } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { alumniParamsSchema, publicHistoryQuerySchema } = require('../schemas/public.schemas')

const router = express.Router()

router.get('/public/alumni/featured', authenticateApiClient, recordApiClientUsage, publicController.getFeaturedAlumni)
router.get('/public/alumni/featured/history', authenticateApiClient, recordApiClientUsage, validate(publicHistoryQuerySchema, 'query'), publicController.getFeaturedHistory)
router.get('/public/alumni/:alumniId', authenticateApiClient, recordApiClientUsage, validate(alumniParamsSchema, 'params'), publicController.getAlumniPublicProfile)

module.exports = router
