chrome.storage.sync.get({ widgetUrl: 'http://localhost:5174/?view=widget&source=linear' }, ({ widgetUrl }) => {
  document.querySelector('iframe').src = widgetUrl
})
