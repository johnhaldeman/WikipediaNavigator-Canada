const searchInPage = require('electron-in-page-search').default;
const BrowserWindow = require('electron').remote.BrowserWindow;
const path = require('path');
const questions = require('./questions').questions;
const ranks = require('./ranks').ranks;

const webview = document.querySelector('webview')
let visitedURLs = ['https://en.wikipedia.org/wiki/Canada'];
let targetURL = 'https://en.wikipedia.org/wiki/Churchill,_Manitoba';
let currentQuestion = "";
let maxURLs = 4;
let currentIndex = 0;
let rankStep = 1;
let search;

function loadQuestion(index){
  currentQuestion = questions[index].question;
  targetURL = questions[index].target;
  visitedURLs = [questions[index].start];
  webview.src = questions[index].start;
  maxURLs = questions[index].click_limit;
}

loadQuestion(currentIndex);
let questText = document.getElementById('question-text');
questText.textContent = currentQuestion;

function drawHistory(){
  const panel = document.querySelector('#history-panel');
  removeAllChildren(panel);
  let html = '';
  for(let i = 0; i < visitedURLs.length; i++){
    html += `<li role="presentation"><a href="#" link="${visitedURLs[i]}">${visitedURLs[i]}</a></li>`;
  }
  panel.innerHTML = html;
  panel.lastChild.setAttribute("class", "active");
  for(let i = 0; i < panel.children.length; i++){
    addHistoryLinkListener(panel.children[i], i);
  }
}

function historyNavigate(elem, elemNum){
  return function(){
    webview.src = elem.textContent;
    visitedURLs.splice(elemNum + 1, visitedURLs.length - elemNum);
    refresh();
  }
}

function addHistoryLinkListener(element, elemNum){
  element.addEventListener("click", historyNavigate(element, elemNum));
}


function refresh(){
   drawHistory();
   drawRank();
}

function drawRank(){
  let rankIndex = Math.floor(currentIndex / rankStep);
  let rank = ranks[rankIndex];

  document.getElementById('solved-puzzles').textContent = currentIndex + 1;
  document.getElementById('total-puzzles').textContent = questions.length;
  document.getElementById('rank-name').textContent = rank.name;
  document.getElementById('rank-img').setAttribute('src', rank.image);

}

function removeAllChildren(element){
  while (element.firstChild) {
      element.removeChild(element.firstChild);
  }
}

refresh();

webview.addEventListener('will-navigate', (event) => {

  if(maxURLs == visitedURLs.length){
    console.log('oops, reached max');
    webview.src = visitedURLs[visitedURLs.length - 1];
    openOverlay("fail");
    return;
  }
  visitedURLs.push(event.url);

  refresh();
})

webview.addEventListener('dom-ready', () => {
  //webview.openDevTools();
  search = searchInPage(webview);

  if(webview.src.toUpperCase() == targetURL.toUpperCase()){
    openOverlay("success");
    refresh();
    let qPanel = document.getElementById('question-panel');
    qPanel.classList.remove("panel-danger");
    qPanel.classList.add("panel-success");

    let challText = document.getElementById('challenge-text');
    challText.textContent = "Challenge Complete: "

    document.getElementById('next-challenge').style.display = 'block';

    maxURLs = 100;
  }
})

document.getElementById('search-page-button').addEventListener('click', () => {
  search.openSearchWindow();
});

document.getElementById('search-page-button').addEventListener('click', () => {
  search.openSearchWindow();
});

document.getElementById('overlay').addEventListener('click', () => {
    closeOverlay();
});

document.getElementById('next-challenge').addEventListener('click', () => {
  currentIndex++;
  loadQuestion(currentIndex);

  let qPanel = document.getElementById('question-panel');
  qPanel.classList.remove("panel-success");
  qPanel.classList.add("panel-danger");

  let challText = document.getElementById('challenge-text');
  challText.textContent = "Your Next Challenge: "
  let questText = document.getElementById('question-text');
  questText.textContent = currentQuestion;

  document.getElementById('next-challenge').style.display = 'none';

  refresh();
});

function openOverlay(type) {
  document.getElementById("fail-text").style.display = "none";
  document.getElementById("success-text").style.display = "none";
  let overlay = document.getElementById("overlay");
  overlay.style.height = "100%";
  if(type == 'fail'){
      overlay.style.backgroundColor = "rgba(169, 68, 66, 0.9)";
      document.getElementById("fail-text").style.display = "block";
  }
  else if(type == 'success'){
      overlay.style.backgroundColor = "rgba(223, 240, 216, 0.95)";
      let answerText = document.getElementById("answer-text");
      answerText.textContent = webview.getTitle().replace(" - Wikipedia", "");;
      document.getElementById("success-text").style.display = "block";
  }
  else
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)";

}

function closeOverlay() {
    document.getElementById("overlay").style.height = "0%";
}
