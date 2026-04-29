const prisma = require('../lib/prisma')
const { hashPassword } = require('../utils/security')

const DEMO_PASSWORD = 'Strong!Pass1'

const alumniSeed = [
  {
    email: 'alex.turner@eastminster.ac.uk',
    firstName: 'Alex',
    lastName: 'Turner',
    biography: 'Cloud-focused engineering alumnus with a strong certification trail.',
    linkedinUrl: 'https://www.linkedin.com/in/alex-turner-demo',
    degrees: [
      { title: 'BSc Computer Science', university: 'University of Eastminster', degreeUrl: 'https://example.com/degrees/bsc-cs', completionDate: '2020-07-10' }
    ],
    credentials: [
      { type: 'certification', title: 'AWS Solutions Architect Associate', provider: 'Amazon Web Services', url: 'https://example.com/aws-saa', completionDate: '2023-05-12' },
      { type: 'certification', title: 'Certified Kubernetes Administrator', provider: 'CNCF', url: 'https://example.com/cka', completionDate: '2024-02-02' },
      { type: 'course', title: 'Advanced Docker and Kubernetes', provider: 'KodeKloud', url: 'https://example.com/docker-k8s', completionDate: '2024-03-15' }
    ],
    employments: [
      { jobTitle: 'Senior Software Engineer', company: 'Northwind Labs', industrySector: 'Technology', startDate: '2023-01-01', endDate: null }
    ]
  },
  {
    email: 'maya.roberts@eastminster.ac.uk',
    firstName: 'Maya',
    lastName: 'Roberts',
    biography: 'Business graduate who shifted into analytics roles through targeted courses.',
    linkedinUrl: 'https://www.linkedin.com/in/maya-roberts-demo',
    degrees: [
      { title: 'Business Management', university: 'University of Eastminster', degreeUrl: 'https://example.com/degrees/business-management', completionDate: '2019-07-10' }
    ],
    credentials: [
      { type: 'course', title: 'Data Analytics Essentials', provider: 'Coursera', url: 'https://example.com/data-analytics', completionDate: '2023-08-20' },
      { type: 'course', title: 'Professional Scrum Master', provider: 'Scrum.org', url: 'https://example.com/psm', completionDate: '2024-01-11' }
    ],
    employments: [
      { jobTitle: 'Data Analyst', company: 'Aperture Insights', industrySector: 'Consulting', startDate: '2022-06-01', endDate: null }
    ]
  },
  {
    email: 'sara.khan@eastminster.ac.uk',
    firstName: 'Sara',
    lastName: 'Khan',
    biography: 'Cybersecurity-focused alumna with a blend of engineering and assurance credentials.',
    linkedinUrl: 'https://www.linkedin.com/in/sara-khan-demo',
    degrees: [
      { title: 'BSc Computer Science', university: 'University of Eastminster', degreeUrl: 'https://example.com/degrees/bsc-cs', completionDate: '2018-07-10' }
    ],
    credentials: [
      { type: 'certification', title: 'CISSP', provider: '(ISC)2', url: 'https://example.com/cissp', completionDate: '2023-11-04' },
      { type: 'licence', title: 'ISO 27001 Lead Implementer', provider: 'PECB', url: 'https://example.com/iso27001', completionDate: '2024-04-02' }
    ],
    employments: [
      { jobTitle: 'Cyber Security Analyst', company: 'BlueShield SOC', industrySector: 'Cybersecurity', startDate: '2021-05-18', endDate: null }
    ]
  },
  {
    email: 'tom.bennett@eastminster.ac.uk',
    firstName: 'Tom',
    lastName: 'Bennett',
    biography: 'Management-track alumnus with product and agile credentials.',
    linkedinUrl: 'https://www.linkedin.com/in/tom-bennett-demo',
    degrees: [
      { title: 'Business Management', university: 'University of Eastminster', degreeUrl: 'https://example.com/degrees/business-management', completionDate: '2017-07-10' }
    ],
    credentials: [
      { type: 'course', title: 'Agile Project Management', provider: 'FutureLearn', url: 'https://example.com/agile-pm', completionDate: '2023-04-09' },
      { type: 'certification', title: 'Certified ScrumMaster', provider: 'Scrum Alliance', url: 'https://example.com/csm', completionDate: '2024-02-14' }
    ],
    employments: [
      { jobTitle: 'Product Manager', company: 'Studio Meridian', industrySector: 'Technology', startDate: '2022-02-01', endDate: null }
    ]
  },
  {
    email: 'lina.chen@eastminster.ac.uk',
    firstName: 'Lina',
    lastName: 'Chen',
    biography: 'Information systems alumna combining cloud and BI training.',
    linkedinUrl: 'https://www.linkedin.com/in/lina-chen-demo',
    degrees: [
      { title: 'BSc Information Systems', university: 'University of Eastminster', degreeUrl: 'https://example.com/degrees/information-systems', completionDate: '2021-07-10' }
    ],
    credentials: [
      { type: 'certification', title: 'Microsoft Azure Administrator', provider: 'Microsoft', url: 'https://example.com/azure-admin', completionDate: '2023-09-28' },
      { type: 'course', title: 'Business Intelligence Foundations', provider: 'LinkedIn Learning', url: 'https://example.com/bi-foundations', completionDate: '2024-03-01' }
    ],
    employments: [
      { jobTitle: 'BI Analyst', company: 'Helix Retail', industrySector: 'Retail', startDate: '2022-09-12', endDate: null }
    ]
  }
]

