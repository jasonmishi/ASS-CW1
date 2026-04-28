(function () {
  const form = document.querySelector('#register-form')
  const errorMessage = document.querySelector('#register-error')
  const successMessage = document.querySelector('#register-success')
  const csrfCookieName = document.body?.dataset?.csrfCookieName || 'csrf_token'
  const apiBaseUrl = (window.__CW2_CONFIG__?.apiBaseUrl || '').replace(/\/$/, '')
  const apiUrl = (path) => `${apiBaseUrl}${path}`

  const getCookieValue = (name) => {
    return document.cookie
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .reduce((foundValue, pair) => {
        if (foundValue !== null) {
          return foundValue
        }

        const separatorIndex = pair.indexOf('=')

        if (separatorIndex <= 0) {
          return null
        }

        const key = pair.slice(0, separatorIndex).trim()

        if (key !== name) {
          return null
        }

        return decodeURIComponent(pair.slice(separatorIndex + 1).trim())
      }, null)
  }

  const ensureCsrfToken = async () => {
    const existingToken = getCookieValue(csrfCookieName)

    if (existingToken) {
      return existingToken
    }

    const response = await fetch(apiUrl('/api/v1/auth/csrf-token'), {
      credentials: 'include'
    })
    const body = await response.json().catch(() => null)

    return body?.data?.csrfToken || getCookieValue(csrfCookieName) || ''
  }

  const buildErrorMessage = (body) => {
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      return [...new Set(body.errors.map((error) => error.message).filter(Boolean))].join(' ')
    }

    return body?.message || 'Registration failed.'
  }

  if (!form) {
    return
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorMessage.hidden = true
    errorMessage.textContent = ''
    successMessage.hidden = true

    const formData = new FormData(form)
    const payload = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName') || undefined,
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword')
    }
    const csrfToken = await ensureCsrfToken()

    const response = await fetch(apiUrl('/api/v1/auth/users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      errorMessage.hidden = false
      errorMessage.textContent = buildErrorMessage(body)
      return
    }

    form.reset()
    successMessage.hidden = false
  })
})()
