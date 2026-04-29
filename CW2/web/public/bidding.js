(function () {
  const apiBaseUrl = (window.__CW2_CONFIG__?.apiBaseUrl || '').replace(/\/$/, '')
  const apiUrl = (path) => `${apiBaseUrl}${path}`
  const csrfCookieName = 'csrf_token'
  const state = {
    currentBid: null,
    sponsorshipOffers: []
  }

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
    biddingMessage: document.querySelector('#bidding-message'),
    refreshOffersButton: document.querySelector('#refresh-offers-btn'),
    sponsorshipOffersEmpty: document.querySelector('#sponsorship-offers-empty'),
    sponsorshipOffersList: document.querySelector('#sponsorship-offers-list')
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
    setText('availableBalance', formatMoney(balance?.availableForBidding))
  }

  const setOffersEmptyState = (text) => {
    elements.sponsorshipOffersEmpty.textContent = text
    elements.sponsorshipOffersEmpty.classList.toggle('d-none', false)
  }

  const formatOfferStatus = (status) => {
    if (!status) {
      return 'Unknown'
    }

    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const createOfferMeta = (label, value) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'col-12 col-md-6'

    const labelElement = document.createElement('div')
    labelElement.className = 'text-secondary small'
    labelElement.textContent = label

    const valueElement = document.createElement('div')
    valueElement.className = 'fw-semibold text-dark'
    valueElement.textContent = value

    wrapper.append(labelElement, valueElement)
    return wrapper
  }

  const submitOfferResponse = async (offerId, action) => {
    const csrfToken = await ensureCsrfToken()
    const response = await fetchJson(`/api/v1/sponsorships/offers/${offerId}/response`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ action })
    })

    if (!response.ok) {
      showMessage(response.body?.message || 'Could not update sponsorship offer.', 'danger')
      return
    }

    showMessage(response.body?.message || `Sponsorship offer ${action}ed.`, 'success')
    await loadCurrentState()
  }

  const createOfferCard = (offer) => {
    const card = document.createElement('article')
    card.className = 'border rounded-3 p-3 bg-light-subtle'

    const header = document.createElement('div')
    header.className = 'd-flex flex-wrap justify-content-between align-items-start gap-2 mb-3'

    const headingGroup = document.createElement('div')
    const title = document.createElement('h3')
    title.className = 'h6 mb-1'
    title.textContent = offer.credentialTitle || 'Credential'

    const sponsor = document.createElement('div')
    sponsor.className = 'text-secondary small'
    sponsor.textContent = `${offer.sponsorName} · ${formatOfferStatus(offer.status)}`

    headingGroup.append(title, sponsor)

    const amount = document.createElement('div')
    amount.className = 'fs-5 fw-bold text-dark'
    amount.textContent = formatMoney(offer.amountOffered)

    header.append(headingGroup, amount)

    const metaRow = document.createElement('div')
    metaRow.className = 'row g-3 mb-3'
    metaRow.append(
      createOfferMeta('Credential type', offer.credentialType || '—'),
      createOfferMeta('Expires', formatDateTime(offer.expiresAt)),
      createOfferMeta('Sponsor email', offer.sponsorEmail || '—'),
      createOfferMeta('Received', formatDateTime(offer.createdAt))
    )

    card.append(header, metaRow)

    if (offer.message) {
      const messageBlock = document.createElement('p')
      messageBlock.className = 'mb-3 text-dark'
      messageBlock.textContent = offer.message
      card.append(messageBlock)
    }

    if (offer.status === 'pending') {
      const actionRow = document.createElement('div')
      actionRow.className = 'd-flex flex-wrap gap-2'

      const acceptButton = document.createElement('button')
      acceptButton.type = 'button'
      acceptButton.className = 'btn btn-dark btn-sm'
      acceptButton.textContent = 'Accept offer'
      acceptButton.addEventListener('click', async () => {
        await submitOfferResponse(offer.id, 'accept')
      })

      const declineButton = document.createElement('button')
      declineButton.type = 'button'
      declineButton.className = 'btn btn-outline-secondary btn-sm'
      declineButton.textContent = 'Decline offer'
      declineButton.addEventListener('click', async () => {
        await submitOfferResponse(offer.id, 'decline')
      })

      actionRow.append(acceptButton, declineButton)
      card.append(actionRow)
    }

    return card
  }

  const renderOffers = (offers) => {
    state.sponsorshipOffers = Array.isArray(offers) ? offers : []
    elements.sponsorshipOffersList.replaceChildren()

    if (state.sponsorshipOffers.length === 0) {
      setOffersEmptyState('No sponsorship offers yet.')
      return
    }

    elements.sponsorshipOffersEmpty.classList.add('d-none')
    const offerCards = state.sponsorshipOffers.map(createOfferCard)
    elements.sponsorshipOffersList.replaceChildren(...offerCards)
  }

  const loadCurrentState = async () => {
    const [currentResponse, summaryResponse, balanceResponse, offersResponse] = await Promise.all([
      fetchJson('/api/v1/bids/current'),
      fetchJson('/api/v1/bids/summary'),
      fetchJson('/api/v1/sponsorships/balance'),
      fetchJson('/api/v1/sponsorships/offers/me')
    ])

    if (
      currentResponse.status === 401 ||
      summaryResponse.status === 401 ||
      balanceResponse.status === 401 ||
      offersResponse.status === 401
    ) {
      window.location.assign('/login')
      return false
    }

    if (!currentResponse.ok || !summaryResponse.ok || !balanceResponse.ok || !offersResponse.ok) {
      showMessage('Could not load bidding data right now.', 'danger')
      setOffersEmptyState('Could not load sponsorship offers right now.')
      return false
    }

    updateStatusUI(currentResponse.body?.data)
    updateSummaryUI(summaryResponse.body?.data)
    updateBalanceUI(balanceResponse.body?.data)
    renderOffers(offersResponse.body?.data)
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

    elements.refreshOffersButton.addEventListener('click', async () => {
      await loadCurrentState()
    })
  }

  attachHandlers()
  void loadCurrentState()
})()
