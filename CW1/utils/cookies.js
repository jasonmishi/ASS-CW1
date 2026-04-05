const parseCookies = (cookieHeader) => {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const separatorIndex = pair.indexOf('=')

      if (separatorIndex <= 0) {
        return acc
      }

      const key = pair.slice(0, separatorIndex).trim()
      const value = decodeURIComponent(pair.slice(separatorIndex + 1).trim())
      acc[key] = value
      return acc
    }, {})
}

module.exports = {
  parseCookies
}
