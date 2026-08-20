const MENU_ID = 'nestlinker-office-side-panel'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Open NestLinker Office in side panel',
      contexts: ['page'],
    })
  })
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) return
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab?.id) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {})
  }
})
