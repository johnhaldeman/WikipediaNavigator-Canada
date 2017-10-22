const searchInPage = require('electron-in-page-search').default;
const path = require('path');
const fs = require('fs');
const http = require('http');

const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;
const app = remote.app;

const {shell} = require('electron')

const webview = document.querySelector('webview')
let visitedURLs = ['https://en.wikipedia.org/wiki/Canada'];
let targetURL = 'https://en.wikipedia.org/wiki/Churchill,_Manitoba';
let currentQuestion = "";
let maxURLs = 4;
let currentIndex = 48;
let rankStep = 3;
let search;
let hintsReceived = 0;
let questionsSkipped = 0;

let questions = {}; //require('./questions').questions;
let ranks = {}; //require('./ranks').ranks;

function loadQuestion(index){
  if(index >= questions.length){
    index = questions.length -1;
    currentIndex = questions.length - 1;
    questionAnswered();
  }

  currentQuestion = questions[index].question;
  targetURL = questions[index].target;
  visitedURLs = [questions[index].start];
  webview.src = questions[index].start;
  maxURLs = questions[index].click_limit;
}

function saveProgress(){
  let saveGame = {
    currentIndex: currentIndex + 1,
    hintsReceived: hintsReceived,
    questionsSkipped: questionsSkipped
  };
  fs.writeFileSync(app.getPath('userData') + '/savegame.txt', JSON.stringify(saveGame), 'utf8');
}

function saveHint(){
  let saveGame = {
    currentIndex: currentIndex,
    hintsReceived: hintsReceived,
    questionsSkipped: questionsSkipped
  };
  fs.writeFileSync(app.getPath('userData') + '/savegame.txt', JSON.stringify(saveGame), 'utf8');
}

function loadProgress() {
  let path = app.getPath('userData') + '/savegame.txt';

  if(fs.existsSync(path)){
    let saveGame = JSON.parse(fs.readFileSync(path, 'utf8'));

    if(!saveGame.currentIndex)
      currentIndex = 0;
    else
      currentIndex = saveGame.currentIndex;

    if(!saveGame.hintsReceived)
      hintsReceived = 0;
    else
      hintsReceived = saveGame.hintsReceived;

    if(!saveGame.questionsSkipped)
      questionsSkipped = 0;
    else
      questionsSkipped = saveGame.questionsSkipped;
  }
  else{
    currentIndex = 0;
    hintsReceived = 0;
    questionsSkipped = 0;
    saveProgress();
  }
}

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
    track('clickHistory', currentIndex);
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
   setChallengeText();
}

function drawRank(){
  let rank = getRank();

  document.getElementById("number-hints").textContent = hintsReceived;
  document.getElementById("number-skipped").textContent = questionsSkipped;
  document.getElementById('solved-puzzles').textContent = currentIndex + 1 - questionsSkipped;
  document.getElementById('total-puzzles').textContent = questions.length;
  document.getElementById('rank-name').textContent = rank.name;
  document.getElementById('rank-img').setAttribute('src', rank.image);

}

function getRank(){
  let hintModifier = Math.ceil(hintsReceived / 2);
  let rankIndex = 0;
  let questionsAnswered = currentIndex - questionsSkipped;
  if(questionsAnswered >= hintModifier)
    rankIndex = Math.floor((questionsAnswered - hintModifier) / rankStep);

  return ranks[rankIndex];
}

function removeAllChildren(element){
  while (element.firstChild) {
      element.removeChild(element.firstChild);
  }
}

loadProgress();

function track(action, question, rank){
  http.get('http://www.wikipedianavigator.com/track/' + action + '/' + question, (res) => {});

}


http.get('http://assets.wikipedianavigator.com/questions.json', (res) => {
  const { statusCode } = res;
  const contentType = res.headers['content-type'];

  let error;
  if (statusCode !== 200) {
    error = new Error('Request Failed.\n' +
                      `Status Code: ${statusCode}`);
  } else if (!/^application\/json/.test(contentType)) {
    error = new Error('Invalid content-type.\n' +
                      `Expected application/json but received ${contentType}`);
  }
  if (error) {
    console.log(error.message);
    res.resume();
    return;
  }

  res.setEncoding('utf8');
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      questions = parsedData.questions;
      ranks = parsedData.ranks;
      initialize();
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});


function initialize(){
  loadQuestion(currentIndex);
  track('initialize', currentIndex);
  let questText = document.getElementById('question-text');
  questText.textContent = currentQuestion;
  refresh();
};

function setChallengeText(){
  let challText = document.getElementById('challenge-text');
  challText.textContent = "Your Next Challenge (" + (currentIndex + 1) + "/" + questions.length + "): ";
}

