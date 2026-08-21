(() => {
  const HOST_ID = 'pixel-team-office-widget-host'
  const existing = document.getElementById(HOST_ID)
  if (existing) {
    existing.remove()
    return
  }

  chrome.storage.sync.get({ widgetUrl: 'http://localhost:5174/?view=widget&source=linear' }, ({ widgetUrl }) => {
    const host = document.createElement('div')
    host.id = HOST_ID
    host.style.cssText = 'all:initial;position:fixed;right:18px;bottom:18px;width:min(440px,calc(100vw - 32px));height:min(610px,calc(100vh - 32px));min-width:320px;min-height:420px;z-index:2147483647;resize:both;overflow:hidden;border:2px solid #152a22;border-radius:12px;background:#fff8ef;box-shadow:10px 12px 0 rgba(21,42,34,.24),0 18px 55px rgba(21,42,34,.25);'
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box} .shell{display:grid;grid-template-rows:34px 1fr;width:100%;height:100%;overflow:hidden;background:#fff8ef;font-family:Inter,Arial,sans-serif}
        .bar{display:flex;align-items:center;gap:8px;padding:0 8px;color:#152a22;background:#ffe0e9;border-bottom:2px solid #152a22;cursor:grab;user-select:none}
        .bar:active{cursor:grabbing}.mark{width:9px;height:9px;border:1px solid #152a22;border-radius:50%;background:#65d597}.title{flex:1;font-size:10px;font-weight:900;letter-spacing:.05em}
        button{display:grid;place-items:center;width:24px;height:24px;padding:0;border:1px solid #152a22;border-radius:50%;color:#152a22;background:#fff;cursor:pointer;font:900 11px/1 Arial}button:hover{background:#f6e5a9}
        iframe{width:100%;height:100%;border:0;background:#fff8ef}
      </style>
      <section class="shell">
        <header class="bar"><i class="mark"></i><b class="title">PIXEL TEAM OFFICE</b><button class="open" title="Open separately">↗</button><button class="close" title="Close">×</button></header>
        <iframe title="Pixel Team Office Widget" allow="clipboard-read; clipboard-write"></iframe>
      </section>`

    const frame = shadow.querySelector('iframe')
    frame.src = widgetUrl
    shadow.querySelector('.close').addEventListener('click', () => host.remove())
    shadow.querySelector('.open').addEventListener('click', () => window.open(widgetUrl, 'PixelTeamOfficeWidget', 'popup=yes,width=460,height=620,resizable=yes'))

    const bar = shadow.querySelector('.bar')
    let drag = null
    bar.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return
      const rect = host.getBoundingClientRect()
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      bar.setPointerCapture(event.pointerId)
    })
    bar.addEventListener('pointermove', (event) => {
      if (!drag) return
      const left = Math.max(0, Math.min(window.innerWidth - host.offsetWidth, event.clientX - drag.x))
      const top = Math.max(0, Math.min(window.innerHeight - host.offsetHeight, event.clientY - drag.y))
      host.style.left = `${left}px`
      host.style.top = `${top}px`
      host.style.right = 'auto'
      host.style.bottom = 'auto'
    })
    bar.addEventListener('pointerup', () => { drag = null })
    document.documentElement.appendChild(host)
  })
})()
