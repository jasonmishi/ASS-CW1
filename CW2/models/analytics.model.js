const prisma = require('../lib/prisma')

const CHART_COLORS = {
  primary: '#0f766e',
  primarySoft: '#5eead4',
  accent: '#ea580c',
  accentSoft: '#fdba74',
  alert: '#dc2626',
  alertSoft: '#fca5a5',
  neutral: '#334155',
  neutralSoft: '#cbd5e1',
  positive: '#16a34a',
  positiveSoft: '#86efac',
  highlight: '#7c3aed',
  highlightSoft: '#c4b5fd'
}

const DOMAIN_RULES = [
  { key: 'cloud', label: 'Cloud', patterns: [/\baws\b/i, /amazon web services/i, /azure/i, /\bgcp\b/i, /google cloud/i, /cloud/i] },
  { key: 'container-orchestration', label: 'Container Orchestration', patterns: [/kubernetes/i, /\bcka\b/i, /\bckad\b/i, /openshift/i, /container/i, /docker/i] },
  { key: 'agile-scrum', label: 'Agile\/Scrum', patterns: [/agile/i, /scrum/i, /\bcsm\b/i, /\bpsm\b/i, /product owner/i] },
  { key: 'data', label: 'Data', patterns: [/data/i, /analytics/i, /bi /i, /business intelligence/i, /machine learning/i, /sql/i] },
  { key: 'security', label: 'Security', patterns: [/security/i, /cyber/i, /cissp/i, /iso 27001/i, /penetration/i] },
  { key: 'management', label: 'Management', patterns: [/management/i, /leadership/i, /project/i, /programme/i, /program/i, /mba/i] }
]

const CAREER_RULES = [
  { key: 'software-engineering', label: 'Software Engineering', patterns: [/software/i, /developer/i, /engineer/i, /full stack/i, /backend/i, /frontend/i, /devops/i] },
  { key: 'data-analytics', label: 'Data Analytics', patterns: [/data analyst/i, /analytics/i, /bi /i, /business intelligence/i, /data science/i, /reporting/i] },
  { key: 'product', label: 'Product', patterns: [/product/i, /ux/i, /ui/i, /designer/i] },
  { key: 'management', label: 'Management', patterns: [/manager/i, /management/i, /director/i, /lead/i, /head of/i] },
  { key: 'consulting', label: 'Consulting', patterns: [/consultant/i, /consulting/i, /advisor/i] },
  { key: 'cybersecurity', label: 'Cybersecurity', patterns: [/security/i, /cyber/i, /soc/i, /infosec/i] }
]

const toIsoDate = (value) => {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

const isWithinDateRange = (value, filters) => {
  if (!value) {
    return true
  }

  const iso = toIsoDate(value)

  if (filters.from && iso < filters.from) {
    return false
  }

  if (filters.to && iso > filters.to) {
    return false
  }

  return true
}

const classifyByRules = (text, rules, fallbackKey, fallbackLabel) => {
  const haystack = (text || '').trim()

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return {
        key: rule.key,
        label: rule.label
      }
    }
  }

  return {
    key: fallbackKey,
    label: fallbackLabel
  }
}

const rankCounts = (items, limit = 8) => {
  return [...items.entries()]
    .sort((left, right) => {
      if (right[1].count !== left[1].count) {
        return right[1].count - left[1].count
      }

      return left[0].localeCompare(right[0])
    })
    .slice(0, limit)
    .map(([label, value]) => ({
      label,
      value: value.count,
      details: value.details
    }))
}

const incrementCount = (map, label, detailValue) => {
  if (!label) {
    return
  }

  if (!map.has(label)) {
    map.set(label, {
      count: 0,
      details: []
    })
  }

  const entry = map.get(label)
  entry.count += 1

  if (detailValue && entry.details.length < 6 && !entry.details.includes(detailValue)) {
    entry.details.push(detailValue)
  }
}

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

