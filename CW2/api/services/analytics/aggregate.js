const { getMonthKey } = require('./normalize')

// Convert a Map like:
//   "BSc Computer Science" -> { count: 12, details: [...] }
// into the chart item shape consumed by the view layer.
//
// results are ranked by descending count so the top N charts show the most
// common items first. When counts tie, we sort alphabetically by label so the
// output stays stable across requests instead of depending on Map insertion
// order.
const rankCounts = (items, limit = 8) => {
  const rankedEntries = [...items.entries()].sort((left, right) => {
    const countDifference = right[1].count - left[1].count

    if (countDifference !== 0) {
      return countDifference
    }

    return left[0].localeCompare(right[0])
  })

  return rankedEntries.slice(0, limit).map(([label, value]) => ({
    label,
    value: value.count,
    details: value.details
  }))
}

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
  // These filters decide whether an alumni belongs in the cohort at all. Date
  // filters are applied later per record because one alumni can have both
  // in-range and out-of-range degrees or credentials.
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
    // Timeline counts should reflect the same filtered credential set shown in
    // the top-N charts, so the month bucket is only incremented after the
    // record survives the date-range check.
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
  // Career charts intentionally use only current roles. Historical employments
  // still exist on alumni profiles but would distort the "where are they now"
  // pathway view in the dashboard.
  for (const employment of alumni.currentEmployments) {
    state.allDates.push(employment.startDate)
    state.filteredCurrentEmployments.push({ ...employment, alumniName: alumni.name })
    incrementCount(state.careerCounts, employment.category.label, `${employment.jobTitle} @ ${employment.company}`)
  }
}

const buildAnalyticsAggregates = (normalized, filters = {}) => {
  // The aggregate pass is: 1) keep alumni matching cohort filters, 2) collect
  // in-range records into shared state, 3) derive chart-ready counts and
  // averages from that single traversal.
  const filteredAlumni = normalized.filter((alumni) => matchesFilters(alumni, filters))
  const state = createCollectorState()

  for (const alumni of filteredAlumni) {
    collectDegrees(alumni, filters, state)
    collectCredentialGroup(alumni.certifications, alumni.name, filters, 'filteredCertifications', 'certificationCounts', 'providerName', state)
    collectCredentialGroup(alumni.courses, alumni.name, filters, 'filteredCourses', 'courseCounts', 'providerName', state)
    collectCredentialGroup(alumni.licences, alumni.name, filters, 'filteredLicences', null, 'title', state)
    collectEmployments(alumni, state)
  }

  // Coverage is measured per alumni, not per certification record. One alumni
  // with five certifications still counts as one "covered" alumni.
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
