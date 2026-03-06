const { api, authHeader } = require('../helpers/http')
const { createAuthenticatedUser } = require('../helpers/factories')

const pngStub = Buffer.from([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a
])

describe('Profile basic endpoints', () => {
  it('returns the authenticated profile and supports profile update', async () => {
    const { token, user } = await createAuthenticatedUser({
      email: 'profile.basic@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const getInitialResponse = await api()
      .get('/api/v1/profile')
      .set(authHeader(token))

    expect(getInitialResponse.status).toBe(200)
    expect(getInitialResponse.body.data.userId).toBe(user.user_id)
    expect(getInitialResponse.body.data.firstName).toBe('Jane')
    expect(getInitialResponse.body.data.lastName).toBe('Doe')
    expect(getInitialResponse.body.data.biography).toBeNull()
    expect(getInitialResponse.body.data.linkedinUrl).toBeNull()
    expect(getInitialResponse.body.data.profileImageUrl).toBeNull()
    expect(getInitialResponse.body.data.degrees).toEqual([])
    expect(getInitialResponse.body.data.certifications).toEqual([])
    expect(getInitialResponse.body.data.licences).toEqual([])
    expect(getInitialResponse.body.data.courses).toEqual([])
    expect(getInitialResponse.body.data.employmentHistory).toEqual([])

    const updateResponse = await api()
      .put('/api/v1/profile')
      .set(authHeader(token))
      .send({
        firstName: 'Janet',
        lastName: 'Dane',
        biography: 'Software engineer focused on platform reliability.',
        linkedinUrl: 'https://www.linkedin.com/in/janet-dane'
      })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data.firstName).toBe('Janet')
    expect(updateResponse.body.data.lastName).toBe('Dane')
    expect(updateResponse.body.data.biography).toBe('Software engineer focused on platform reliability.')
    expect(updateResponse.body.data.linkedinUrl).toBe('https://www.linkedin.com/in/janet-dane')
    expect(updateResponse.body.data.createdAt).toBeTruthy()
    expect(updateResponse.body.data.updatedAt).toBeTruthy()
  })

  it('supports profile image upload and delete', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'profile.image@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const uploadResponse = await api()
      .put('/api/v1/profile/image')
      .set(authHeader(token))
      .attach('image', pngStub, {
        filename: 'avatar.png',
        contentType: 'image/png'
      })

    expect(uploadResponse.status).toBe(200)
    expect(uploadResponse.body.data.profileImageUrl).toMatch(/^\/uploads\/profiles\//)

    const deleteResponse = await api()
      .delete('/api/v1/profile/image')
      .set(authHeader(token))

    expect(deleteResponse.status).toBe(204)

    const secondDeleteResponse = await api()
      .delete('/api/v1/profile/image')
      .set(authHeader(token))

    expect(secondDeleteResponse.status).toBe(404)
  })

  it('clears profile fields via DELETE /profile', async () => {
    const { token } = await createAuthenticatedUser({
      email: 'profile.clear@eastminster.ac.uk',
      password: 'Strong!Pass1',
      roleName: 'alumni'
    })

    const updateResponse = await api()
      .put('/api/v1/profile')
      .set(authHeader(token))
      .send({
        biography: 'Data engineer and mentor.',
        linkedinUrl: 'https://www.linkedin.com/in/profile-clear'
      })

    expect(updateResponse.status).toBe(200)

    const uploadResponse = await api()
      .put('/api/v1/profile/image')
      .set(authHeader(token))
      .attach('image', pngStub, {
        filename: 'profile-clear.png',
        contentType: 'image/png'
      })

    expect(uploadResponse.status).toBe(200)
    expect(uploadResponse.body.data.profileImageUrl).toMatch(/^\/uploads\/profiles\//)

    const clearResponse = await api()
      .delete('/api/v1/profile')
      .set(authHeader(token))

    expect(clearResponse.status).toBe(204)

    const getResponse = await api()
      .get('/api/v1/profile')
      .set(authHeader(token))

    expect(getResponse.status).toBe(200)
    expect(getResponse.body.data.biography).toBeNull()
    expect(getResponse.body.data.linkedinUrl).toBeNull()
    expect(getResponse.body.data.profileImageUrl).toBeNull()
  })
})
