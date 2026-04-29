const mobileMenuQuery = window.matchMedia('(min-width: 992px)')

const syncHeaderMenus = () => {
  document.querySelectorAll('[data-header-toggle]').forEach((toggle) => {
    const targetId = toggle.dataset.target
    const actions = document.getElementById(targetId)

    if (!actions) {
      return
    }

    if (mobileMenuQuery.matches) {
      actions.hidden = false
      actions.classList.remove('is-open')
      toggle.setAttribute('aria-expanded', 'false')
      return
    }

    const isOpen = toggle.getAttribute('aria-expanded') === 'true'
    actions.hidden = !isOpen
    actions.classList.toggle('is-open', isOpen)
  })
}

document.querySelectorAll('[data-header-toggle]').forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true'
    toggle.setAttribute('aria-expanded', String(!isExpanded))
    syncHeaderMenus()
  })
})

if (typeof mobileMenuQuery.addEventListener === 'function') {
  mobileMenuQuery.addEventListener('change', syncHeaderMenus)
} else {
  mobileMenuQuery.addListener(syncHeaderMenus)
}

syncHeaderMenus()
