const express = require('express')
const biddingController = require('../controllers/bidding.controller')
const { authenticateJwt, requireAlumni } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const {
  bidBodySchema,
  bidParamsSchema,
  bidSummaryQuerySchema,
  listBidsQuerySchema
} = require('../schemas/bidding.schemas')

const router = express.Router()

router.post('/bids', authenticateJwt, requireAlumni, validate(bidBodySchema), biddingController.placeBid)
router.get('/bids', authenticateJwt, requireAlumni, validate(listBidsQuerySchema, 'query'), biddingController.listMyBids)
router.get('/bids/summary', authenticateJwt, requireAlumni, validate(bidSummaryQuerySchema, 'query'), biddingController.getMonthlyBidSummary)
router.get('/bids/current', authenticateJwt, requireAlumni, biddingController.getCurrentBid)
router.get('/bids/:bidId', authenticateJwt, requireAlumni, validate(bidParamsSchema, 'params'), biddingController.getBidById)
router.patch('/bids/:bidId', authenticateJwt, requireAlumni, validate(bidParamsSchema, 'params'), validate(bidBodySchema), biddingController.updateBid)

module.exports = router
