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
