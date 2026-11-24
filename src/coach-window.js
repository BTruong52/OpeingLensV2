const $=id=>document.getElementById(id);
let lastSpeech='';
let lastChoices='';
window.lens.onCoachOverlap(targets=>{
  const warning=$('overlap-warning');
  const message=targets.length ? `The Coach is covering the ${targets.join(' and ')}. Drag this window to a clear spot.` : '';
  if(warning.textContent!==message)warning.textContent=message;
  warning.hidden=!message;
});
window.lens.onCoachState(state=>{
  $('coach-opening').textContent=state.opening;
  $('coach-details').textContent=(state.details || '').split('\n\n').filter(p=>p!==state.explanation && p!==state.review).join('\n\n');
  $('coach-depth').hidden=!$('coach-details').textContent;
  const current=state.usable && state.move
    ? [state.move+', '+state.explanation,state.review].filter(Boolean).join(' ')
    : state.explanation || 'Waiting for the current position.';
  const text='Coach: '+current;
  if($('coach-message').textContent!==text)$('coach-message').textContent=text;
  const variations=state.variations || [];
  const fingerprint=JSON.stringify([state.fen,state.departure,state.pickingDefense,state.planning,variations]);
  if(fingerprint!==lastChoices){
    lastChoices=fingerprint;
    $('switch-variation').hidden=!variations.length;
    $('switch-title').textContent=state.planning?'Plans for this position':state.pickingDefense?'Choose a defense for Black':'Switch to a known variation';
    $('switch-hint').textContent=state.planning?'Each color shows an alternative next move. Select an idea to focus on it.':state.pickingDefense?'These replies fit White’s move and are ranked for your skill level.':state.departure
      ? `${state.departure} changed the line. These continuations fit the current board.`
      : 'These continuations fit the current board.';
    $('switch-options').replaceChildren();
    for(const choice of variations){
      const button=document.createElement('button');
      button.className=state.planning?'variation plan-option':'variation';
      button.dataset.intent=choice.intent || '';
      const title=document.createElement('strong');
      title.textContent=choice.name+' · '+choice.move;
      const reason=document.createElement('span');
      reason.textContent=choice.why;
      button.append(title,reason);
      button.onclick=async()=>{
        button.disabled=true;
        try {await window.lens.chooseCoachVariation(state.fen,choice.id);}
        finally {if(button.isConnected)button.disabled=false;}
      };
      $('switch-options').append(button);
    }
  }
  const key=state.usable ? state.fen+'|'+current : '';
  if(key===lastSpeech)return;
  lastSpeech=key;
  if($('read-aloud').checked && window.speechSynthesis){
    speechSynthesis.cancel();
    if(key)speechSynthesis.speak(new SpeechSynthesisUtterance(current));
  }
});
