const { CAREER_RULES, CHART_COLORS, DOMAIN_RULES } = require('./config')
const { buildInsights } = require('./insights')

const buildChart = ({ id, type, title, subtitle, labels, datasets, items, xLabel = null, yLabel = null }) => ({
  id,
  type,
  title,
  subtitle,
  labels,
  datasets,
  items,
  axisLabels: {
    x: xLabel,
    y: yLabel
  }
})

const buildFilterOptions = (normalized, dateBounds) => ({
  degreeTitles: [...new Set(normalized.flatMap((alumni) => alumni.degrees.map((degree) => degree.title)))].sort(),
  credentialDomains: DOMAIN_RULES.map((rule) => ({ key: rule.key, label: rule.label })),
  careerCategories: [...CAREER_RULES.map((rule) => ({ key: rule.key, label: rule.label })), { key: 'other', label: 'Other' }],
  dateBounds: {
    min: dateBounds[0] || null,
    max: dateBounds[dateBounds.length - 1] || null
  }
})

const buildSummary = (counts) => [
  { label: 'Filtered alumni', value: counts.filteredAlumni, tone: 'neutral' },
  { label: 'Degree records', value: counts.filteredDegrees, tone: 'primary' },
  { label: 'Certifications', value: counts.filteredCertifications, tone: 'highlight' },
  { label: 'Courses', value: counts.filteredCourses, tone: 'positive' },
  { label: 'Current roles', value: counts.filteredCurrentEmployments, tone: 'accent' },
  {
    label: 'Certification coverage',
    value: `${counts.filteredAlumni ? Math.round((counts.alumniWithCertifications / counts.filteredAlumni) * 100) : 0}%`,
    tone: counts.alumniWithCertifications >= counts.alumniWithoutCertifications ? 'positive' : 'alert'
  }
]

