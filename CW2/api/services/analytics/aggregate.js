const { getMonthKey } = require('./normalize')

const rankCounts = (items, limit = 8) => [...items.entries()]
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

const mapCountsToItems = (items) => [...items.entries()]
  .sort((left, right) => left[0].localeCompare(right[0]))
  .map(([label, value]) => ({
    label,
    value: value.count,
    details: value.details
  }))

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

const isWithinDateRange = (value, filters) => {
  if (!value) {
    return true
  }

  if (filters.from && value < filters.from) {
    return false
  }

  if (filters.to && value > filters.to) {
    return false
  }

  return true
}

const createCollectorState = () => ({
  allDates: [],
  degreeCounts: new Map(),
  certificationCounts: new Map(),
  courseCounts: new Map(),
  careerCounts: new Map(),
  timelineCounts: new Map(),
  filteredDegrees: [],
  filteredCertifications: [],
  filteredCourses: [],
  filteredLicences: [],
  filteredCurrentEmployments: []
})

const collectDegrees = (alumni, filters, state) => {
  for (const degree of alumni.degrees) {
    state.allDates.push(degree.completionDate)

    if (!isWithinDateRange(degree.completionDate, filters)) {
      continue
    }

    state.filteredDegrees.push({ ...degree, alumniName: alumni.name })
    incrementCount(state.degreeCounts, degree.title, alumni.name)
  }
}

const collectCredentialGroup = (records, alumniName, filters, stateKey, countKey, detailKey, timelineCounts) => {
  for (const record of records) {
    timelineCounts.allDates.push(record.completionDate)

    if (!isWithinDateRange(record.completionDate, filters)) {
      continue
    }

    timelineCounts[stateKey].push({ ...record, alumniName })

    if (countKey) {
      incrementCount(timelineCounts[countKey], record.title, record[detailKey])
    }

    incrementCount(timelineCounts.timelineCounts, getMonthKey(record.completionDate), record.title)
  }
}

const collectEmployments = (alumni, state) => {
  for (const employment of alumni.currentEmployments) {
    state.allDates.push(employment.startDate)
    state.filteredCurrentEmployments.push({ ...employment, alumniName: alumni.name })
    incrementCount(state.careerCounts, employment.category.label, `${employment.jobTitle} @ ${employment.company}`)
  }
}

const buildAnalyticsAggregates = (normalized, filters = {}) => {
  const filteredAlumni = normalized.filter((alumni) => matchesFilters(alumni, filters))
  const state = createCollectorState()

  for (const alumni of filteredAlumni) {
    collectDegrees(alumni, filters, state)
    collectCredentialGroup(alumni.certifications, alumni.name, filters, 'filteredCertifications', 'certificationCounts', 'providerName', state)
    collectCredentialGroup(alumni.courses, alumni.name, filters, 'filteredCourses', 'courseCounts', 'providerName', state)
    collectCredentialGroup(alumni.licences, alumni.name, filters, 'filteredLicences', null, 'title', state)
    collectEmployments(alumni, state)
  }

  const alumniWithCertifications = filteredAlumni.filter((alumni) => alumni.certifications.length > 0).length
  const filteredAlumniCount = filteredAlumni.length

  return {
    filteredAlumni,
    filteredDegrees: state.filteredDegrees,
    filteredCertifications: state.filteredCertifications,
    filteredCourses: state.filteredCourses,
    filteredLicences: state.filteredLicences,
    filteredCurrentEmployments: state.filteredCurrentEmployments,
    degreeItems: rankCounts(state.degreeCounts),
    certificationItems: rankCounts(state.certificationCounts),
    courseItems: rankCounts(state.courseCounts),
    careerItems: rankCounts(state.careerCounts),
    timelineItems: mapCountsToItems(state.timelineCounts),
    timelineCounts: state.timelineCounts,
    dateBounds: state.allDates.filter(Boolean).sort(),
    counts: {
      filteredAlumni: filteredAlumniCount,
      filteredDegrees: state.filteredDegrees.length,
      filteredCertifications: state.filteredCertifications.length,
      filteredCourses: state.filteredCourses.length,
      filteredLicences: state.filteredLicences.length,
      filteredCurrentEmployments: state.filteredCurrentEmployments.length,
      alumniWithCertifications,
      alumniWithoutCertifications: Math.max(filteredAlumniCount - alumniWithCertifications, 0)
    },
    averages: {
      degreeAverage: filteredAlumniCount ? Number((state.filteredDegrees.length / filteredAlumniCount).toFixed(2)) : 0,
      certificationAverage: filteredAlumniCount ? Number((state.filteredCertifications.length / filteredAlumniCount).toFixed(2)) : 0,
      licenceAverage: filteredAlumniCount ? Number((state.filteredLicences.length / filteredAlumniCount).toFixed(2)) : 0,
      courseAverage: filteredAlumniCount ? Number((state.filteredCourses.length / filteredAlumniCount).toFixed(2)) : 0,
      employmentAverage: filteredAlumniCount ? Number((state.filteredCurrentEmployments.length / filteredAlumniCount).toFixed(2)) : 0
    }
  }
}

module.exports = {
  buildAnalyticsAggregates
}
