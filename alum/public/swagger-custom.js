(() => {
  const csrfCookieName = globalThis.__CSRF_COOKIE_NAME__ || 'csrf_token'

  const getCookieValue = (name) => {
    const source = document.cookie || ''
    const entries = source.split(';').map((part) => part.trim()).filter(Boolean)

    for (const entry of entries) {
      if (!entry.startsWith(name + '=')) {
        continue
      }

      return decodeURIComponent(entry.slice(name.length + 1))
    }

    return null
  }

  const attachRequestInterceptor = () => {
    if (!globalThis.ui || typeof globalThis.ui.getConfigs !== 'function') {
      return false
    }

    const configs = globalThis.ui.getConfigs()

    if (configs.__csrfInterceptorAttached) {
      return true
    }

    const previousInterceptor = configs.requestInterceptor

    configs.requestInterceptor = (request) => {
      const method = (request.method || '').toUpperCase()

      request.credentials = 'include'
      request.headers = request.headers || {}

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCookieValue(csrfCookieName)

        if (csrfToken) {
          request.headers['X-CSRF-Token'] = csrfToken
        }
      }

      if (typeof previousInterceptor === 'function') {
        return previousInterceptor(request)
      }

      return request
    }

    configs.__csrfInterceptorAttached = true
    return true
  }

  if (attachRequestInterceptor()) {
    return
  }

  const intervalId = setInterval(() => {
    if (!attachRequestInterceptor()) {
      return
    }

    clearInterval(intervalId)
  }, 100)
})()