function gotoNextQuestion(){
  currentIndex++;
  loadQuestion(currentIndex);

  let qPanel = document.getElementById('question-panel');
  qPanel.classList.remove("panel-success");
  qPanel.classList.add("panel-danger");

  let questText = document.getElementById('question-text');
  questText.textContent = currentQuestion;

  document.getElementById('next-challenge').style.display = 'none';
  document.getElementById("hint-answer").style.display = 'none';

  document.getElementById('give-hint').style.display = 'inline-block';
  document.getElementById('skip-question').style.display = 'inline-block';

  refresh();
}

let navCheck = false;
webview.addEventListener('will-navigate', (event) => {
  track('nav', currentIndex);
  if(maxURLs == visitedURLs.length - 1){
    webview.src = visitedURLs[visitedURLs.length - 1];
    openOverlay("fail");
    return;
  }
  visitedURLs.push(event.url);

  refresh();
})

function questionAnswered(){
    openOverlay("success");
    refresh();
    let qPanel = document.getElementById('question-panel');
    qPanel.classList.remove("panel-danger");
    qPanel.classList.add("panel-success");

    let challText = document.getElementById('challenge-text');
    challText.textContent = "Challenge Complete: "

    document.getElementById('give-hint').style.display = 'none';
    document.getElementById('skip-question').style.display = 'none';

    if(currentIndex < questions.length - 1){
      document.getElementById('next-challenge').style.display = 'block';
      document.getElementById('start-from-scratch').style.display = 'none';
    }
    else{
      document.getElementById('next-challenge').style.display = 'none';
      document.getElementById('start-from-scratch').style.display = 'block';
    }

    maxURLs = 1000;
}

webview.addEventListener('dom-ready', () => {
  search = searchInPage(webview);

  if(webview.src.toUpperCase() == targetURL.toUpperCase()){
    questionAnswered();
  }
})

document.getElementById('search-page-button').addEventListener('click', () => {
  search.openSearchWindow();
});

document.getElementById('start-from-scratch').addEventListener('click', () => {
  hintsReceived = 0;
  questionsSkipped = 0;
  currentIndex = 0;
  saveProgress();

  currentIndex = -1;
  gotoNextQuestion();

  document.getElementById('start-from-scratch').style.display = 'none';
});

document.getElementById('search-page-button').addEventListener('click', () => {
  search.openSearchWindow();
});

document.getElementById('overlay').addEventListener('click', () => {
    closeOverlay();
});

document.getElementById('share_rank').addEventListener('click', () => {
    track('share', currentIndex);
    let rank = getRank();
    shell.openExternal(rank.share_link);
});

document.getElementById('survey-link').addEventListener('click', () => {
    track('survey', currentIndex);
    shell.openExternal("https://www.surveymonkey.com/r/WK38BPJ");
});

document.getElementById('next-challenge').addEventListener('click', () => {
  track('gotoNext', currentIndex);
  gotoNextQuestion();
});

document.getElementById('give-hint').addEventListener('click', () => {
  track('askForHint', currentIndex);
  hintsReceived++;
  saveHint();

  document.getElementById('give-hint').style.display = 'none';

  document.getElementById("hint-answer").textContent = questions[currentIndex].title;
  document.getElementById("hint-answer").style.display = 'inline-block';

  document.getElementById("number-hints").textContent = hintsReceived;

  drawRank();
});

document.getElementById('skip-question').addEventListener('click', () => {
  track('skipQuestion', currentIndex);
  questionsSkipped++;
  document.getElementById("number-skipped").textContent = questionsSkipped;
  gotoNextQuestion();
  saveHint();
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

      if(currentIndex == questions.length - 1){
        document.getElementById("next-text").textContent = "Congratulations! You have completed Wiki-Navigator and found your way through the Northwest Passage!"
        document.getElementById("success-img").src = "passage/end.jpg";
        document.getElementById("success-img").style.width="30%";
        document.getElementById("success-img").style.height="30%";
        document.getElementById("success-img-caption").textContent = "Roald Amundsen's vessel Gjøa - The first vessel to navigate the Northwest Passage";
        document.getElementById("success-text").style.display = "block";
      }
      else{
        document.getElementById("success-img").src = "passage/" + (currentIndex + 1) + ".png";
        document.getElementById("success-img-caption").textContent = "You have now completed " + (currentIndex + 1) + " of " + questions.length + " questions";
        document.getElementById("success-text").style.display = "block";
      }

      saveProgress();
  }
  else
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)";

}

function closeOverlay() {
    document.getElementById("overlay").style.height = "0%";
}