const firstNames = [
  'Amelia', 'Noah', 'Priya', 'Daniel', 'Grace', 'Ethan', 'Fatima', 'Leo', 'Hannah', 'Omar',
  'Isla', 'Marcus', 'Aisha', 'Jacob', 'Chloe', 'Ryan', 'Nadia', 'Callum', 'Sophie', 'Tariq',
  'Zara', 'Nathan', 'Ivy', 'Harvey', 'Mina', 'Joel', 'Ruby', 'Kieran', 'Elise', 'Samir',
  'Poppy', 'Adam', 'Yasmin', 'Finn', 'Freya', 'Bilal', 'Martha', 'Rory', 'Leila', 'Owen',
  'Anika', 'Ben', 'Tia', 'Dominic', 'Esme', 'Ali', 'Clara', 'Jonah', 'Nina', 'Reece'
]

const lastNames = [
  'Patel', 'Walker', 'Singh', 'Evans', 'Morris', 'Shah', 'Carter', 'Hughes', 'Ali', 'Reed',
  'Campbell', 'Wood', 'Baker', 'Foster', 'Mitchell', 'Ward', 'Bailey', 'Murphy', 'Cook', 'Kelly',
  'Price', 'Gray', 'James', 'Brooks', 'Cox', 'Barnes', 'Ross', 'Bennett', 'Rogers', 'Powell',
  'Diaz', 'Ahmed', 'Hussain', 'Mills', 'Grant', 'Palmer', 'Sullivan', 'Nguyen', 'Kaur', 'Walsh',
  'Doyle', 'Mason', 'Chambers', 'Fleming', 'Hudson', 'Sharma', 'Gill', 'Mehta', 'Goodwin', 'Bishop'
]

const biographies = [
  'Built a steady career by combining formal study with short upskilling sprints.',
  'Moved between operations and analytics roles after graduation.',
  'Prefers hands-on project work and keeps a low public profile.',
  'Has taken a selective approach to professional learning, focusing on practical tools.',
  'Worked across startup and enterprise teams, gradually adding specialist credentials.',
  'Career path includes a mix of internal promotions and lateral moves.',
  'Interested in mentoring and cross-functional delivery rather than collecting many badges.',
  'Progressed into a specialist role after a broad early-career foundation.'
]

const programmes = [
  { title: 'BSc Computer Science', slug: 'bsc-cs' },
  { title: 'BSc Information Systems', slug: 'bsc-is' },
  { title: 'Business Management', slug: 'business-management' },
  { title: 'BSc Data Science', slug: 'bsc-data-science' },
  { title: 'BSc Cyber Security', slug: 'bsc-cyber-security' },
  { title: 'BA Digital Marketing', slug: 'ba-digital-marketing' }
]

const secondaryProgrammes = [
  { title: 'MSc Data Analytics', slug: 'msc-data-analytics' },
  { title: 'MSc Information Security', slug: 'msc-information-security' },
  { title: 'MBA', slug: 'mba' },
  { title: 'MSc Cloud Computing', slug: 'msc-cloud-computing' }
]