const normalizeAlumni = (user) => {
  const credentials = user.credentials.map((credential) => {
    const domain = classifyByRules(
      `${credential.title} ${credential.provider_name}`,
      DOMAIN_RULES,
      'other',
      'Other'
    )

    return {
      id: credential.credential_id,
      type: credential.credential_type,
      title: credential.title,
      providerName: credential.provider_name,
      completionDate: toIsoDate(credential.completion_date),
      domain
    }
  })

  const employments = user.employments.map((employment) => {
    const category = classifyByRules(employment.job_title, CAREER_RULES, 'other', 'Other')

    return {
      id: employment.employment_id,
      jobTitle: employment.job_title,
      company: employment.company,
      startDate: toIsoDate(employment.start_date),
      endDate: toIsoDate(employment.end_date),
      isCurrent: !employment.end_date,
      category
    }
  })

  return {
    userId: user.user_id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    degrees: user.degrees.map((degree) => ({
      id: degree.degree_id,
      title: degree.title,
      university: degree.university,
      completionDate: toIsoDate(degree.completion_date)
    })),
    certifications: credentials.filter((credential) => credential.type === 'certification'),
    licences: credentials.filter((credential) => credential.type === 'licence'),
    courses: credentials.filter((credential) => credential.type === 'course'),
    credentials,
    employments,
    currentEmployments: employments.filter((employment) => employment.isCurrent)
  }
}

const matchesSearch = (alumni, query) => {
  if (!query) {
    return true
  }

  const search = query.toLowerCase()
  const haystacks = [
    alumni.name,
    alumni.email,
    ...alumni.degrees.map((degree) => `${degree.title} ${degree.university}`),
    ...alumni.credentials.map((credential) => `${credential.title} ${credential.providerName} ${credential.domain.label}`),
    ...alumni.employments.map((employment) => `${employment.jobTitle} ${employment.company} ${employment.category.label}`)
  ]

  return haystacks.some((value) => value.toLowerCase().includes(search))
}

const matchesFilters = (alumni, filters) => {
  if (filters.degreeTitle && !alumni.degrees.some((degree) => degree.title === filters.degreeTitle)) {
    return false
  }

  if (filters.credentialDomain && !alumni.credentials.some((credential) => credential.domain.key === filters.credentialDomain)) {
    return false
  }

  if (filters.careerCategory && !alumni.currentEmployments.some((employment) => employment.category.key === filters.careerCategory)) {
    return false
  }

  return matchesSearch(alumni, filters.search)
}

const getMonthKey = (value) => {
  return value ? value.slice(0, 7) : null
}

const buildInsights = ({ alumni, certifications, courses, currentEmployments, timelineCounts }) => {
  const insights = []
  const certificationCoverage = alumni.length === 0
    ? 0
    : Math.round((alumni.filter((item) => item.certifications.length > 0).length / alumni.length) * 100)

  if (certificationCoverage < 45) {
    insights.push({
      severity: 'critical',
      title: 'Certification adoption is still low',
      description: `${certificationCoverage}% of the filtered alumni cohort currently lists at least one certification.`,
      metric: 'Certification coverage',
      currentValue: certificationCoverage
    })
  }

  const agileCourses = courses.filter((course) => course.domain.key === 'agile-scrum').length
  const courseShare = courses.length === 0 ? 0 : Math.round((agileCourses / courses.length) * 100)

  if (courseShare >= 20) {
    insights.push({
      severity: 'significant',
      title: 'Agile and Scrum learning remains a major upskilling theme',
      description: `${courseShare}% of filtered course completions fall into Agile or Scrum related learning.`,
      metric: 'Agile course share',
      currentValue: courseShare
    })
  }

  const dataRoles = currentEmployments.filter((employment) => employment.category.key === 'data-analytics').length
  if (dataRoles > 0) {
    insights.push({
      severity: 'emerging',
      title: 'Data analytics remains an active pathway',
      description: `${dataRoles} current roles in the filtered cohort are classified into data and analytics pathways.`,
      metric: 'Data analytics roles',
      currentValue: dataRoles
    })
  }

  const sortedTimeline = [...timelineCounts.entries()].sort((left, right) => left[0].localeCompare(right[0]))
  if (sortedTimeline.length >= 2) {
    const latest = sortedTimeline[sortedTimeline.length - 1][1].count
    const previous = sortedTimeline[sortedTimeline.length - 2][1].count
    if (latest > previous) {
      insights.push({
        severity: 'emerging',
        title: 'Recent learning completions are trending upward',
        description: `The most recent recorded period shows ${latest} completions versus ${previous} in the prior period.`,
        metric: 'Learning momentum',
        currentValue: latest,
        comparisonValue: previous
      })
    }
  }

  return insights.slice(0, 4)
}

