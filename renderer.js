const BrowserWindow = require('electron').remote.BrowserWindow
const path = require('path')

const webview = document.querySelector('webview')

webview.addEventListener('will-navigate', (event) => {
  console.log(event.url);
})

  
webview.addEventListener('dom-ready', () => {
  //webview.openDevTools()
})