const credentialsByTrack = {
  engineering: [
    { type: 'certification', title: 'AWS Developer Associate', provider: 'Amazon Web Services', slug: 'aws-developer' },
    { type: 'certification', title: 'Microsoft Azure Fundamentals', provider: 'Microsoft', slug: 'azure-fundamentals' },
    { type: 'course', title: 'Node.js Services in Practice', provider: 'Pluralsight', slug: 'node-services' },
    { type: 'course', title: 'Advanced Git Workflows', provider: 'Udemy', slug: 'advanced-git' },
    { type: 'licence', title: 'Red Hat Certified System Administrator', provider: 'Red Hat', slug: 'rhcsa' }
  ],
  data: [
    { type: 'course', title: 'SQL for Analytics', provider: 'Coursera', slug: 'sql-analytics' },
    { type: 'course', title: 'Power BI Dashboards', provider: 'Microsoft Learn', slug: 'power-bi' },
    { type: 'certification', title: 'Tableau Data Analyst', provider: 'Tableau', slug: 'tableau-analyst' },
    { type: 'certification', title: 'Google Data Analytics', provider: 'Google', slug: 'google-data-analytics' },
    { type: 'course', title: 'Python for Reporting Automation', provider: 'DataCamp', slug: 'python-reporting' }
  ],
  security: [
    { type: 'certification', title: 'CompTIA Security+', provider: 'CompTIA', slug: 'security-plus' },
    { type: 'certification', title: 'Certified in Cybersecurity', provider: '(ISC)2', slug: 'cc-isc2' },
    { type: 'licence', title: 'ISO 27001 Internal Auditor', provider: 'PECB', slug: 'iso-27001-auditor' },
    { type: 'course', title: 'Security Operations Foundations', provider: 'LinkedIn Learning', slug: 'soc-foundations' },
    { type: 'course', title: 'Practical Network Defence', provider: 'TryHackMe', slug: 'network-defence' }
  ],
  product: [
    { type: 'course', title: 'Product Discovery Fundamentals', provider: 'Mind the Product', slug: 'product-discovery' },
    { type: 'certification', title: 'Professional Scrum Product Owner', provider: 'Scrum.org', slug: 'pspo' },
    { type: 'course', title: 'UX Research Essentials', provider: 'Interaction Design Foundation', slug: 'ux-research' },
    { type: 'course', title: 'Roadmapping for Teams', provider: 'Coursera', slug: 'roadmapping' },
    { type: 'certification', title: 'Agile Leadership', provider: 'ICAgile', slug: 'agile-leadership' }
  ],
  management: [
    { type: 'course', title: 'Project Planning and Control', provider: 'FutureLearn', slug: 'project-planning' },
    { type: 'certification', title: 'PRINCE2 Foundation', provider: 'PeopleCert', slug: 'prince2-foundation' },
    { type: 'course', title: 'Leading Technical Teams', provider: 'LinkedIn Learning', slug: 'leading-teams' },
    { type: 'certification', title: 'Change Management Foundation', provider: 'APMG', slug: 'change-management' },
    { type: 'course', title: 'Finance for Non-Financial Managers', provider: 'OpenLearn', slug: 'finance-managers' }
  ],
  marketing: [
    { type: 'course', title: 'Digital Campaign Strategy', provider: 'Google Digital Garage', slug: 'campaign-strategy' },
    { type: 'certification', title: 'HubSpot Content Marketing', provider: 'HubSpot Academy', slug: 'hubspot-content' },
    { type: 'course', title: 'SEO Foundations', provider: 'Semrush Academy', slug: 'seo-foundations' },
    { type: 'course', title: 'Social Analytics Reporting', provider: 'Meta Blueprint', slug: 'social-analytics' },
    { type: 'certification', title: 'Google Ads Search', provider: 'Google', slug: 'google-ads-search' }
  ]
}

