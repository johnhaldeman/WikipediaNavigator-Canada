const searchInPage = require('electron-in-page-search').default;
const BrowserWindow = require('electron').remote.BrowserWindow;
const path = require('path');

const webview = document.querySelector('webview')
let visitedURLs = [];
let targetURL = 'https://en.wikipedia.org/wiki/Churchill,_Manitoba';
let search;
//let

webview.addEventListener('will-navigate', (event) => {
  console.log(event.url);
  visitedURLs.push(event.url);

  if(event.url == targetURL){
    console.log("You did it!");
  }
})


webview.addEventListener('dom-ready', () => {
  //webview.openDevTools();
  search = searchInPage(webview);
})

document.getElementById('search-page-button').addEventListener('click', () => {
  search.openSearchWindow();
});
