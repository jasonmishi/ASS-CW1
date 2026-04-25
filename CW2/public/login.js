const form = document.querySelector('#login-form')
const errorMessage = document.querySelector('#login-error')

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

    const response = await fetch('/api/v1/auth/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'same-origin'
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
