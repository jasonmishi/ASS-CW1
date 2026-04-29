(function () {
  const stateElement = document.querySelector('#analytics-dashboard-state')

  if (!stateElement) {
    return
  }

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
  const selectableChartIds = new Set([
    'degreeTitles',
    'careerPathways',
    'topCertifications',
    'topCourses'
  ])

  // The server embeds the current analytics payload into the page so the client
  // only mounts charts and handles interactions instead of refetching and
  // rebuilding the whole dashboard UI.
  const state = JSON.parse(stateElement.textContent || '{}')
  const charts = state.charts || {}
  const filterOptions = state.filterOptions || {}
  const appliedFilters = {
    from: state.appliedFilters?.from || '',
    to: state.appliedFilters?.to || '',
    degreeTitle: state.appliedFilters?.degreeTitle || '',
    credentialDomain: state.appliedFilters?.credentialDomain || '',
    careerCategory: state.appliedFilters?.careerCategory || '',
    search: state.appliedFilters?.search || ''
  }

  const reportSelectors = document.querySelector('#report-selectors')

  const buildTooltipLabel = (context) => {
    const value = typeof context.raw === 'number' ? context.raw : context.formattedValue
    return `${context.label}: ${value}`
  }

  const isChartSelectable = (chartId) => selectableChartIds.has(chartId)

  const buildNextFilters = (chartId, item) => {
    const nextFilters = { ...appliedFilters }

    // Clicks behave like toggle filters: clicking the active item clears that
    // specific filter, while clicking a different item drills into it.
    if (chartId === 'degreeTitles') {
      nextFilters.degreeTitle = nextFilters.degreeTitle === item.label ? '' : item.label
      return nextFilters
    }

    if (chartId === 'careerPathways') {
      const normalized = (filterOptions.careerCategories || []).find((option) => option.label === item.label)
      nextFilters.careerCategory = nextFilters.careerCategory === normalized?.key ? '' : (normalized?.key || '')
      return nextFilters
    }

    if (chartId === 'topCertifications' || chartId === 'topCourses') {
      nextFilters.search = nextFilters.search === item.label ? '' : item.label
      return nextFilters
    }

    return nextFilters
  }

  const navigateWithFilters = (filters) => {
    const nextUrl = new URL(window.location.href)
    nextUrl.search = ''

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        nextUrl.searchParams.set(key, value)
      }
    })

    window.location.assign(nextUrl.pathname + nextUrl.search)
  }

  const baseChartOptions = (chartId, chartData) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      axis: chartId === 'careerPathways' ? 'y' : 'x',
      intersect: true
    },
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
    onClick: (_event, activeElements) => {
      // Only selected charts participate in drill-in navigation. The rest stay
      // read-only so informational charts do not imply hidden filter behavior.
      if (!isChartSelectable(chartId) || !activeElements.length) {
        return
      }

      const { index } = activeElements[0]
      const item = chartData.items[index]
      if (!item) {
        return
      }

      navigateWithFilters(buildNextFilters(chartId, item))
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
      : undefined,
    onHover: (event, activeElements) => {
      if (!event?.native?.target) {
        return
      }

      event.native.target.style.cursor = isChartSelectable(chartId) && activeElements.length ? 'pointer' : 'default'
    }
  })

  const createChart = (chartId, chartData) => {
    const canvas = document.querySelector(`#chart-${chartId}`)
    if (!canvas || !chartData) {
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

    if (chartId === 'careerPathways') {
      config.options.indexAxis = 'y'
    }

    chartInstances.set(chartId, new window.Chart(canvas, config))
  }

  const exportCsv = () => {
    // Exports reuse the same embedded state the charts were rendered from, so
    // downloads always match the current filter URL and visible dashboard.
    const rows = [['Chart', 'Label', 'Value', 'Applied filters']]

    Object.values(charts).forEach((chart) => {
      chart.items.forEach((item) => {
        rows.push([
          chart.title,
          item.label,
          item.value,
          JSON.stringify(appliedFilters)
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

  const getPdfChartPlacement = (chartId, chart) => {
    const maxWidth = 515
    const maxHeight = chartId === 'qualificationMix' || chartId === 'certificationCoverage' ? 300 : 360
    const canvasWidth = chart.canvas?.width || maxWidth
    const canvasHeight = chart.canvas?.height || maxHeight
    const widthRatio = maxWidth / canvasWidth
    const heightRatio = maxHeight / canvasHeight
    const scale = Math.min(widthRatio, heightRatio, 1)

    return {
      width: Math.round(canvasWidth * scale),
      height: Math.round(canvasHeight * scale)
    }
  }

  const generatePdfReport = () => {
    if (!window.jspdf?.jsPDF) {
      return
    }

    const selectedChartIds = Array.from(reportSelectors?.querySelectorAll('input:checked') || [])
      .map((input) => input.value)
      .filter((chartId) => chartInstances.has(chartId) && charts[chartId])

    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' })
    let y = 40

    doc.setFontSize(18)
    doc.text('CW2 Alumni Analytics Report', 40, y)
    y += 24

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toISOString()}`, 40, y)
    y += 16
    doc.text(`Filters: ${JSON.stringify(appliedFilters)}`, 40, y, { maxWidth: 515 })
    y += 28

    ;(state.summary || []).forEach((item) => {
      doc.text(`${item.label}: ${item.value}`, 40, y)
      y += 14
    })

    y += 14

    selectedChartIds.forEach((chartId, index) => {
      const chart = chartInstances.get(chartId)
      const chartMeta = charts[chartId]
      if (!chart || !chartMeta) {
        return
      }

      if (index > 0) {
        doc.addPage()
        y = 40
      }

      const imagePlacement = getPdfChartPlacement(chartId, chart)
      const chartX = 40 + ((515 - imagePlacement.width) / 2)

      doc.setFontSize(14)
      doc.text(chartMeta.title, 40, y)
      y += 14
      doc.setFontSize(10)
      doc.text(chartMeta.subtitle, 40, y, { maxWidth: 515 })
      y += 16
      doc.addImage(
        chart.canvas.toDataURL('image/png'),
        'PNG',
        chartX,
        y,
        imagePlacement.width,
        imagePlacement.height
      )
    })

    doc.save('alumni-analytics-report.pdf')
  }

  const attachEventListeners = () => {
    const exportButton = document.querySelector('#export-csv')
    const pdfButton = document.querySelector('#generate-report')

    exportButton?.addEventListener('click', exportCsv)
    pdfButton?.addEventListener('click', generatePdfReport)

    document.querySelectorAll('.chart-download').forEach((button) => {
      button.addEventListener('click', () => {
        downloadChartImage(button.dataset.chartDownload)
      })
    })
  }

  chartConfigOrder.forEach((chartId) => {
    createChart(chartId, charts[chartId])
  })

  attachEventListeners()
})()
