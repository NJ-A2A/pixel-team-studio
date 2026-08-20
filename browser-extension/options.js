const input = document.getElementById('widgetUrl')
const status = document.getElementById('status')

chrome.storage.sync.get({ widgetUrl: 'http://localhost:5174/?view=widget&source=linear' }, ({ widgetUrl }) => {
  input.value = widgetUrl
})

document.getElementById('save').addEventListener('click', () => {
  let url
  try {
    url = new URL(input.value)
  } catch {
    status.textContent = 'Enter a valid http:// or https:// URL.'
    return
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    status.textContent = 'Only http:// and https:// URLs are supported.'
    return
  }
  chrome.storage.sync.set({ widgetUrl: url.toString() }, () => {
    status.textContent = 'Saved. Toggle the widget again to reload it.'
  })
})
