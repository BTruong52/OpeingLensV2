(()=>{
  const byId=id=>document.getElementById(id);
  let enabled=false,timer,latest,drawVersion=0,shownKey='';
  const record=(stage,details={},failed=false)=>{
    if(enabled)window.lens.diagnosticsEvent({stage,details,failed});
  };
  window.lensDebug={get enabled(){return enabled;},record,stateProvider:null,
    updateState(){
      if(enabled && this.stateProvider)window.lens.diagnosticsState(this.stateProvider());
    }};
  window.addEventListener('error',event=>record('Renderer error',{message:event.message,stack:event.error?.stack},true));
  window.addEventListener('unhandledrejection',event=>record('Unhandled renderer rejection',
    {message:String(event.reason?.message || event.reason),stack:event.reason?.stack},true));
  function preview(id,url){
    const image=byId(id);
    image.hidden=!url;
    if(url && image.src!==url)image.src=url;
    if(!url)image.removeAttribute('src');
  }
  async function drawWords(pass,captures){
    const version=++drawVersion,canvas=byId('debug-words');
    const url=pass && captures[pass.variant];
    canvas.hidden=!url;
    if(!url)return;
    const image=new Image();image.src=url;
    try{await image.decode();}catch{return;}
    if(version!==drawVersion)return;
    canvas.width=image.width;canvas.height=image.height;
    const context=canvas.getContext('2d');context.drawImage(image,0,0);
    context.lineWidth=Math.max(1,image.width/650);
    for(const word of pass.words || []){
      const box=word.bbox;
      context.strokeStyle=word.confidence>=80?'#67e8b0':word.confidence>=60?'#fbbf24':'#fb7185';
      context.strokeRect(box.x0,box.y0,box.x1-box.x0,box.y1-box.y0);
    }
    byId('debug-word-text').textContent=(pass.words || []).map(word=>
      word.text+' · '+Number(word.confidence).toFixed(1)+' · '+JSON.stringify(word.bbox)).join('\n');
  }
  function render(snapshot){
    latest=snapshot;
    const selected=byId('debug-view').value==='failure'?snapshot.failure:snapshot;
    byId('debug-inspect').disabled=!enabled || Boolean(snapshot.state.running);
    byId('debug-export').disabled=!snapshot.events.length && !snapshot.failure;
    byId('debug-recording').textContent=enabled?'Recording · '+snapshot.events.length+' recent events':'Recording off';
    if(!selected){
      byId('debug-result').textContent='No failure has been recorded.';
      byId('debug-content').hidden=true;return;
    }
    byId('debug-content').hidden=false;
    const captures=selected.captures || {},passes=selected.ocr || [];
    preview('debug-panel-image',captures.ocrPanel || captures.panel);
    byId('debug-panel-title').textContent=captures.ocrPanel?'Full panel used for last OCR':'Latest captured move panel';
    const crop=captures.metadata?.ocrCrop,pixels=captures.metadata?.panelPixels,box=byId('debug-crop-box');
    box.hidden=!(crop && pixels && captures.ocrPanel);
    if(!box.hidden){
      box.style.left=crop.x/pixels.width*100+'%';box.style.top=crop.y/pixels.height*100+'%';
      box.style.width=crop.width/pixels.width*100+'%';box.style.height=crop.height/pixels.height*100+'%';
    }
    preview('debug-board-image',captures.board);
    preview('debug-confirmed-image',captures.confirmedBoard);
    const state=selected.state || {};
    byId('debug-state').textContent=JSON.stringify({runtime:snapshot.runtime,lastOcrCapture:captures.metadata,latestCapture:captures.liveMetadata,state},null,2);
    byId('debug-result').textContent=selected.event
      ?selected.event.stage+' · '+new Date(selected.at).toLocaleString()
      :(snapshot.events.at(-1)?.stage || 'Waiting for a capture.');
    byId('debug-ocr-text').textContent=passes.length?passes.map(pass=>
      pass.variant+' · '+Number(pass.elapsedMs).toFixed(1)+' ms · OCR confidence '+Number(pass.confidence).toFixed(1)+
      '\nRaw text\n'+pass.text+'\nReconstructed rows\n'+(pass.grid || '(No spatial grid)')+
      '\nInterpretations and errors\n'+JSON.stringify(pass.parses,null,2)).join('\n\n'):'No OCR pass recorded yet.';
    const events=selected.event?snapshot.events.filter(event=>event.sequence<=selected.event.sequence):snapshot.events;
    byId('debug-events').textContent=events.map(event=>event.at+' · '+event.stage+'\n'+JSON.stringify(event.details,null,2)).join('\n\n');
    const picker=byId('debug-pass'),previous=picker.value;
    const optionsKey=passes.map(pass=>pass.variant).join('|');
    if(picker.dataset.options!==optionsKey){
      picker.dataset.options=optionsKey;picker.replaceChildren();
      for(const [index,pass] of passes.entries()){
        const option=document.createElement('option');option.value=index;
        option.textContent=pass.variant+' · '+Number(pass.confidence).toFixed(1)+' confidence';picker.append(option);
      }
      if([...picker.options].some(option=>option.value===previous))picker.value=previous;
    }
    const key=JSON.stringify([byId('debug-view').value,captures.metadata,passes.map(pass=>[pass.variant,pass.elapsedMs]),picker.value]);
    if(key!==shownKey){shownKey=key;drawWords(passes[Number(picker.value)],captures);}
  }
  async function refresh(){
    clearTimeout(timer);
    try{
      window.lensDebug.updateState();
      if(byId('developer-mode').open)render(await window.lens.diagnosticsSnapshot());
    }catch(error){byId('debug-message').textContent=error.message;}
    if(enabled)timer=setTimeout(refresh,1000);
  }
  byId('debug-enabled').onchange=async()=>{
    try{
      enabled=byId('debug-enabled').checked;
      render(await window.lens.diagnosticsEnabled(enabled));
      byId('debug-message').textContent=enabled?'Recording selected capture areas and recognition decisions.':'Recording stopped. Retained diagnostics can still be exported.';
      refresh();
    }catch(error){enabled=false;byId('debug-enabled').checked=false;byId('debug-message').textContent=error.message;}
  };
  byId('developer-mode').ontoggle=()=>{if(byId('developer-mode').open)refresh();};
  byId('debug-view').onchange=()=>{shownKey='';if(latest)render(latest);};
  byId('debug-pass').onchange=()=>{shownKey='';if(latest)render(latest);};
  byId('debug-clear').onclick=async()=>{
    render(await window.lens.diagnosticsClear());
    byId('debug-message').textContent='Diagnostic history cleared.';
  };
  byId('debug-inspect').onclick=async()=>{
    byId('debug-inspect').disabled=true;
    try{
      window.lensDebug.updateState();
      const result=await window.lens.diagnosticsInspect(window.lensDebug.stateProvider?.().fen);
      render(result.snapshot);
      byId('debug-message').textContent=result.error?'Capture recorded · '+result.error:'Diagnostic capture and OCR completed.';
    }catch(error){byId('debug-message').textContent=error.message;}
    finally{refresh();}
  };
  byId('debug-export').onclick=async()=>{
    byId('debug-export').disabled=true;
    try{
      window.lensDebug.updateState();
      const result=await window.lens.diagnosticsExport();
      byId('debug-message').textContent=result.path?'Saved '+result.path:'Export canceled.';
    }catch(error){byId('debug-message').textContent=error.message;}
    finally{refresh();}
  };
})();
