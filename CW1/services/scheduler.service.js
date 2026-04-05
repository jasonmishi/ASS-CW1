const biddingModel = require('../models/bidding.model')
const sponsorshipModel = require('../models/sponsorship.model')
const adminModel = require('../models/admin.model')
const biddingNotificationService = require('./bidding-notification.service')
const prisma = require('../lib/prisma')

const toUtcDateOnly = (dateInput) => {
  const date = new Date(dateInput)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const dateKey = (dateInput) => {
  const date = toUtcDateOnly(dateInput)
  return date.toISOString().slice(0, 10)
}

const runWinnerSelectionForDate = async (dateInput, logger = console) => {
  const date = toUtcDateOnly(dateInput)
  const selectedByUserId = await adminModel.getOrCreateSystemSchedulerAdminUserId()
  const result = await biddingModel.createWinner({
    date,
    selectedByUserId
  })

  if (!result.ok) {
    if (result.reason === 'already_exists') {
      logger.info(`[scheduler] winner already exists for ${dateKey(date)}`)
      return {
        ok: true,
        action: 'already_exists'
      }
    }

    if (result.reason === 'no_bids') {
      logger.info(`[scheduler] no bids found for ${dateKey(date)}`)
      return {
        ok: true,
        action: 'no_bids'
      }
    }

    if (result.reason === 'monthly_limit') {
      logger.warn(`[scheduler] winner skipped for ${dateKey(date)} due to monthly limit`)
      return {
        ok: true,
        action: 'monthly_limit'
      }
    }

    throw new Error(`Unexpected winner selection failure: ${result.reason || 'unknown'}`)
  }

  await biddingNotificationService.sendWinnerSelectionNotifications(result.notificationContext)

  logger.info(`[scheduler] winner created for ${dateKey(date)} (winnerId=${result.winner.winnerId})`)

  return {
    ok: true,
    action: 'created',
    winner: result.winner
  }
}

const runSponsorshipExpirySweep = async (logger = console) => {
  const expiredCount = await sponsorshipModel.expirePendingSponsorshipOffers()

  logger.info(`[scheduler] sponsorship expiry sweep completed: expired=${expiredCount}`)

  return {
    ok: true,
    expiredCount
  }
}

const runRateLimitCounterCleanup = async (logger = console) => {
  const result = await prisma.rateLimitCounter.deleteMany({
    where: {
      expires_at: {
        lt: new Date()
      }
    }
  })

  logger.info(`[scheduler] rate limit counter cleanup completed: deleted=${result.count}`)

  return {
    ok: true,
    deletedCount: result.count
  }
}

module.exports = {
  runRateLimitCounterCleanup,
  runSponsorshipExpirySweep,
  runWinnerSelectionForDate,
  toUtcDateOnly
}
