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

  const clearChildren = (element) => {
    element.replaceChildren()
  }

  const appendPlaceholderOption = (element, placeholder) => {
    const optionElement = document.createElement('option')
    optionElement.value = ''
    optionElement.textContent = placeholder
    element.appendChild(optionElement)
  }

  const fillSelect = (element, options, placeholder) => {
    const currentValue = element.value
    clearChildren(element)
    appendPlaceholderOption(element, placeholder)

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

  const createMessageRow = (message) => {
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = 7
    cell.className = 'text-secondary text-center py-4'
    cell.textContent = message
    row.appendChild(cell)
    return row
  }

  const setLoadingState = () => {
    clearChildren(elements.resultsBody)
    elements.resultsBody.appendChild(createMessageRow('Loading alumni data...'))
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

  const createDataCell = (value) => {
    const cell = document.createElement('td')
    cell.textContent = value || '—'
    return cell
  }

  const createAlumniRow = (person) => {
    const row = document.createElement('tr')

    const nameCell = document.createElement('td')
    const profileLink = document.createElement('a')
    profileLink.href = `/alumni/${encodeURIComponent(person.userId)}`
    profileLink.textContent = person.name
    nameCell.appendChild(profileLink)
    row.appendChild(nameCell)

    row.appendChild(createDataCell(person.email))
    row.appendChild(createDataCell(person.programme))
    row.appendChild(createDataCell(person.graduationDate))
    row.appendChild(createDataCell(person.latestEmployment?.jobTitle))
    row.appendChild(createDataCell(person.latestEmployment?.company))
    row.appendChild(createDataCell(person.latestEmployment?.industrySector))

    return row
  }

  const renderRows = (alumni) => {
    clearChildren(elements.resultsBody)

    if (!alumni.length) {
      elements.resultsBody.appendChild(createMessageRow('No alumni matched the current filters.'))
      return
    }

    const fragment = document.createDocumentFragment()
    alumni.forEach((person) => {
      fragment.appendChild(createAlumniRow(person))
    })

    elements.resultsBody.appendChild(fragment)
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
