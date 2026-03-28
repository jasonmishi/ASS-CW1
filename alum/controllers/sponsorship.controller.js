const sponsorshipModel = require('../models/sponsorship.model')

const createSponsorOrganization = async (req, res) => {
  const organization = await sponsorshipModel.createSponsorOrganization(req.body)

  return res.status(201).json({
    success: true,
    message: 'Sponsor organization created successfully.',
    data: organization
  })
}

const listSponsorOrganizations = async (req, res) => {
  const data = await sponsorshipModel.listSponsorOrganizations()

  return res.status(200).json({
    success: true,
    data
  })
}

const getSponsorOrganization = async (req, res) => {
  const organization = await sponsorshipModel.getSponsorOrganizationById(req.params.sponsorOrgId)

  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Sponsor organization not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: organization
  })
}

const updateSponsorOrganization = async (req, res) => {
  const result = await sponsorshipModel.updateSponsorOrganization({
    sponsorOrgId: req.params.sponsorOrgId,
    ...req.body
  })

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'Sponsor organization not found.'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Sponsor organization updated successfully.',
    data: result.organization
  })
}

const deleteSponsorOrganization = async (req, res) => {
  const result = await sponsorshipModel.deleteSponsorOrganization(req.params.sponsorOrgId)

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'Sponsor organization not found.'
    })
  }

  return res.status(204).send()
}

const assignSponsorUserToOrganization = async (req, res) => {
  const result = await sponsorshipModel.assignSponsorUserToOrganization({
    userId: req.params.userId,
    sponsorOrgId: req.params.sponsorOrgId
  })

  if (!result.ok && result.reason === 'user_not_found') {
    return res.status(404).json({
      success: false,
      message: 'User not found.'
    })
  }

  if (!result.ok && result.reason === 'sponsor_org_not_found') {
    return res.status(404).json({
      success: false,
      message: 'Sponsor organization not found.'
    })
  }

  if (!result.ok && result.reason === 'user_not_sponsor') {
    return res.status(400).json({
      success: false,
      message: 'Only users with Sponsor role can be assigned to a sponsor organization.'
    })
  }

  if (!result.ok && result.reason === 'user_already_assigned') {
    return res.status(400).json({
      success: false,
      message: 'User is already assigned to a sponsor organization. Delete the user from the existing sponsor organization first.',
      data: result.existingAssignment
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Sponsor user assigned to organization successfully.',
    data: result.assignment
  })
}

const listSponsorOrganizationUsers = async (req, res) => {
  const result = await sponsorshipModel.listSponsorOrganizationUsers({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    sponsorOrgId: req.params.sponsorOrgId
  })

  if (!result.ok && (result.reason === 'not_found' || result.reason === 'sponsor_org_not_found')) {
    return res.status(404).json({
      success: false,
      message: 'Sponsor organization not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: result.data
  })
}

const getMySponsorOrganization = async (req, res) => {
  const assignment = await sponsorshipModel.getMySponsorOrganization(req.user.user_id)

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'You are not assigned to a sponsor organization.'
    })
  }

  return res.status(200).json({
    success: true,
    data: assignment
  })
}

const leaveMySponsorOrganization = async (req, res) => {
  await sponsorshipModel.leaveSponsorOrganization(req.user.user_id)
  return res.status(204).send()
}

const removeUserFromSponsorOrganization = async (req, res) => {
  const result = await sponsorshipModel.removeUserFromSponsorOrganization({
    userId: req.params.userId,
    sponsorOrgId: req.params.sponsorOrgId
  })

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'User is not assigned to a sponsor organization.'
    })
  }

  if (!result.ok && result.reason === 'not_in_org') {
    return res.status(400).json({
      success: false,
      message: 'User is not assigned to the specified sponsor organization.'
    })
  }

  return res.status(204).send()
}

const listSponsorableAlumniCredentials = async (req, res) => {
  const result = await sponsorshipModel.listSponsorableAlumniCredentials({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    credentialType: req.query.credentialType,
    query: req.query.q
  })

  if (!result.ok && result.reason === 'sponsor_org_required') {
    return res.status(400).json({
      success: false,
      message: 'Sponsor organization is not configured for this user.'
    })
  }

  if (!result.ok && result.reason === 'forbidden') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden.'
    })
  }

  return res.status(200).json({
    success: true,
    data: result.data
  })
}

