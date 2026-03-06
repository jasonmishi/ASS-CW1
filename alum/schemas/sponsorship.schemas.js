const { z } = require('zod')

const offerStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired', 'paid', 'cancelled'])
const credentialTypeSchema = z.enum(['certification', 'licence', 'course'])

const createSponsorOrganizationBodySchema = z.object({
  sponsorName: z.string().min(1),
  sponsorEmail: z.string().email()
})

const updateSponsorOrganizationBodySchema = z.object({
  sponsorName: z.string().min(1).optional(),
  sponsorEmail: z.string().email().optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided.'
})

const sponsorOrganizationParamsSchema = z.object({
  sponsorOrgId: z.string().min(1)
})

const sponsorOrganizationUserParamsSchema = z.object({
  sponsorOrgId: z.string().min(1),
  userId: z.string().min(1)
})

const createSponsorshipOfferBodySchema = z.object({
  alumniId: z.string().min(1).optional(),
  credentialType: credentialTypeSchema,
  credentialId: z.string().min(1),
  amountOffered: z.coerce.number().gte(1),
  message: z.string().max(500).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7)
})

const listSponsorableCredentialsQuerySchema = z.object({
  credentialType: credentialTypeSchema.optional(),
  q: z.string().min(1).optional()
})

const listSponsorshipOffersQuerySchema = z.object({
  status: offerStatusSchema.optional(),
  alumniId: z.string().min(1).optional(),
  sponsorName: z.string().min(1).optional()
})
const listSponsorOrganizationsQuerySchema = z.object({})

const sponsorshipOfferParamsSchema = z.object({
  offerId: z.string().min(1)
})

const sponsorshipOfferResponseBodySchema = z.object({
  action: z.enum(['accept', 'decline'])
})

const listMySponsorshipOffersQuerySchema = z.object({
  status: offerStatusSchema.optional()
})

const listSponsorshipPayoutsQuerySchema = z.object({
  alumniId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
}).superRefine((value, ctx) => {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'to must be on or after from.'
    })
  }
})

const sponsorshipPayoutParamsSchema = z.object({
  payoutId: z.string().min(1)
})

module.exports = {
  createSponsorOrganizationBodySchema,
  createSponsorshipOfferBodySchema,
  listSponsorableCredentialsQuerySchema,
  listMySponsorshipOffersQuerySchema,
  listSponsorOrganizationsQuerySchema,
  listSponsorshipOffersQuerySchema,
  listSponsorshipPayoutsQuerySchema,
  sponsorshipOfferParamsSchema,
  sponsorshipOfferResponseBodySchema,
  sponsorshipPayoutParamsSchema,
  sponsorOrganizationParamsSchema,
  sponsorOrganizationUserParamsSchema,
  updateSponsorOrganizationBodySchema
}
