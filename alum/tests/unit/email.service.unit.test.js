jest.mock('../../lib/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message' })
}))

const { sendMail } = require('../../lib/mailer')
const {
  sendLosingBidNotificationEmail,
  sendOutbidNotificationEmail,
  sendWinnerNotificationEmail
} = require('../../services/email.service')

describe('email service winner notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('sends winner notification email', async () => {
    await sendWinnerNotificationEmail({
      to: 'winner@eastminster.ac.uk',
      firstName: 'Winner',
      featuredDate: '2026-03-07',
      winningBidAmount: 250
    })

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'winner@eastminster.ac.uk',
      subject: 'You won Alumni of the Day for 2026-03-07'
    }))
  })

  test('sends losing bidder notification email', async () => {
    await sendLosingBidNotificationEmail({
      to: 'loser@eastminster.ac.uk',
      firstName: 'Loser',
      featuredDate: '2026-03-07'
    })

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'loser@eastminster.ac.uk',
      subject: 'Alumni of the Day result for 2026-03-07'
    }))
  })

  test('sends outbid notification email', async () => {
    await sendOutbidNotificationEmail({
      to: 'outbid@eastminster.ac.uk',
      firstName: 'Outbid',
      bidDate: '2026-03-07'
    })

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'outbid@eastminster.ac.uk',
      subject: 'You have been outbid for 2026-03-07'
    }))
  })
})
