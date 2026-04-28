const findLeadingGroup = (items, selectGroup) => {
  const groups = new Map()

  items.forEach((item) => {
    const group = selectGroup(item)
    if (!group?.key || !group?.label) {
      return
    }

    if (!groups.has(group.key)) {
      groups.set(group.key, {
        key: group.key,
        label: group.label,
        count: 0
      })
    }

    groups.get(group.key).count += 1
  })

  return [...groups.values()]
    .filter((group) => group.label !== 'Other')
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))[0]
}

const buildInsights = ({ filteredAlumni, filteredCourses, filteredCurrentEmployments, timelineCounts, counts }) => {
  const insights = []
  const certificationCoverage = counts.filteredAlumni === 0
    ? 0
    : Math.round((filteredAlumni.filter((item) => item.certifications.length > 0).length / counts.filteredAlumni) * 100)

  if (certificationCoverage < 45) {
    insights.push({
      severity: 'critical',
      title: 'Certification adoption is still low',
      description: `${certificationCoverage}% of the filtered alumni cohort currently lists at least one certification.`,
      metric: 'Certification coverage',
      currentValue: certificationCoverage
    })
  }

  const leadingCourseDomain = findLeadingGroup(filteredCourses, (course) => course.domain)
  const courseShare = !leadingCourseDomain || filteredCourses.length === 0
    ? 0
    : Math.round((leadingCourseDomain.count / filteredCourses.length) * 100)

  if (courseShare >= 20) {
    insights.push({
      severity: 'significant',
      title: `${leadingCourseDomain.label} learning remains a major upskilling theme`,
      description: `${courseShare}% of filtered course completions fall into ${leadingCourseDomain.label} related learning.`,
      metric: `${leadingCourseDomain.label} course share`,
      currentValue: courseShare
    })
  }

  const leadingCareerCategory = findLeadingGroup(filteredCurrentEmployments, (employment) => employment.category)
  if (leadingCareerCategory && leadingCareerCategory.count > 0) {
    insights.push({
      severity: 'emerging',
      title: `${leadingCareerCategory.label} remains an active pathway`,
      description: `${leadingCareerCategory.count} current roles in the filtered cohort are classified into ${leadingCareerCategory.label} pathways.`,
      metric: `${leadingCareerCategory.label} roles`,
      currentValue: leadingCareerCategory.count
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

module.exports = {
  buildInsights
}
