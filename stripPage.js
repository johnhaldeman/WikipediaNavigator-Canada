
//webview.addEventListener('dom-ready', () => {
  console.log("Editing Page");

  ready(
	fireWhenReady
  );

  function fireWhenReady(){
	  console.log("Ready Now");
	  const head = document.querySelector('#mw-head');
	  head.remove();
	  const panel = document.querySelector('#mw-panel');
	  panel.remove();
	  const footer = document.querySelector('#footer');
	  footer.remove();


	  const pageBase = document.querySelector('#mw-page-base');
	  pageBase.remove();
	  const headBase = document.querySelector('#mw-head-base');
	  headBase.remove();


	  const body = document.querySelector('.mw-body');
	  body.style.marginLeft = 0;

  }

  function ready(fn) {
	  if (document.readyState != 'loading'){
		fn();
	  } else {
		document.addEventListener('DOMContentLoaded', fn);
	  }
  }
