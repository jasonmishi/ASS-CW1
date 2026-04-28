const form = document.querySelector('#login-form')
const errorMessage = document.querySelector('#login-error')
const apiBaseUrl = (window.__CW2_CONFIG__?.apiBaseUrl || '').replace(/\/$/, '')
const apiUrl = (path) => `${apiBaseUrl}${path}`

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorMessage.hidden = true
    errorMessage.textContent = ''

    const formData = new FormData(form)
    const payload = {
      email: formData.get('email'),
      password: formData.get('password')
    }

    const response = await fetch(apiUrl('/api/v1/auth/sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      errorMessage.hidden = false
      errorMessage.textContent = body?.message || 'Login failed.'
      return
    }

    window.location.assign('/dashboard/alumni-analytics')
  })
}