const getAlumniDashboardAnalytics = async (filters = {}) => {
  const alumniUsers = await prisma.user.findMany({
    where: {
      role: {
        name: 'alumni'
      }
    },
    include: {
      profile: true,
      degrees: {
        orderBy: {
          completion_date: 'desc'
        }
      },
      credentials: {
        orderBy: {
          completion_date: 'desc'
        }
      },
      employments: {
        orderBy: {
          start_date: 'desc'
        }
      }
    }
  })

  const normalized = alumniUsers.map(normalizeAlumni)
  const filteredAlumni = normalized.filter((alumni) => matchesFilters(alumni, filters))

  const allDates = []
  const degreeCounts = new Map()
  const certificationCounts = new Map()
  const courseCounts = new Map()
  const careerCounts = new Map()
  const timelineCounts = new Map()

  const filteredDegrees = []
  const filteredCertifications = []
  const filteredCourses = []
  const filteredLicences = []
  const filteredCurrentEmployments = []

  for (const alumni of filteredAlumni) {
    for (const degree of alumni.degrees) {
      allDates.push(degree.completionDate)
      if (isWithinDateRange(degree.completionDate, filters)) {
        filteredDegrees.push({ ...degree, alumniName: alumni.name })
        incrementCount(degreeCounts, degree.title, alumni.name)
      }
    }

    for (const certification of alumni.certifications) {
      allDates.push(certification.completionDate)
      if (isWithinDateRange(certification.completionDate, filters)) {
        filteredCertifications.push({ ...certification, alumniName: alumni.name })
        incrementCount(certificationCounts, certification.title, certification.providerName)
        const monthKey = getMonthKey(certification.completionDate)
        incrementCount(timelineCounts, monthKey, certification.title)
      }
    }

    for (const course of alumni.courses) {
      allDates.push(course.completionDate)
      if (isWithinDateRange(course.completionDate, filters)) {
        filteredCourses.push({ ...course, alumniName: alumni.name })
        incrementCount(courseCounts, course.title, course.providerName)
        const monthKey = getMonthKey(course.completionDate)
        incrementCount(timelineCounts, monthKey, course.title)
      }
    }

    for (const licence of alumni.licences) {
      allDates.push(licence.completionDate)
      if (isWithinDateRange(licence.completionDate, filters)) {
        filteredLicences.push({ ...licence, alumniName: alumni.name })
        const monthKey = getMonthKey(licence.completionDate)
        incrementCount(timelineCounts, monthKey, licence.title)
      }
    }

    for (const employment of alumni.currentEmployments) {
      allDates.push(employment.startDate)
      filteredCurrentEmployments.push({ ...employment, alumniName: alumni.name })
      incrementCount(careerCounts, employment.category.label, `${employment.jobTitle} @ ${employment.company}`)
    }
  }

  const degreeItems = rankCounts(degreeCounts)
  const certificationItems = rankCounts(certificationCounts)
  const courseItems = rankCounts(courseCounts)
  const careerItems = rankCounts(careerCounts)
  const timelineItems = [...timelineCounts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, value]) => ({
      label,
      value: value.count,
      details: value.details
    }))

  const alumniWithCertifications = filteredAlumni.filter((alumni) => alumni.certifications.length > 0).length
  const alumniWithoutCertifications = Math.max(filteredAlumni.length - alumniWithCertifications, 0)

  const degreeAverage = filteredAlumni.length ? Number((filteredDegrees.length / filteredAlumni.length).toFixed(2)) : 0
  const certificationAverage = filteredAlumni.length ? Number((filteredCertifications.length / filteredAlumni.length).toFixed(2)) : 0
  const licenceAverage = filteredAlumni.length ? Number((filteredLicences.length / filteredAlumni.length).toFixed(2)) : 0
  const courseAverage = filteredAlumni.length ? Number((filteredCourses.length / filteredAlumni.length).toFixed(2)) : 0
  const employmentAverage = filteredAlumni.length ? Number((filteredCurrentEmployments.length / filteredAlumni.length).toFixed(2)) : 0

  const dateBounds = allDates.filter(Boolean).sort()

  const filterOptions = {
    degreeTitles: [...new Set(normalized.flatMap((alumni) => alumni.degrees.map((degree) => degree.title)))].sort(),
    credentialDomains: DOMAIN_RULES.map((rule) => ({ key: rule.key, label: rule.label })),
    careerCategories: [...CAREER_RULES.map((rule) => ({ key: rule.key, label: rule.label })), { key: 'other', label: 'Other' }],
    dateBounds: {
      min: dateBounds[0] || null,
      max: dateBounds[dateBounds.length - 1] || null
    }
  }

  const charts = {
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
        { label: 'Degrees', value: filteredDegrees.length, details: [] },
        { label: 'Certifications', value: filteredCertifications.length, details: [] },
        { label: 'Licences', value: filteredLicences.length, details: [] },
        { label: 'Courses', value: filteredCourses.length, details: [] }
      ],
      datasets: [{
        label: 'Qualification mix',
        data: [filteredDegrees.length, filteredCertifications.length, filteredLicences.length, filteredCourses.length],
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
        { label: 'With certifications', value: alumniWithCertifications, details: [] },
        { label: 'Without certifications', value: alumniWithoutCertifications, details: [] }
      ],
      datasets: [{
        label: 'Coverage',
        data: [alumniWithCertifications, alumniWithoutCertifications],
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
        { label: 'Degrees', value: degreeAverage, details: [] },
        { label: 'Certifications', value: certificationAverage, details: [] },
        { label: 'Licences', value: licenceAverage, details: [] },
        { label: 'Courses', value: courseAverage, details: [] },
        { label: 'Current roles', value: employmentAverage, details: [] }
      ],
      datasets: [{
        label: 'Average items per alumni',
        data: [degreeAverage, certificationAverage, licenceAverage, courseAverage, employmentAverage],
        borderColor: CHART_COLORS.neutral,
        backgroundColor: 'rgba(51, 65, 85, 0.2)',
        pointBackgroundColor: CHART_COLORS.primary
      }]
    })
  }

  const summary = [
    { label: 'Filtered alumni', value: filteredAlumni.length, tone: 'neutral' },
    { label: 'Degree records', value: filteredDegrees.length, tone: 'primary' },
    { label: 'Certifications', value: filteredCertifications.length, tone: 'highlight' },
    { label: 'Courses', value: filteredCourses.length, tone: 'positive' },
    { label: 'Current roles', value: filteredCurrentEmployments.length, tone: 'accent' },
    {
      label: 'Certification coverage',
      value: `${filteredAlumni.length ? Math.round((alumniWithCertifications / filteredAlumni.length) * 100) : 0}%`,
      tone: alumniWithCertifications >= alumniWithoutCertifications ? 'positive' : 'alert'
    }
  ]

  return {
    generatedAt: new Date().toISOString(),
    appliedFilters: {
      from: filters.from || '',
      to: filters.to || '',
      degreeTitle: filters.degreeTitle || '',
      credentialDomain: filters.credentialDomain || '',
      careerCategory: filters.careerCategory || '',
      search: filters.search || ''
    },
    filterOptions,
    summary,
    insights: buildInsights({
      alumni: filteredAlumni,
      certifications: filteredCertifications,
      courses: filteredCourses,
      currentEmployments: filteredCurrentEmployments,
      timelineCounts
    }),
    charts
  }
}

module.exports = {
  CAREER_RULES,
  DOMAIN_RULES,
  getAlumniDashboardAnalytics
}
