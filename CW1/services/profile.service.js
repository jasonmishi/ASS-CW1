const profileModel = require('../models/profile.model')
const objectStorage = require('../lib/object-storage')

const replaceProfileImage = async (userId, file) => {
  const nextImageUrl = await objectStorage.uploadProfileImage({
    userId,
    file
  })
  const currentProfile = await profileModel.getUserProfileById(userId)

  try {
    const result = await profileModel.replaceProfileImage(userId, nextImageUrl)

    if (currentProfile?.profileImageUrl && currentProfile.profileImageUrl !== nextImageUrl) {
      await objectStorage.deleteProfileImage(currentProfile.profileImageUrl)
    }

    return result
  } catch (error) {
    await objectStorage.deleteProfileImage(nextImageUrl)
    throw error
  }
}

const deleteProfileImage = async (userId) => {
  const deleted = await profileModel.deleteProfileImage(userId)

  if (!deleted) {
    return null
  }

  await objectStorage.deleteProfileImage(deleted.deletedImageUrl)
  return deleted
}

const clearProfile = async (userId) => {
  const cleared = await profileModel.clearProfileFields(userId)

  if (cleared.deletedImageUrl) {
    await objectStorage.deleteProfileImage(cleared.deletedImageUrl)
  }

  return cleared
}

module.exports = {
  clearProfile,
  deleteProfileImage,
  replaceProfileImage
}
