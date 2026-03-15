const roleModel = require('../models/role.model')
const { runRateLimitCounterCleanup, runSponsorshipExpirySweep, runWinnerSelectionForDate, toUtcDateOnly } = require('../services/scheduler.service')

const TICK_INTERVAL_MS = Number(process.env.SCHEDULER_TICK_MS || 30_000)
const SPONSORSHIP_EXPIRY_INTERVAL_MS = Number(process.env.SPONSORSHIP_EXPIRY_INTERVAL_MS || 5 * 60_000)
const RATE_LIMIT_CLEANUP_INTERVAL_MS = Number(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS || 5 * 60_000)

let lastWinnerRunDateKey = null
let lastExpirySweepAt = 0
let lastRateLimitCleanupAt = 0
let running = false

const todayKeyUtc = () => toUtcDateOnly(new Date()).toISOString().slice(0, 10)

const runTick = async () => {
  if (running) {
    return
  }

  running = true

  try {
    const now = new Date()
    const nowMs = now.getTime()
    const currentDateKey = todayKeyUtc()

    if (nowMs - lastExpirySweepAt >= SPONSORSHIP_EXPIRY_INTERVAL_MS) {
      await runSponsorshipExpirySweep(console)
      lastExpirySweepAt = nowMs
    }

    if (nowMs - lastRateLimitCleanupAt >= RATE_LIMIT_CLEANUP_INTERVAL_MS) {
      await runRateLimitCounterCleanup(console)
      lastRateLimitCleanupAt = nowMs
    }

    if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0 && lastWinnerRunDateKey !== currentDateKey) {
      await runWinnerSelectionForDate(now, console)
      lastWinnerRunDateKey = currentDateKey
    }
  } catch (error) {
    console.error('[scheduler] tick failed', error)
  } finally {
    running = false
  }
}

const start = async () => {
  await roleModel.ensureDefaultRoles()

  console.log(`[scheduler] starting worker (tick=${TICK_INTERVAL_MS}ms, expirySweep=${SPONSORSHIP_EXPIRY_INTERVAL_MS}ms, rateLimitCleanup=${RATE_LIMIT_CLEANUP_INTERVAL_MS}ms)`)

  await runSponsorshipExpirySweep(console)
  await runRateLimitCounterCleanup(console)
  await runWinnerSelectionForDate(new Date(), console)
  lastWinnerRunDateKey = todayKeyUtc()
  lastExpirySweepAt = Date.now()
  lastRateLimitCleanupAt = Date.now()

  setInterval(() => {
    void runTick()
  }, TICK_INTERVAL_MS)
}

void start().catch((error) => {
  console.error('[scheduler] fatal startup failure', error)
  process.exit(1)
})
