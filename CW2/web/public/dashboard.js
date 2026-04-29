(function () {
  const endpoint = document.body?.dataset?.analyticsEndpoint || ''
  const chartInstances = new Map()
  const chartConfigOrder = [
    'degreeTitles',
    'qualificationMix',
    'learningTimeline',
    'topCertifications',
    'topCourses',
    'certificationCoverage',
    'careerPathways',
    'developmentRadar'
  ]

  const state = {
    filters: {
      from: '',
      to: '',
      degreeTitle: '',
      credentialDomain: '',
      careerCategory: '',
      search: ''
    },
    error: null,
    payload: null
  }

  const elements = {
    dashboardControls: document.querySelector('#dashboard-controls'),
    dashboardMain: document.querySelector('#dashboard-main'),
    errorContainer: document.querySelector('#dashboard-error'),
    errorMessage: document.querySelector('#dashboard-error-message'),
    errorTitle: document.querySelector('#dashboard-error-title'),
    from: document.querySelector('#filter-from'),
    to: document.querySelector('#filter-to'),
    degree: document.querySelector('#filter-degree'),
    domain: document.querySelector('#filter-domain'),
    career: document.querySelector('#filter-career'),
    search: document.querySelector('#filter-search'),
    summary: document.querySelector('#summary-grid'),
    insights: document.querySelector('#insights-panel'),
    detail: document.querySelector('#detail-panel'),
    presetName: document.querySelector('#preset-name'),
    presetSelect: document.querySelector('#preset-select'),
    reportSelectors: document.querySelector('#report-selectors'),
    retryButton: document.querySelector('#retry-dashboard-load')
  }

  const actionButtons = [
    document.querySelector('#export-csv'),
    document.querySelector('#generate-report')
  ].filter(Boolean)

  const getPresetKey = () => 'cw2-alumni-analytics-presets'

  const readPresets = () => {
    try {
      return JSON.parse(window.localStorage.getItem(getPresetKey()) || '[]')
    } catch (_error) {
      return []
    }
  }

  const writePresets = (presets) => {
    window.localStorage.setItem(getPresetKey(), JSON.stringify(presets))
  }

  const refreshPresetOptions = () => {
    const presets = readPresets()
    elements.presetSelect.innerHTML = '<option value="">Saved presets</option>'

    presets.forEach((preset) => {
      const option = document.createElement('option')
      option.value = preset.name
      option.textContent = preset.name
      elements.presetSelect.appendChild(option)
    })
  }

  const syncFiltersToInputs = () => {
    elements.from.value = state.filters.from
    elements.to.value = state.filters.to
    elements.degree.value = state.filters.degreeTitle
    elements.domain.value = state.filters.credentialDomain
    elements.career.value = state.filters.careerCategory
    elements.search.value = state.filters.search
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

  const buildTooltipLabel = (context) => {
    const value = typeof context.raw === 'number' ? context.raw : context.formattedValue
    return `${context.label}: ${value}`
  }

  const baseChartOptions = (chartId, chartData) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 650,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: buildTooltipLabel
        }
      }
    },
    onClick: (_event, activeElements, chart) => {
      if (!activeElements.length) {
        return
      }

      const { index } = activeElements[0]
      const item = chartData.items[index]
      if (!item) {
        return
      }

      applyChartSelection(chartId, item)
      renderDetailPanel(chartId, item, chartData)
    },
    scales: chartData.axisLabels?.x || chartData.axisLabels?.y
      ? {
          x: {
            title: {
              display: Boolean(chartData.axisLabels?.x),
              text: chartData.axisLabels?.x || ''
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: Boolean(chartData.axisLabels?.y),
              text: chartData.axisLabels?.y || ''
            }
          }
        }
      : undefined
  })

  const createOrUpdateChart = (chartId, chartData) => {
    const canvas = document.querySelector(`#chart-${chartId}`)
    if (!canvas) {
      return
    }

    const config = {
      type: chartData.type,
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets
      },
      options: baseChartOptions(chartId, chartData)
    }

    if (chartData.id === 'careerPathways') {
      config.options.indexAxis = 'y'
    }

    const existing = chartInstances.get(chartId)
    if (existing) {
      existing.data = config.data
      existing.options = config.options
      existing.update()
      return
    }

    chartInstances.set(chartId, new window.Chart(canvas, config))
  }

  const renderSummary = (summary) => {
    elements.summary.innerHTML = ''
    summary.forEach((card) => {
      const column = document.createElement('div')
      column.className = 'col-12 col-sm-6 col-xl-2'
      column.innerHTML = `
        <article class="card shadow-sm border-0 summary-card">
          <div class="card-body">
            <div class="text-secondary small mb-2">${card.label}</div>
            <div class="fs-3 fw-bold text-${card.tone === 'neutral' ? 'dark' : card.tone === 'highlight' ? 'primary' : card.tone === 'accent' ? 'warning' : card.tone}">${card.value}</div>
          </div>
        </article>
      `
      elements.summary.appendChild(column)
    })
  }

  const renderInsights = (insights) => {
    elements.insights.innerHTML = ''

    if (!insights.length) {
      elements.insights.innerHTML = `
        <div class="col-12">
          <article class="card shadow-sm border-0 insight-card">
            <div class="card-body">
              <strong class="d-block mb-1">No major gaps detected.</strong>
              <span class="text-secondary">The current filtered cohort does not trigger any configured critical or emerging signals.</span>
            </div>
          </article>
        </div>
      `
      return
    }

    insights.forEach((insight) => {
      const column = document.createElement('div')
      column.className = 'col-12 col-md-6'
      column.innerHTML = `
        <article class="card shadow-sm border-0 insight-card severity-${insight.severity}">
          <div class="card-body">
            <strong class="d-block mb-1">${insight.title}</strong>
            <span class="text-secondary">${insight.description}</span>
          </div>
        </article>
      `
      elements.insights.appendChild(column)
    })
  }

  const renderDetailPanel = (chartId, item, chartData) => {
    elements.detail.innerHTML = `
      <h2>${chartData.title}</h2>
      <p class="detail-kicker">${item.label}</p>
      <p class="detail-value">${item.value}</p>
      <p>${chartData.subtitle}</p>
    `
  }

  const fillSelect = (element, options, placeholder) => {
    const currentValue = element.value
    element.innerHTML = `<option value="">${placeholder}</option>`
    options.forEach((option) => {
      const optionElement = document.createElement('option')
      if (typeof option === 'string') {
        optionElement.value = option
        optionElement.textContent = option
      } else {
        optionElement.value = option.key
        optionElement.textContent = option.label
      }
      element.appendChild(optionElement)
    })
    element.value = currentValue
  }

  const applyChartSelection = (chartId, item) => {
    if (chartId === 'degreeTitles') {
      state.filters.degreeTitle = state.filters.degreeTitle === item.label ? '' : item.label
    } else if (chartId === 'careerPathways') {
      const normalized = (state.payload?.filterOptions?.careerCategories || []).find((option) => option.label === item.label)
      state.filters.careerCategory = state.filters.careerCategory === normalized?.key ? '' : (normalized?.key || '')
    } else if (chartId === 'topCertifications' || chartId === 'topCourses') {
      state.filters.search = state.filters.search === item.label ? '' : item.label
    } else {
      return
    }

    syncFiltersToInputs()
    void loadDashboard()
  }

  const renderReportSelectors = () => {
    elements.reportSelectors.innerHTML = ''
    chartConfigOrder.forEach((chartId) => {
      const label = document.createElement('label')
      label.className = 'report-choice form-check form-check-inline border rounded-pill px-3 py-2 bg-white'
      const chartTitle = document.querySelector(`[data-chart-id="${chartId}"] h2`)?.textContent || chartId
      label.innerHTML = `<input class="form-check-input me-2" type="checkbox" value="${chartId}" checked> <span class="form-check-label">${chartTitle}</span>`
      elements.reportSelectors.appendChild(label)
    })
  }

  const renderCharts = (charts) => {
    chartConfigOrder.forEach((chartId) => {
      createOrUpdateChart(chartId, charts[chartId])
    })
  }

  const renderFilterOptions = (filterOptions) => {
    fillSelect(elements.degree, filterOptions.degreeTitles, 'All degree titles')
    fillSelect(elements.domain, filterOptions.credentialDomains, 'All domains')
    fillSelect(elements.career, filterOptions.careerCategories, 'All pathways')

    if (!state.filters.from && filterOptions.dateBounds.min) {
      elements.from.min = filterOptions.dateBounds.min
      elements.to.min = filterOptions.dateBounds.min
    }

    if (filterOptions.dateBounds.max) {
      elements.from.max = filterOptions.dateBounds.max
      elements.to.max = filterOptions.dateBounds.max
    }
  }

  const renderDashboard = (payload) => {
    state.error = null
    state.payload = payload
    toggleErrorState(false)
    renderSummary(payload.summary)
    renderInsights(payload.insights)
    renderFilterOptions(payload.filterOptions)
    renderCharts(payload.charts)
    renderDetailPanel('degreeTitles', payload.charts.degreeTitles.items[0] || { label: 'No data', value: 0, details: [] }, payload.charts.degreeTitles)
  }

  const setActionsDisabled = (disabled) => {
    actionButtons.forEach((button) => {
      button.disabled = disabled
    })
  }

  const toggleErrorState = (visible) => {
    elements.errorContainer.hidden = !visible
    elements.summary.classList.toggle('dashboard-content-hidden', visible)
    elements.insights.classList.toggle('dashboard-content-hidden', visible)
    elements.dashboardMain.classList.toggle('dashboard-content-hidden', visible)
    setActionsDisabled(visible)
  }

  const renderErrorState = (message) => {
    state.payload = null
    state.error = message
    elements.errorTitle.textContent = 'Analytics dashboard unavailable'
    elements.errorMessage.textContent = message || 'We could not load analytics data right now. Please try again later or contact an administrator.'
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

  const loadDashboard = async () => {
    try {
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
        renderErrorState(message || 'We could not load analytics data right now. Please try again later or contact an administrator.')
        return
      }

      const body = await response.json()
      renderDashboard(body.data)
    } catch (_error) {
      renderErrorState('We could not load analytics data right now. Please try again later or contact an administrator.')
    }
  }

  const exportCsv = () => {
    if (!state.payload) {
      return
    }

    const rows = [['Chart', 'Label', 'Value', 'Applied filters']]
    Object.values(state.payload.charts).forEach((chart) => {
      chart.items.forEach((item) => {
        rows.push([
          chart.title,
          item.label,
          item.value,
          JSON.stringify(state.payload.appliedFilters)
        ])
      })
    })

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'alumni-analytics.csv'
    link.click()
  }

  const downloadChartImage = (chartId) => {
    const chart = chartInstances.get(chartId)
    if (!chart) {
      return
    }

    const link = document.createElement('a')
    link.href = chart.toBase64Image()
    link.download = `${chartId}.png`
    link.click()
  }

  const generatePdfReport = () => {
    if (!state.payload || !window.jspdf?.jsPDF) {
      return
    }

    const selectedChartIds = Array.from(elements.reportSelectors.querySelectorAll('input:checked'))
      .map((input) => input.value)
      .filter((chartId) => chartInstances.has(chartId) && state.payload.charts[chartId])
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' })
    let y = 40

    doc.setFontSize(18)
    doc.text('CW2 Alumni Analytics Report', 40, y)
    y += 24

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toISOString()}`, 40, y)
    y += 16
    doc.text(`Filters: ${JSON.stringify(state.payload.appliedFilters)}`, 40, y, { maxWidth: 515 })
    y += 28

    state.payload.summary.forEach((item) => {
      doc.text(`${item.label}: ${item.value}`, 40, y)
      y += 14
    })

    y += 14

    selectedChartIds.forEach((chartId, index) => {
      const chart = chartInstances.get(chartId)
      const chartMeta = state.payload.charts[chartId]
      if (!chart || !chartMeta) {
        return
      }

      if (index > 0) {
        doc.addPage()
        y = 40
      }

      doc.setFontSize(14)
      doc.text(chartMeta.title, 40, y)
      y += 14
      doc.setFontSize(10)
      doc.text(chartMeta.subtitle, 40, y, { maxWidth: 515 })
      y += 16
      doc.addImage(chart.toBase64Image(), 'PNG', 40, y, 515, 260)
    })

    doc.save('alumni-analytics-report.pdf')
  }

  const attachEventListeners = () => {
    elements.from.addEventListener('change', () => {
      state.filters.from = elements.from.value
      void loadDashboard()
    })
    elements.to.addEventListener('change', () => {
      state.filters.to = elements.to.value
      void loadDashboard()
    })
    elements.degree.addEventListener('change', () => {
      state.filters.degreeTitle = elements.degree.value
      void loadDashboard()
    })
    elements.domain.addEventListener('change', () => {
      state.filters.credentialDomain = elements.domain.value
      void loadDashboard()
    })
    elements.career.addEventListener('change', () => {
      state.filters.careerCategory = elements.career.value
      void loadDashboard()
    })
    elements.search.addEventListener('input', () => {
      state.filters.search = elements.search.value.trim()
      void loadDashboard()
    })

    document.querySelector('#clear-filters').addEventListener('click', () => {
      state.filters = {
        from: '',
        to: '',
        degreeTitle: '',
        credentialDomain: '',
        careerCategory: '',
        search: ''
      }
      syncFiltersToInputs()
      void loadDashboard()
    })

    document.querySelector('#refresh-data').addEventListener('click', () => {
      void loadDashboard()
    })

    document.querySelector('#export-csv').addEventListener('click', exportCsv)
    document.querySelector('#generate-report').addEventListener('click', generatePdfReport)
    elements.retryButton.addEventListener('click', () => {
      void loadDashboard()
    })

    document.querySelectorAll('.chart-download').forEach((button) => {
      button.addEventListener('click', () => {
        downloadChartImage(button.dataset.chartDownload)
      })
    })

    document.querySelector('#save-preset').addEventListener('click', () => {
      const name = elements.presetName.value.trim()
      if (!name) {
        return
      }

      const presets = readPresets().filter((preset) => preset.name !== name)
      presets.push({ name, filters: { ...state.filters } })
      writePresets(presets)
      elements.presetName.value = ''
      refreshPresetOptions()
    })

    document.querySelector('#load-preset').addEventListener('click', () => {
      const preset = readPresets().find((item) => item.name === elements.presetSelect.value)
      if (!preset) {
        return
      }

      state.filters = { ...preset.filters }
      syncFiltersToInputs()
      void loadDashboard()
    })

    document.querySelector('#delete-preset').addEventListener('click', () => {
      const selected = elements.presetSelect.value
      if (!selected) {
        return
      }

      writePresets(readPresets().filter((preset) => preset.name !== selected))
      refreshPresetOptions()
    })
  }

  renderReportSelectors()
  refreshPresetOptions()
  attachEventListeners()
  void loadDashboard()
})()
