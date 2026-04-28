const emailService = require('./email.service')

const sendOutbidNotifications = async (notificationContext) => {
  if (!notificationContext?.outbidBids?.length) {
    return
  }

  const seenAlumni = new Set()
  const tasks = []

  for (const bid of notificationContext.outbidBids) {
    const alumniId = bid.alumni_user_id

    if (!bid.alumni?.email || !alumniId || seenAlumni.has(alumniId)) {
      continue
    }

    seenAlumni.add(alumniId)
    tasks.push(emailService.sendOutbidNotificationEmail({
      to: bid.alumni.email,
      firstName: bid.alumni.first_name,
      bidDate: notificationContext.bidDate
    }))
  }

  if (tasks.length === 0) {
    return
  }

  const settled = await Promise.allSettled(tasks)
  const failures = settled.filter((result) => result.status === 'rejected')

  if (failures.length > 0) {
    console.warn(`[notifications] outbid emails failed for ${failures.length} recipient(s)`)
  }
}

const sendWinnerSelectionNotifications = async (notificationContext) => {
  if (!notificationContext) {
    return
  }

  const tasks = []

  if (notificationContext.winnerBid?.alumni?.email) {
    tasks.push(emailService.sendWinnerNotificationEmail({
      to: notificationContext.winnerBid.alumni.email,
      firstName: notificationContext.winnerBid.alumni.first_name,
      featuredDate: notificationContext.featuredDate,
      winningBidAmount: notificationContext.winningBidAmount
    }))
  }

  const seenLoserAlumni = new Set()

  for (const bid of notificationContext.losingBids || []) {
    const alumniId = bid.alumni_user_id

    if (!bid.alumni?.email || !alumniId || seenLoserAlumni.has(alumniId)) {
      continue
    }

    seenLoserAlumni.add(alumniId)
    tasks.push(emailService.sendLosingBidNotificationEmail({
      to: bid.alumni.email,
      firstName: bid.alumni.first_name,
      featuredDate: notificationContext.featuredDate
    }))
  }

  if (tasks.length === 0) {
    return
  }

  const settled = await Promise.allSettled(tasks)
  const failures = settled.filter((result) => result.status === 'rejected')

  if (failures.length > 0) {
    console.warn(`[notifications] winner selection emails failed for ${failures.length} recipient(s)`)
  }
}

module.exports = {
  sendOutbidNotifications,
  sendWinnerSelectionNotifications
}
