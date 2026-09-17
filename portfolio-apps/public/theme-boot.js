// Paint the right theme before React mounts so there is no flash of the wrong colours.
(function () {
  try {
    var s = localStorage.getItem('femi-apps-theme')
    var dark = s === 'dark' || (s !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    var el = document.documentElement
    el.setAttribute('data-color-mode', dark ? 'dark' : 'light')
    el.setAttribute('data-light-theme', 'light')
    el.setAttribute('data-dark-theme', 'dark')
    el.style.colorScheme = dark ? 'dark' : 'light'
    el.style.backgroundColor = dark ? '#0d1117' : '#ffffff'
  } catch (e) {}
})()
