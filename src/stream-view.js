window.lens.onStreamBoard(url=>{
  const image=document.getElementById('stream-board');
  image.hidden=!url;document.getElementById('waiting').hidden=Boolean(url);
  if(url)image.src=url;else image.removeAttribute('src');
});
window.lens.onCoachState(state=>{
  document.getElementById('opening').textContent=state.opening || 'Coach';
  document.getElementById('message').textContent='Coach: '+[state.usable?state.move:null,state.explanation].filter(Boolean).join(', ');
  document.getElementById('review').textContent=state.review || '';
});
