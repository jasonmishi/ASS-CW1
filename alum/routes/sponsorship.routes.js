const express = require('express')
const sponsorshipController = require('../controllers/sponsorship.controller')
const { authenticateJwt, requireAdmin, requireAdminOrAlumni, requireAlumni, requireSponsor, requireSponsorOrAdmin } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  createSponsorOrganizationBodySchema,
  createSponsorshipOfferBodySchema,
  listMySponsorshipOffersQuerySchema,
  listSponsorableCredentialsQuerySchema,
  listSponsorOrganizationsQuerySchema,
  sponsorOrganizationParamsSchema,
  listSponsorshipOffersQuerySchema,
  listSponsorshipPayoutsQuerySchema,
  sponsorshipOfferParamsSchema,
  sponsorshipOfferResponseBodySchema,
  sponsorshipPayoutParamsSchema,
  sponsorOrganizationUserParamsSchema,
  updateSponsorOrganizationBodySchema
} = require('../schemas/sponsorship.schemas')

const router = express.Router()

router.post('/sponsorships/organizations', authenticateJwt, requireAdmin, validate(createSponsorOrganizationBodySchema), sponsorshipController.createSponsorOrganization)
router.get('/sponsorships/organizations', authenticateJwt, requireAdmin, validate(listSponsorOrganizationsQuerySchema, 'query'), sponsorshipController.listSponsorOrganizations)
router.get('/sponsorships/organizations/me', authenticateJwt, sponsorshipController.getMySponsorOrganization)
router.delete('/sponsorships/organizations/me', authenticateJwt, sponsorshipController.leaveMySponsorOrganization)
router.get('/sponsorships/organizations/:sponsorOrgId', authenticateJwt, requireAdmin, validate(sponsorOrganizationParamsSchema, 'params'), sponsorshipController.getSponsorOrganization)
router.put('/sponsorships/organizations/:sponsorOrgId', authenticateJwt, requireAdmin, validate(sponsorOrganizationParamsSchema, 'params'), validate(updateSponsorOrganizationBodySchema), sponsorshipController.updateSponsorOrganization)
router.delete('/sponsorships/organizations/:sponsorOrgId', authenticateJwt, requireAdmin, validate(sponsorOrganizationParamsSchema, 'params'), sponsorshipController.deleteSponsorOrganization)
router.get('/sponsorships/organizations/:sponsorOrgId/users', authenticateJwt, requireSponsorOrAdmin, validate(sponsorOrganizationParamsSchema, 'params'), sponsorshipController.listSponsorOrganizationUsers)
router.put('/sponsorships/organizations/:sponsorOrgId/users/:userId', authenticateJwt, requireAdmin, validate(sponsorOrganizationUserParamsSchema, 'params'), sponsorshipController.assignSponsorUserToOrganization)
router.delete('/sponsorships/organizations/:sponsorOrgId/users/:userId', authenticateJwt, requireAdmin, validate(sponsorOrganizationUserParamsSchema, 'params'), sponsorshipController.removeUserFromSponsorOrganization)

router.post('/sponsorships/offers', authenticateJwt, requireSponsorOrAdmin, validate(createSponsorshipOfferBodySchema), sponsorshipController.createSponsorshipOffer)
router.get('/sponsorships/offers', authenticateJwt, requireSponsor, validate(listSponsorshipOffersQuerySchema, 'query'), sponsorshipController.listSponsorshipOffers)
router.get('/sponsorships/alumni/credentials', authenticateJwt, requireSponsorOrAdmin, validate(listSponsorableCredentialsQuerySchema, 'query'), sponsorshipController.listSponsorableAlumniCredentials)
router.get('/sponsorships/offers/me', authenticateJwt, requireAlumni, validate(listMySponsorshipOffersQuerySchema, 'query'), sponsorshipController.listMySponsorshipOffers)
router.get('/sponsorships/offers/:offerId', authenticateJwt, validate(sponsorshipOfferParamsSchema, 'params'), sponsorshipController.getSponsorshipOffer)
router.delete('/sponsorships/offers/:offerId', authenticateJwt, requireSponsorOrAdmin, validate(sponsorshipOfferParamsSchema, 'params'), sponsorshipController.deleteSponsorshipOffer)
router.put('/sponsorships/offers/:offerId/response', authenticateJwt, requireAlumni, validate(sponsorshipOfferParamsSchema, 'params'), validate(sponsorshipOfferResponseBodySchema), sponsorshipController.setSponsorshipOfferResponse)

router.get('/sponsorships/balance', authenticateJwt, requireAlumni, sponsorshipController.getMySponsorshipBalance)

router.get('/sponsorships/payouts', authenticateJwt, requireAdminOrAlumni, validate(listSponsorshipPayoutsQuerySchema, 'query'), sponsorshipController.listSponsorshipPayouts)
router.get('/sponsorships/payouts/:payoutId', authenticateJwt, requireAdminOrAlumni, validate(sponsorshipPayoutParamsSchema, 'params'), sponsorshipController.getSponsorshipPayout)

module.exports = router