const employmentTracks = [
  {
    key: 'engineering',
    sector: 'Technology',
    roles: ['Junior Software Developer', 'Software Engineer', 'Platform Engineer', 'Senior Software Engineer', 'DevOps Engineer'],
    companies: ['Northwind Labs', 'CloudArc Systems', 'PixelForge', 'HelixStack', 'TransitIQ']
  },
  {
    key: 'data',
    sector: 'Consulting',
    roles: ['Reporting Analyst', 'Data Analyst', 'BI Analyst', 'Analytics Consultant', 'Data Insights Lead'],
    companies: ['Aperture Insights', 'QueryWorks', 'SignalFrame', 'MetricHouse', 'Blue Oak Advisory']
  },
  {
    key: 'security',
    sector: 'Cybersecurity',
    roles: ['IT Support Analyst', 'Security Analyst', 'SOC Analyst', 'Security Consultant', 'Information Security Manager'],
    companies: ['BlueShield SOC', 'FortiLane', 'Sentinel Harbour', 'VantageSec', 'ClearBoundary']
  },
  {
    key: 'product',
    sector: 'Technology',
    roles: ['Product Coordinator', 'Product Analyst', 'Associate Product Manager', 'Product Manager', 'Senior Product Manager'],
    companies: ['Studio Meridian', 'AppHarbour', 'LumaFlow', 'Northbound Apps', 'Orbit Lane']
  },
  {
    key: 'management',
    sector: 'Public Sector',
    roles: ['Operations Coordinator', 'Programme Officer', 'Project Manager', 'Delivery Manager', 'Head of Operations'],
    companies: ['Eastminster Council', 'CityBridge Services', 'CivicWorks', 'Anchor Programmes', 'Brightway Trust']
  },
  {
    key: 'marketing',
    sector: 'Media',
    roles: ['Marketing Assistant', 'Campaign Executive', 'Digital Marketing Analyst', 'Content Strategist', 'Marketing Manager'],
    companies: ['Trendline Media', 'Echo House', 'Springboard Creative', 'MarketBloom', 'North Shore Studio']
  }
]

const makeDegree = (programme, completionDate) => ({
  title: programme.title,
  university: 'University of Eastminster',
  degreeUrl: `https://example.com/degrees/${programme.slug}`,
  completionDate
})

const makeCredential = (template, completionDate) => ({
  type: template.type,
  title: template.title,
  provider: template.provider,
  url: `https://example.com/credentials/${template.slug}`,
  completionDate
})

const makeEmployment = (jobTitle, company, industrySector, startDate, endDate = null) => ({
  jobTitle,
  company,
  industrySector,
  startDate,
  endDate
})