const buildCharts = (aggregates) => {
  const {
    degreeItems,
    certificationItems,
    courseItems,
    careerItems,
    timelineItems,
    counts,
    averages
  } = aggregates

  return {
    degreeTitles: buildChart({
      id: 'degreeTitles',
      type: 'bar',
      title: 'Top Degree Titles',
      subtitle: 'Most common academic backgrounds.',
      labels: degreeItems.map((item) => item.label),
      items: degreeItems,
      datasets: [{
        label: 'Degree count',
        data: degreeItems.map((item) => item.value),
        backgroundColor: CHART_COLORS.primarySoft,
        borderColor: CHART_COLORS.primary,
        borderWidth: 1
      }],
      xLabel: 'Degree title',
      yLabel: 'Count'
    }),
    qualificationMix: buildChart({
      id: 'qualificationMix',
      type: 'doughnut',
      title: 'Qualification Mix',
      subtitle: 'Mix of degrees and post-graduation credentials.',
      labels: ['Degrees', 'Certifications', 'Licences', 'Courses'],
      items: [
        { label: 'Degrees', value: counts.filteredDegrees, details: [] },
        { label: 'Certifications', value: counts.filteredCertifications, details: [] },
        { label: 'Licences', value: counts.filteredLicences, details: [] },
        { label: 'Courses', value: counts.filteredCourses, details: [] }
      ],
      datasets: [{
        label: 'Qualification mix',
        data: [counts.filteredDegrees, counts.filteredCertifications, counts.filteredLicences, counts.filteredCourses],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.highlight, CHART_COLORS.positive]
      }]
    }),
    learningTimeline: buildChart({
      id: 'learningTimeline',
      type: 'line',
      title: 'Learning Completions Over Time',
      subtitle: 'Credentials and courses completed across the filtered cohort.',
      labels: timelineItems.map((item) => item.label),
      items: timelineItems,
      datasets: [{
        label: 'Completions',
        data: timelineItems.map((item) => item.value),
        borderColor: CHART_COLORS.accent,
        backgroundColor: CHART_COLORS.accentSoft,
        tension: 0.35,
        fill: true
      }],
      xLabel: 'Month',
      yLabel: 'Completions'
    }),
    topCertifications: buildChart({
      id: 'topCertifications',
      type: 'bar',
      title: 'Top Certifications',
      subtitle: 'Most commonly completed certifications.',
      labels: certificationItems.map((item) => item.label),
      items: certificationItems,
      datasets: [{
        label: 'Certification count',
        data: certificationItems.map((item) => item.value),
        backgroundColor: CHART_COLORS.highlightSoft,
        borderColor: CHART_COLORS.highlight,
        borderWidth: 1
      }],
      xLabel: 'Certification',
      yLabel: 'Count'
    }),
    topCourses: buildChart({
      id: 'topCourses',
      type: 'bar',
      title: 'Top Courses',
      subtitle: 'Most commonly completed short courses.',
      labels: courseItems.map((item) => item.label),
      items: courseItems,
      datasets: [{
        label: 'Course count',
        data: courseItems.map((item) => item.value),
        backgroundColor: CHART_COLORS.positiveSoft,
        borderColor: CHART_COLORS.positive,
        borderWidth: 1
      }],
      xLabel: 'Course',
      yLabel: 'Count'
    }),
    certificationCoverage: buildChart({
      id: 'certificationCoverage',
      type: 'pie',
      title: 'Certification Coverage',
      subtitle: 'Alumni with and without certifications.',
      labels: ['With certifications', 'Without certifications'],
      items: [
        { label: 'With certifications', value: counts.alumniWithCertifications, details: [] },
        { label: 'Without certifications', value: counts.alumniWithoutCertifications, details: [] }
      ],
      datasets: [{
        label: 'Coverage',
        data: [counts.alumniWithCertifications, counts.alumniWithoutCertifications],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.alert]
      }]
    }),
    careerPathways: buildChart({
      id: 'careerPathways',
      type: 'bar',
      title: 'Current Career Pathways',
      subtitle: 'Active current roles grouped into derived pathways.',
      labels: careerItems.map((item) => item.label),
      items: careerItems,
      datasets: [{
        label: 'Current roles',
        data: careerItems.map((item) => item.value),
        backgroundColor: CHART_COLORS.accentSoft,
        borderColor: CHART_COLORS.accent,
        borderWidth: 1
      }],
      xLabel: 'Pathway',
      yLabel: 'Current roles'
    }),
    developmentRadar: buildChart({
      id: 'developmentRadar',
      type: 'radar',
      title: 'Development Profile',
      subtitle: 'Average profile depth for the filtered alumni cohort.',
      labels: ['Degrees', 'Certifications', 'Licences', 'Courses', 'Current roles'],
      items: [
        { label: 'Degrees', value: averages.degreeAverage, details: [] },
        { label: 'Certifications', value: averages.certificationAverage, details: [] },
        { label: 'Licences', value: averages.licenceAverage, details: [] },
        { label: 'Courses', value: averages.courseAverage, details: [] },
        { label: 'Current roles', value: averages.employmentAverage, details: [] }
      ],
      datasets: [{
        label: 'Average items per alumni',
        data: [averages.degreeAverage, averages.certificationAverage, averages.licenceAverage, averages.courseAverage, averages.employmentAverage],
        borderColor: CHART_COLORS.neutral,
        backgroundColor: 'rgba(51, 65, 85, 0.2)',
        pointBackgroundColor: CHART_COLORS.primary
      }]
    })
  }
}

const buildAppliedFilters = (filters) => ({
  from: filters.from || '',
  to: filters.to || '',
  degreeTitle: filters.degreeTitle || '',
  credentialDomain: filters.credentialDomain || '',
  careerCategory: filters.careerCategory || '',
  search: filters.search || ''
})

const buildAnalyticsResponse = ({ filters, normalized, aggregates }) => ({
  generatedAt: new Date().toISOString(),
  appliedFilters: buildAppliedFilters(filters),
  filterOptions: buildFilterOptions(normalized, aggregates.dateBounds),
  summary: buildSummary(aggregates.counts),
  insights: buildInsights(aggregates),
  charts: buildCharts(aggregates)
})

module.exports = {
  buildAnalyticsResponse
}
