(function () {
  const apiBaseUrl = (window.__CW2_CONFIG__?.apiBaseUrl || '').replace(/\/$/, '')
  const apiUrl = (path) => `${apiBaseUrl}${path}`
  const csrfCookieName = 'csrf_token'
  const state = { currentBid: null }

  const elements = {
    bidStatus: document.querySelector('#bid-status'),
    currentBidAmount: document.querySelector('#current-bid-amount'),
    biddingClosesAt: document.querySelector('#bidding-closes-at'),
    availableBalance: document.querySelector('#available-balance'),
    winsThisMonth: document.querySelector('#wins-this-month'),
    maxWinsAllowed: document.querySelector('#max-wins-allowed'),
    remainingSlots: document.querySelector('#remaining-slots'),
    eventBonus: document.querySelector('#event-bonus'),
    biddingForm: document.querySelector('#bidding-form'),
    bidAmount: document.querySelector('#bid-amount'),
    placeBidButton: document.querySelector('#place-bid-btn'),
    updateBidButton: document.querySelector('#update-bid-btn'),
    refreshBidButton: document.querySelector('#refresh-bid-btn'),
    biddingMessage: document.querySelector('#bidding-message')
  }

  const showMessage = (text, tone = 'secondary') => {
    elements.biddingMessage.className = `small mt-3 mb-0 text-${tone}`
    elements.biddingMessage.textContent = text
  }

  const formatMoney = (amount) => (amount === null || amount === undefined ? '—' : `£${Number(amount).toFixed(2)}`)

  const formatDateTime = (isoDate) => {
    if (!isoDate) {
      return '—'
    }

    const value = new Date(isoDate)
    if (Number.isNaN(value.getTime())) {
      return '—'
    }

    return value.toISOString().replace('T', ' ').replace('.000Z', 'Z')
  }

  const getCookieValue = (name) => {
    const pair = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((entry) => entry.startsWith(`${name}=`))

    return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null
  }

  const ensureCsrfToken = async () => {
    const existing = getCookieValue(csrfCookieName)
    if (existing) {
      return existing
    }

    const response = await fetch(apiUrl('/api/v1/auth/csrf-token'), {
      credentials: 'include'
    })
    const body = await response.json().catch(() => null)

    return body?.data?.csrfToken || getCookieValue(csrfCookieName) || ''
  }

  const fetchJson = async (path, options = {}) => {
    const response = await fetch(apiUrl(path), {
      credentials: 'include',
      ...options
    })
    const body = await response.json().catch(() => null)

    return {
      ok: response.ok,
      status: response.status,
      body
    }
  }

  const setText = (key, value) => {
    elements[key].textContent = value
  }

  const updateStatusUI = (current) => {
    state.currentBid = current
    const status = current?.status || 'no_bid'

    setText('bidStatus', status.toUpperCase())
    setText('currentBidAmount', formatMoney(current?.currentBidAmount))
    setText('biddingClosesAt', formatDateTime(current?.biddingClosesAt))

    const hasBid = Boolean(current?.hasBid)
    elements.placeBidButton.disabled = hasBid
    elements.updateBidButton.disabled = !hasBid || !current?.bidId
  }

  const updateSummaryUI = (summary) => {
    setText('winsThisMonth', String(summary?.winsThisMonth ?? '—'))
    setText('maxWinsAllowed', String(summary?.maxWinsAllowed ?? '—'))
    setText('remainingSlots', String(summary?.remainingSlots ?? '—'))
    setText('eventBonus', summary?.attendedEventThisMonth ? 'Unlocked (+1 slot)' : 'Not unlocked')
  }

  const updateBalanceUI = (balance) => {
    setText('availableBalance', formatMoney(balance?.availableBiddingBalance))
  }

  const loadCurrentState = async () => {
    const [currentResponse, summaryResponse, balanceResponse] = await Promise.all([
      fetchJson('/api/v1/bids/current'),
      fetchJson('/api/v1/bids/summary'),
      fetchJson('/api/v1/sponsorships/balance')
    ])

    if (currentResponse.status === 401 || summaryResponse.status === 401 || balanceResponse.status === 401) {
      window.location.assign('/login')
      return false
    }

    if (!currentResponse.ok || !summaryResponse.ok || !balanceResponse.ok) {
      showMessage('Could not load bidding data right now.', 'danger')
      return false
    }

    updateStatusUI(currentResponse.body?.data)
    updateSummaryUI(summaryResponse.body?.data)
    updateBalanceUI(balanceResponse.body?.data)
    showMessage('Bidding data refreshed.')
    return true
  }

  const submitBid = async ({ method, path, successMessage, missingBidMessage }) => {
    const amount = Number(elements.bidAmount.value)
    if (Number.isNaN(amount) || amount <= 0) {
      showMessage('Please enter a valid amount greater than zero.', 'danger')
      return
    }

    if (!path) {
      showMessage(missingBidMessage || 'No active bid to update.', 'danger')
      return
    }

    const csrfToken = await ensureCsrfToken()
    const response = await fetchJson(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ amount })
    })

    if (!response.ok) {
      showMessage(response.body?.message || 'Failed to place bid.', 'danger')
      return
    }

    showMessage(successMessage, 'success')
    await loadCurrentState()
  }

  const submitPlaceBid = async () => {
    await submitBid({
      method: 'POST',
      path: '/api/v1/bids',
      successMessage: 'Bid placed successfully.'
    })
  }

  const submitUpdateBid = async () => {
    await submitBid({
      method: 'PATCH',
      path: state.currentBid?.bidId ? `/api/v1/bids/${state.currentBid.bidId}` : null,
      successMessage: 'Bid increased successfully.',
      missingBidMessage: 'No active bid to update.'
    })
  }

  const attachHandlers = () => {
    elements.biddingForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      await submitPlaceBid()
    })

    elements.updateBidButton.addEventListener('click', async () => {
      await submitUpdateBid()
    })

    elements.refreshBidButton.addEventListener('click', async () => {
      await loadCurrentState()
    })
  }

  attachHandlers()
  void loadCurrentState()
})()