const createSponsorshipOffer = async (req, res) => {
  const result = await sponsorshipModel.createSponsorshipOffer({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    ...req.body
  })

  if (!result.ok && result.reason === 'sponsor_org_required') {
    return res.status(400).json({
      success: false,
      message: 'Sponsor organization is not configured for this user.'
    })
  }

  if (!result.ok && result.reason === 'credential_not_found') {
    return res.status(404).json({
      success: false,
      message: 'Credential not found for this alumni and credential type.'
    })
  }

  if (!result.ok && result.reason === 'credential_alumni_mismatch') {
    return res.status(400).json({
      success: false,
      message: 'credentialId does not belong to the provided alumniId.'
    })
  }

  if (!result.ok && result.reason === 'duplicate_active_offer') {
    return res.status(400).json({
      success: false,
      message: 'An active sponsorship offer already exists for this credential.'
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Sponsorship offer sent to the alumni.',
    data: result.offer
  })
}

const listSponsorshipOffers = async (req, res) => {
  const result = await sponsorshipModel.listSponsorshipOffers({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    ...req.query
  })

  if (!result.ok && result.reason === 'sponsor_org_required') {
    return res.status(400).json({
      success: false,
      message: 'Sponsor organization is not configured for this user.'
    })
  }

  return res.status(200).json({
    success: true,
    data: result.data
  })
}

const getSponsorshipOffer = async (req, res) => {
  const result = await sponsorshipModel.getSponsorshipOfferById({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    offerId: req.params.offerId
  })

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'Sponsorship offer not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: result.offer
  })
}

const deleteSponsorshipOffer = async (req, res) => {
  const result = await sponsorshipModel.cancelSponsorshipOffer({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    offerId: req.params.offerId
  })

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'Sponsorship offer not found.'
    })
  }

  if (!result.ok && result.reason === 'invalid_status') {
    return res.status(400).json({
      success: false,
      message: 'Only pending offers can be cancelled.'
    })
  }

  return res.status(204).send()
}

const setSponsorshipOfferResponse = async (req, res) => {
  const result = await sponsorshipModel.setSponsorshipOfferResponse({
    alumniUserId: req.user.user_id,
    offerId: req.params.offerId,
    action: req.body.action
  })

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'Sponsorship offer not found.'
    })
  }

  if (!result.ok && result.reason === 'invalid_status') {
    return res.status(400).json({
      success: false,
      message: 'Only pending sponsorship offers can be responded to.'
    })
  }

  if (!result.ok && result.reason === 'expired') {
    return res.status(400).json({
      success: false,
      message: 'This offer has already expired and can no longer be accepted.'
    })
  }

  const accepted = req.body.action === 'accept'
  const message = accepted
    ? `Sponsorship offer accepted. £${result.offer.amountOffered.toFixed(2)} added to your bidding pool.`
    : 'Sponsorship offer declined.'

  return res.status(200).json({
    success: true,
    message,
    data: result.offer
  })
}

const listMySponsorshipOffers = async (req, res) => {
  const data = await sponsorshipModel.listMyReceivedSponsorshipOffers({
    alumniUserId: req.user.user_id,
    ...req.query
  })

  return res.status(200).json({
    success: true,
    data
  })
}

const getMySponsorshipBalance = async (req, res) => {
  const summary = await sponsorshipModel.getMySponsorshipBalance(req.user.user_id)

  return res.status(200).json({
    success: true,
    data: summary
  })
}

const listSponsorshipPayouts = async (req, res) => {
  const result = await sponsorshipModel.listSponsorshipPayouts({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    ...req.query
  })

  if (!result.ok && result.reason === 'forbidden') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden.'
    })
  }

  return res.status(200).json({
    success: true,
    data: result.data
  })
}

const getSponsorshipPayout = async (req, res) => {
  const result = await sponsorshipModel.getSponsorshipPayoutById({
    actorUserId: req.user.user_id,
    actorRole: req.user.role,
    payoutId: req.params.payoutId
  })

  if (!result.ok && result.reason === 'forbidden') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden.'
    })
  }

  if (!result.ok && result.reason === 'not_found') {
    return res.status(404).json({
      success: false,
      message: 'Sponsorship payout not found.'
    })
  }

  return res.status(200).json({
    success: true,
    data: result.payout
  })
}

const getOrgProfitSummary = async (req, res) => {
  const summary = await sponsorshipModel.getOrgProfitSummary({
    from: req.query.from,
    to: req.query.to
  })

  return res.status(200).json({
    success: true,
    data: summary
  })
}

module.exports = {
  assignSponsorUserToOrganization,
  createSponsorOrganization,
  deleteSponsorOrganization,
  createSponsorshipOffer,
  deleteSponsorshipOffer,
  getMySponsorOrganization,
  getMySponsorshipBalance,
  getSponsorOrganization,
  getSponsorshipOffer,
  getSponsorshipPayout,
  getOrgProfitSummary,
  leaveMySponsorOrganization,
  listMySponsorshipOffers,
  listSponsorableAlumniCredentials,
  listSponsorOrganizationUsers,
  listSponsorOrganizations,
  listSponsorshipOffers,
  listSponsorshipPayouts,
  removeUserFromSponsorOrganization,
  setSponsorshipOfferResponse,
  updateSponsorOrganization
}
