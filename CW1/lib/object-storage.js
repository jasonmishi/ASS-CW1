const fs = require('node:fs/promises')
const path = require('node:path')
const { Client } = require('minio')

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'
const NODE_ENV = process.env.NODE_ENV || 'development'
const uploadsRoot = path.resolve(__dirname, '..', 'uploads')
const localProfilesRoot = path.join(uploadsRoot, 'profiles')

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'minio'
const MINIO_PORT = Number(process.env.MINIO_PORT || 9000)
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true'
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin'
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin'
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'profile-images'
const MINIO_PUBLIC_URL = (process.env.MINIO_PUBLIC_URL || 'http://localhost:9000').replace(/\/+$/, '')

if (NODE_ENV === 'production' && STORAGE_PROVIDER === 'local') {
  throw new Error('STORAGE_PROVIDER=local is not supported when NODE_ENV=production. Use STORAGE_PROVIDER=minio.')
}

let bucketReadyPromise

const minioClient = new Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY
})

const ensureLocalProfilesDir = async () => {
  await fs.mkdir(localProfilesRoot, { recursive: true })
}

const ensureMinioBucket = async () => {
  if (bucketReadyPromise) {
    return bucketReadyPromise
  }

  bucketReadyPromise = (async () => {
    const exists = await minioClient.bucketExists(MINIO_BUCKET)

    if (!exists) {
      throw new Error(`Configured MinIO bucket does not exist: ${MINIO_BUCKET}`)
    }
  })()

  return bucketReadyPromise
}

const sanitizeExtension = (originalname, mimetype) => {
  const extension = path.extname(originalname || '').toLowerCase()

  if (extension) {
    return extension
  }

  if (mimetype === 'image/png') {
    return '.png'
  }

  if (mimetype === 'image/webp') {
    return '.webp'
  }

  return '.jpg'
}

const buildLocalImageUrl = (filename) => `/uploads/profiles/${filename}`

const buildMinioObjectKey = (userId, file) => {
  const extension = sanitizeExtension(file.originalname, file.mimetype)
  return `profiles/${userId}/${Date.now()}${extension}`
}

const buildMinioPublicUrl = (objectKey) => `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${objectKey}`

const getMinioObjectKeyFromUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null
  }

  const expectedPrefix = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/`

  if (!imageUrl.startsWith(expectedPrefix)) {
    return null
  }

  return imageUrl.slice(expectedPrefix.length)
}

const getLocalFilePathFromUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null
  }

  const normalizedPrefix = '/uploads/'

  if (!imageUrl.startsWith(normalizedPrefix)) {
    return null
  }

  const relativePath = imageUrl.slice(normalizedPrefix.length)
  const absolutePath = path.resolve(uploadsRoot, relativePath)

  if (!absolutePath.startsWith(uploadsRoot)) {
    return null
  }

  return absolutePath
}

const uploadProfileImage = async ({ userId, file }) => {
  if (STORAGE_PROVIDER === 'local') {
    await ensureLocalProfilesDir()
    const extension = sanitizeExtension(file.originalname, file.mimetype)
    const filename = `${userId}-${Date.now()}${extension}`
    await fs.writeFile(path.join(localProfilesRoot, filename), file.buffer)
    return buildLocalImageUrl(filename)
  }

  if (STORAGE_PROVIDER !== 'minio') {
    throw new Error(`Unsupported storage provider: ${STORAGE_PROVIDER}`)
  }

  const objectKey = buildMinioObjectKey(userId, file)
  await ensureMinioBucket()
  await minioClient.putObject(MINIO_BUCKET, objectKey, file.buffer, file.size, {
    'Content-Type': file.mimetype
  })
  return buildMinioPublicUrl(objectKey)
}

const deleteProfileImage = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return
  }

  if (STORAGE_PROVIDER === 'local') {
    const filePath = getLocalFilePathFromUrl(imageUrl)

    if (!filePath) {
      return
    }

    try {
      await fs.unlink(filePath)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }

    return
  }

  if (STORAGE_PROVIDER !== 'minio') {
    throw new Error(`Unsupported storage provider: ${STORAGE_PROVIDER}`)
  }

  const objectKey = getMinioObjectKeyFromUrl(imageUrl)

  if (!objectKey) {
    return
  }

  try {
    await minioClient.removeObject(MINIO_BUCKET, objectKey)
  } catch (error) {
    if (error.code !== 'NoSuchKey' && error.code !== 'NoSuchObject') {
      throw error
    }
  }
}

module.exports = {
  uploadProfileImage,
  deleteProfileImage
}
