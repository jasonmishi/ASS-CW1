(function () {
  const endpoint = document.body?.dataset?.analyticsEndpoint || ''

  const state = {
    filters: {
      programme: '',
      graduationFrom: '',
      graduationTo: '',
      industrySector: ''
    }
  }

  const elements = {
    content: document.querySelector('#directory-content'),
    controls: document.querySelector('#directory-controls'),
    errorContainer: document.querySelector('#dashboard-error'),
    errorMessage: document.querySelector('#dashboard-error-message'),
    errorTitle: document.querySelector('#dashboard-error-title'),
    graduationFrom: document.querySelector('#filter-graduation-from'),
    graduationTo: document.querySelector('#filter-graduation-to'),
    industrySector: document.querySelector('#filter-industry-sector'),
    programme: document.querySelector('#filter-programme'),
    resultsBody: document.querySelector('#directory-results-body'),
    retryButton: document.querySelector('#retry-directory-load'),
    totalCount: document.querySelector('#directory-total-count')
  }

  const buildQueryString = () => {
    const searchParams = new URLSearchParams()

    Object.entries(state.filters).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value)
      }
    })

    return searchParams.toString()
  }

  const fillSelect = (element, options, placeholder) => {
    const currentValue = element.value
    element.innerHTML = `<option value="">${placeholder}</option>`

    options.forEach((option) => {
      const optionElement = document.createElement('option')
      optionElement.value = option
      optionElement.textContent = option
      element.appendChild(optionElement)
    })

    element.value = currentValue
  }

  const syncFiltersToInputs = () => {
    elements.programme.value = state.filters.programme
    elements.graduationFrom.value = state.filters.graduationFrom
    elements.graduationTo.value = state.filters.graduationTo
    elements.industrySector.value = state.filters.industrySector
  }

  const setLoadingState = () => {
    elements.resultsBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-secondary text-center py-4">Loading alumni data...</td>
      </tr>
    `
  }

  const toggleErrorState = (visible) => {
    elements.errorContainer.hidden = !visible
    elements.content.classList.toggle('dashboard-content-hidden', visible)
  }

  const renderErrorState = (message) => {
    elements.errorTitle.textContent = 'Alumni directory unavailable'
    elements.errorMessage.textContent = message || 'We could not load alumni directory data right now. Please try again later or contact an administrator.'
    toggleErrorState(true)
  }

  const readErrorMessage = async (response) => {
    try {
      const body = await response.json()
      return body?.message || null
    } catch (_error) {
      return null
    }
  }

  const renderRows = (alumni) => {
    if (!alumni.length) {
      elements.resultsBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-secondary text-center py-4">No alumni matched the current filters.</td>
        </tr>
      `
      return
    }

    elements.resultsBody.innerHTML = alumni.map((person) => `
      <tr>
        <td>${person.name}</td>
        <td>${person.email}</td>
        <td>${person.programme}</td>
        <td>${person.graduationDate}</td>
        <td>${person.latestEmployment?.jobTitle || '—'}</td>
        <td>${person.latestEmployment?.company || '—'}</td>
        <td>${person.latestEmployment?.industrySector || '—'}</td>
      </tr>
    `).join('')
  }

  const renderDirectory = (payload) => {
    toggleErrorState(false)
    elements.totalCount.textContent = String(payload.totalCount || 0)
    fillSelect(elements.programme, payload.filterOptions?.programmes || [], 'All programmes')
    fillSelect(elements.industrySector, payload.filterOptions?.industrySectors || [], 'All industry sectors')
    syncFiltersToInputs()
    renderRows(payload.alumni || [])
  }

  const loadDirectory = async () => {
    try {
      setLoadingState()
      const queryString = buildQueryString()
      const response = await fetch(`${endpoint}${queryString ? `?${queryString}` : ''}`, {
        credentials: 'same-origin'
      })

      if (response.status === 401) {
        window.location.assign('/login')
        return
      }

      if (!response.ok) {
        const message = await readErrorMessage(response)
        renderErrorState(message)
        return
      }

      const body = await response.json()
      renderDirectory(body.data)
    } catch (_error) {
      renderErrorState('We could not load alumni directory data right now. Please try again later or contact an administrator.')
    }
  }

  const attachEventListeners = () => {
    elements.programme.addEventListener('change', () => {
      state.filters.programme = elements.programme.value
      void loadDirectory()
    })

    elements.graduationFrom.addEventListener('change', () => {
      state.filters.graduationFrom = elements.graduationFrom.value
      void loadDirectory()
    })

    elements.graduationTo.addEventListener('change', () => {
      state.filters.graduationTo = elements.graduationTo.value
      void loadDirectory()
    })

    elements.industrySector.addEventListener('change', () => {
      state.filters.industrySector = elements.industrySector.value
      void loadDirectory()
    })

    document.querySelector('#clear-filters').addEventListener('click', () => {
      state.filters = {
        programme: '',
        graduationFrom: '',
        graduationTo: '',
        industrySector: ''
      }
      syncFiltersToInputs()
      void loadDirectory()
    })

    document.querySelector('#refresh-data').addEventListener('click', () => {
      void loadDirectory()
    })

    elements.retryButton.addEventListener('click', () => {
      void loadDirectory()
    })
  }

  attachEventListeners()
  void loadDirectory()
})()