const addYears = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const buildGeneratedAlumni = () => {
  return Array.from({ length: 50 }, (_value, index) => {
    const id = index + 1
    const firstName = firstNames[index]
    const lastName = lastNames[index]
    const programme = programmes[index % programmes.length]
    const track = employmentTracks[index % employmentTracks.length]
    const graduationYear = 2014 + (index % 11)
    const graduationMonth = 6 + (index % 2)
    const graduationDay = 10 + (index % 10)
    const complexity = index % 5

    const degrees = [makeDegree(programme, addYears(graduationYear, graduationMonth, graduationDay))]

    if (complexity >= 3) {
      const postgrad = secondaryProgrammes[index % secondaryProgrammes.length]
      degrees.unshift(makeDegree(postgrad, addYears(graduationYear + 2, 11, 15)))
    }

    const credentialTemplates = credentialsByTrack[track.key]
    const credentialCount = [0, 1, 2, 3, 5][complexity]
    const credentials = Array.from({ length: credentialCount }, (_credential, credentialIndex) => {
      const template = credentialTemplates[(index + credentialIndex) % credentialTemplates.length]
      return makeCredential(
        template,
        addYears(graduationYear + 1 + credentialIndex, ((credentialIndex + index) % 9) + 1, 8 + ((index + credentialIndex) % 18))
      )
    })

    const employments = []
    const firstStartYear = graduationYear + (complexity === 0 ? 1 : 0)

    if (complexity === 0) {
      employments.push(
        makeEmployment(
          track.roles[0],
          track.companies[index % track.companies.length],
          track.sector,
          addYears(firstStartYear, 9, 1),
          null
        )
      )
    } else if (complexity === 1) {
      employments.push(
        makeEmployment(
          track.roles[1],
          track.companies[(index + 1) % track.companies.length],
          track.sector,
          addYears(firstStartYear + 1, 2, 12),
          null
        )
      )
    } else if (complexity === 2) {
      employments.push(
        makeEmployment(
          track.roles[1],
          track.companies[(index + 1) % track.companies.length],
          track.sector,
          addYears(firstStartYear + 1, 1, 10),
          null
        ),
        makeEmployment(
          track.roles[0],
          track.companies[index % track.companies.length],
          track.sector,
          addYears(firstStartYear, 8, 1),
          addYears(firstStartYear + 1, 1, 1)
        )
      )
    } else if (complexity === 3) {
      employments.push(
        makeEmployment(
          track.roles[3],
          track.companies[(index + 3) % track.companies.length],
          track.sector,
          addYears(firstStartYear + 4, 4, 15),
          null
        ),
        makeEmployment(
          track.roles[2],
          track.companies[(index + 1) % track.companies.length],
          track.sector,
          addYears(firstStartYear + 2, 5, 1),
          addYears(firstStartYear + 4, 4, 1)
        ),
        makeEmployment(
          track.roles[0],
          track.companies[index % track.companies.length],
          track.sector,
          addYears(firstStartYear, 9, 1),
          addYears(firstStartYear + 2, 4, 1)
        )
      )
    } else {
      employments.push(
        makeEmployment(
          track.roles[4],
          track.companies[(index + 4) % track.companies.length],
          track.sector,
          addYears(firstStartYear + 6, 3, 15),
          null
        ),
        makeEmployment(
          track.roles[3],
          track.companies[(index + 2) % track.companies.length],
          track.sector,
          addYears(firstStartYear + 4, 6, 1),
          addYears(firstStartYear + 6, 3, 1)
        ),
        makeEmployment(
          track.roles[2],
          track.companies[(index + 1) % track.companies.length],
          track.sector,
          addYears(firstStartYear + 2, 2, 1),
          addYears(firstStartYear + 4, 5, 1)
        ),
        makeEmployment(
          track.roles[0],
          track.companies[index % track.companies.length],
          track.sector,
          addYears(firstStartYear, 9, 1),
          addYears(firstStartYear + 2, 1, 15)
        )
      )
    }

    const includeBiography = complexity !== 0 || index % 2 === 0
    const includeLinkedIn = index % 4 !== 0

    return {
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.demo${String(id).padStart(2, '0')}@eastminster.ac.uk`,
      firstName,
      lastName,
      biography: includeBiography ? biographies[index % biographies.length] : null,
      linkedinUrl: includeLinkedIn ? `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${String(id).padStart(2, '0')}` : null,
      degrees,
      credentials,
      employments
    }
  })
}

alumniSeed.push(...buildGeneratedAlumni())

const toCredentialType = (value) => {
  if (value === 'licence') {
    return 'licence'
  }

  if (value === 'course') {
    return 'course'
  }

  return 'certification'
}

const seedAlumniUser = async (alumniRoleId, data, passwordHash) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { user_id: true }
  })

  const user = existing
    ? await prisma.user.update({
        where: { email: data.email },
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role_id: alumniRoleId,
          password_hash: passwordHash,
          email_verified_at: new Date()
        }
      })
    : await prisma.user.create({
        data: {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role_id: alumniRoleId,
          password_hash: passwordHash,
          email_verified_at: new Date()
        }
      })

  await prisma.profile.upsert({
    where: { user_id: user.user_id },
    create: {
      user_id: user.user_id,
      biography: data.biography || null,
      linkedin_url: data.linkedinUrl || null
    },
    update: {
      biography: data.biography || null,
      linkedin_url: data.linkedinUrl || null
    }
  })

  await prisma.degree.deleteMany({ where: { user_id: user.user_id } })
  await prisma.credential.deleteMany({ where: { user_id: user.user_id } })
  await prisma.employment.deleteMany({ where: { user_id: user.user_id } })

  if (data.degrees.length) {
    await prisma.degree.createMany({
      data: data.degrees.map((degree) => ({
        user_id: user.user_id,
        title: degree.title,
        university: degree.university,
        degree_url: degree.degreeUrl,
        completion_date: new Date(degree.completionDate)
      }))
    })
  }

  if (data.credentials.length) {
    await prisma.credential.createMany({
      data: data.credentials.map((credential) => ({
        user_id: user.user_id,
        credential_type: toCredentialType(credential.type),
        title: credential.title,
        provider_name: credential.provider,
        credential_url: credential.url,
        completion_date: new Date(credential.completionDate)
      }))
    })
  }

  if (data.employments.length) {
    await prisma.employment.createMany({
      data: data.employments.map((employment) => ({
        user_id: user.user_id,
        job_title: employment.jobTitle,
        company: employment.company,
        industry_sector: employment.industrySector || null,
        start_date: new Date(employment.startDate),
        end_date: employment.endDate ? new Date(employment.endDate) : null
      }))
    })
  }
}

const main = async () => {
  const alumniRole = await prisma.role.findUnique({
    where: { name: 'alumni' }
  })

  if (!alumniRole) {
    throw new Error('Alumni role not found. Run migrations/bootstrap first.')
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD)

  for (const entry of alumniSeed) {
    await seedAlumniUser(alumniRole.role_id, entry, passwordHash)
  }

  console.log(`Seeded ${alumniSeed.length} demo alumni records.`)
  console.log(`Use any seeded email with password: ${DEMO_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
