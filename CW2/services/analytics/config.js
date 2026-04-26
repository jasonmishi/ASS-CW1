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

module.exports = {
  CAREER_RULES,
  CHART_COLORS,
  DOMAIN_RULES
}
