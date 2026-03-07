const biddingModel = require('../models/bidding.model')
const biddingNotificationService = require('../services/bidding-notification.service')

const placeBid = async (req, res) => {
  const result = await biddingModel.placeBid({
    alumniUserId: req.user.user_id,
    amount: req.body.amount
  })

  if (!result.ok && result.reason === 'already_exists') {
    return res.status(400).json({
      success: false,
      message: 'You already have a bid for the current window. Use update instead.'
    })
  }

  if (!result.ok && result.reason === 'monthly_limit') {
    return res.status(403).json({
      success: false,
      message: `You have reached the maximum number of wins (${result.maxWinsAllowed}) for this month. Attend a university event to unlock 1 additional slot.`
    })
  }

  if (!result.ok && result.reason === 'insufficient_funds') {
    return res.status(403).json({
      success: false,
      message: `Insufficient sponsorship funds. Your available balance is £${result.availableBalance.toFixed(2)} but you attempted to bid £${Number(req.body.amount).toFixed(2)}.`
    })
  }

  await biddingNotificationService.sendOutbidNotifications(result.notificationContext)

  return res.status(201).json({
    success: true,
    message: 'Bid placed successfully.',
    data: result.bid
  })
}

const listMyBids = async (req, res) => {
  const query = req.validated?.query || req.query

  const bids = await biddingModel.listMyBids({
    alumniUserId: req.user.user_id,
    month: query.month
  })

  return res.status(200).json({
    success: true,
    data: bids
  })
}

const getBidById = async (req, res) => {
  const bid = await biddingModel.getBidById({
    alumniUserId: req.user.user_id,
    bidId: req.params.bidId
  })

  if (!bid) {
    return res.status(404).json({
      success: false,
      message: 'Bid not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: bid
  })
}

const updateBid = async (req, res) => {
  const result = await biddingModel.updateBid({
    alumniUserId: req.user.user_id,
    bidId: req.params.bidId,
    amount: req.body.amount
  })

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'Bid not found.'
    })
  }

  if (!result.ok && result.reason === 'closed') {
    return res.status(400).json({
      success: false,
      message: 'Bidding window has closed for this bid.'
    })
  }

  if (!result.ok && result.reason === 'must_increase') {
    return res.status(400).json({
      success: false,
      message: `New bid amount must be greater than your current bid of £${result.currentAmount.toFixed(2)}.`
    })
  }

  if (!result.ok && result.reason === 'insufficient_funds') {
    return res.status(403).json({
      success: false,
      message: `Insufficient sponsorship funds. Your available balance is £${result.availableBalance.toFixed(2)} but you attempted to bid £${Number(req.body.amount).toFixed(2)}.`
    })
  }

  await biddingNotificationService.sendOutbidNotifications(result.notificationContext)

  return res.status(200).json({
    success: true,
    message: 'Bid updated successfully.',
    data: result.bid
  })
}

const getMonthlyBidSummary = async (req, res) => {
  const query = req.validated?.query || req.query

  const summary = await biddingModel.getMonthlySummary({
    alumniUserId: req.user.user_id,
    month: query.month
  })

  return res.status(200).json({
    success: true,
    data: summary
  })
}

const getCurrentBid = async (req, res) => {
  const currentBid = await biddingModel.getCurrentBid({
    alumniUserId: req.user.user_id
  })

  return res.status(200).json({
    success: true,
    data: currentBid
  })
}

module.exports = {
  getBidById,
  getCurrentBid,
  getMonthlyBidSummary,
  listMyBids,
  placeBid,
  updateBid
}
