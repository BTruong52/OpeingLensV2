// Invoked only by Electron with --smoke-test; not a node:test suite.
module.exports = async ({app,panel,getOverlay,getSelector,darkPanelVariant,beginRegionReview}) => {
  const assert=require('node:assert/strict');
  const { Chess }=require('chess.js');
  const fs=require('node:fs/promises');
  const path=require('node:path');
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const js=async code=>{
    try{return await panel.webContents.executeJavaScript(code);}
    catch(error){throw Error(`Panel test script failed: ${code.slice(0,140)}`,{cause:error});}
  };
  const errors=[];
  const {BrowserWindow,screen}=require('electron');
  const {x,y}=screen.getPrimaryDisplay().bounds;
  const fixture=new BrowserWindow({x:x+20,y:y+20,width:320,height:320,frame:false,show:true,alwaysOnTop:true,webPreferences:{contextIsolation:true,sandbox:true}});
  fixture.webContents.on('console-message',event=>{if(event.level==='error')console.error(event.message);});
  fixture.setAlwaysOnTop(true,'screen-saver');
  await fixture.loadFile(path.join(__dirname,'board-fixture.html'));
  panel.setPosition(x+400,y+40);
  panel.webContents.on('console-message', event=>{if(event.level==='error')errors.push(event.message);});
  for(let i=0;i<50;i++){if(await js('Boolean(document.querySelector("#fen").value)'))break;await wait(100);}
  assert.equal(await js('document.querySelector("#next-move").textContent'),'1. e4');
  assert.deepEqual(await js('Array.from(document.querySelectorAll("main > section .section-title span"),node=>node.textContent)'),['01 / SELECT BOARD','02 / SKILL LEVEL & OPENINGS','03 / FOLLOW THE POSITION']);
  assert.ok(await js('$("skill").compareDocumentPosition($("lesson")) & Node.DOCUMENT_POSITION_FOLLOWING'));
  assert.equal(await js('Boolean($("coach-test") || $("analyze-plan"))'),false);
  for(let i=0;i<50;i++){if((await js('$("coach-note").textContent')).startsWith('Coach ·'))break;await wait(100);}
  assert.match(await js('$("coach-note").textContent'),/^Coach ·/);
  assert.equal(await js('$("next-move").textContent'),'1. e4');
  const suggestions=()=>js('Array.from($("suggestions").children,b=>b.textContent)');
  const beginner=await suggestions();
  assert.equal(beginner.length,3);
  assert.equal(new Set(beginner.map(text=>text.split(' · ')[0])).size,3);
  assert.match(beginner[0],/e4 · Italian Game/);
  await js('$("skill").value=3; $("skill").dispatchEvent(new Event("change"))');
  const expert=await suggestions();
  assert.equal(expert.length,3);
  assert.match(expert[0],/e4 · Sicilian Defense.*Najdorf/);
  const reti=expert.findIndex(text=>text.startsWith('Nf3 ·'));
  assert.ok(reti>=0);
  await js(`$("suggestions").children[${reti}].click()`);
  assert.equal(await js('$("next-move").textContent'),'1. Nf3');
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  await js('document.querySelector("#next").click()');await wait(100);
  assert.equal(await js('document.querySelector("#next-move").textContent'),'1… e5');
  await js('document.querySelector("#restart").click()');await wait(100);
  assert.equal(await js('document.querySelector("#next-move").textContent'),'1. e4');
  const screens=await js('window.lens.displays()');
  assert.deepEqual(screens.map(d=>d.id),screen.getAllDisplays().map(d=>d.id));
  for(const d of screen.getAllDisplays().filter(d=>d.id!==screen.getPrimaryDisplay().id)){
    await js(`window.lens.selectBoard(${d.id})`);
    for(let i=0;i<30;i++){if(getSelector() && !getSelector().webContents.isLoading())break;await wait(100);}
    assert.equal(getSelector().targetDisplay.id,d.id);
    const bounds=getSelector().getBounds();
    assert.deepEqual(bounds,d.workArea);
    assert.equal(panel.isVisible(),false);
    await getSelector().webContents.executeJavaScript('window.lens.selectRegion({x:20,y:20,size:320})');
    await wait(150);
    assert.deepEqual(getOverlay().getBounds(),{x:bounds.x+20,y:bounds.y+20,width:320,height:320});
    assert.equal(panel.isVisible(),true);
    const promise=js('window.lens.capture(true)');
    await wait(50);
    assert.equal(panel.isVisible(),false);
    const otherCapture=await promise;
    assert.equal(panel.isVisible(),true);
    assert.ok(otherCapture.startsWith('data:image/png;base64,'));
  }
  await js(`window.lens.selectBoard(${screen.getPrimaryDisplay().id})`);
  for(let i=0;i<30;i++){if(getSelector() && !getSelector().webContents.isLoading())break;await wait(100);}
  await getSelector().webContents.executeJavaScript('window.lens.selectRegion({x:20,y:20,size:320})');
  for(let i=0;i<30;i++){if(getOverlay() && !getOverlay().webContents.isLoading())break;await wait(100);}
  await wait(200);
  assert.equal(getOverlay().isFocusable(),false);
  assert.equal(getOverlay().isAlwaysOnTop(),true);
  assert.equal(await getOverlay().webContents.executeJavaScript('document.querySelectorAll("line[data-kind=move]").length'),1);
  assert.equal(await getOverlay().webContents.executeJavaScript('document.querySelectorAll("line[data-kind=idea]").length'),2);
  const capture=await js('window.lens.capture()');assert.ok(capture.startsWith('data:image/png;base64,'));
  assert.equal(await js(`fingerprints(${JSON.stringify(capture)}).then(f=>f.length)`),64);
  assert.equal(await js(`fingerprints(${JSON.stringify(capture)}).then(f=>changedCells(f,f).length)`),0);
  const boardBefore=(await fixture.webContents.capturePage()).toDataURL();
  const fixtureImage=await fixture.webContents.capturePage();
  const fixtureSize=fixtureImage.getSize(), bitmap=fixtureImage.toBitmap();
  const detected=require('../src/board-detector.cjs').detectBoards(fixtureSize.width,fixtureSize.height,(x,y)=>{
    const i=4*(y*fixtureSize.width+x);return [bitmap[i+2],bitmap[i+1],bitmap[i]];
  });
  assert.deepEqual(detected,[{x:0,y:0,size:fixtureSize.width,height:fixtureSize.height}]);
  assert.equal(await js(`fingerprints(${JSON.stringify(boardBefore)}).then(f=>plausibleBoard(f,Array.from({length:64},(_,i)=>i).filter(i=>i<16 || i>=48)))`),true);
  assert.equal(await js('plausibleBoard(Array.from({length:64},()=>[0,0,0]),[0,1,2])'),false);
  assert.equal(await js('Boolean($("open-coach"))'),false);
  await js(`toggleTracking(async()=>${JSON.stringify(boardBefore)})`);
  const autoCoach=BrowserWindow.getAllWindows().find(window=>window.getTitle()==='Opening Lens Coach');
  assert.ok(autoCoach,'Successful calibration should open the Coach automatically');
  await js('pause()');
  assert.equal(await js('mode()'),'w');
  const detectedSides=await js(`(async()=>{
    const source=new Image();source.src=${JSON.stringify(boardBefore)};await source.decode();
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const context=canvas.getContext('2d');context.translate(canvas.width,canvas.height);context.rotate(Math.PI);context.drawImage(source,0,0);
    return [await bottomPieceColor(source.src),await bottomPieceColor(canvas.toDataURL())];
  })()`);
  assert.deepEqual(detectedSides,['w','b']);
  for(let i=0;i<30 && !autoCoach.isVisible();i++)await wait(100);
  assert.equal(autoCoach.isVisible(),true);
  const coachMessage=win=>win.webContents.executeJavaScript('document.querySelector("#coach-message").textContent');
  assert.match(await coachMessage(autoCoach),/^Coach: e4, Plant a pawn in the center/);
  assert.equal(autoCoach.isContentProtected(),true);
  assert.equal(getOverlay().isContentProtected(),true);
  autoCoach.setPosition(x+20,y+20);
  const warning=win=>win.webContents.executeJavaScript('document.querySelector("#overlap-warning").textContent');
  for(let i=0;i<20 && !(await warning(autoCoach));i++)await wait(50);
  assert.match(await warning(autoCoach),/covering the chessboard/);
  let hides=0;
  const hidden=()=>hides++;
  autoCoach.on('hide',hidden);
  getOverlay().on('hide',hidden);
  for(let i=0;i<3;i++)await js('window.lens.capture()');
  assert.equal(hides,0);
  assert.equal(autoCoach.isVisible(),true);
  assert.equal(getOverlay().isVisible(),true);
  autoCoach.setPosition(x+400,y+20);
  for(let i=0;i<20 && (await warning(autoCoach));i++)await wait(50);
  assert.equal(await warning(autoCoach),'');
  getOverlay().off('hide',hidden);
  await js('$("playing-side").value="both"; $("playing-side").dispatchEvent(new Event("change"))');
  await js(`window.lens.chess('move',{fen,move:'e4'}).then(({move})=>followMove(move))`);
  for(let i=0;i<20 && !(await coachMessage(autoCoach)).startsWith('Coach: e5,');i++)await wait(50);
  assert.match(await coachMessage(autoCoach),/^Coach: e5,/);
  assert.equal(await getOverlay().webContents.executeJavaScript('document.querySelectorAll("line[data-kind=idea]").length'),0);
  assert.equal(await autoCoach.webContents.executeJavaScript('document.querySelectorAll("#coach-message, [role=log]").length'),1);
  autoCoach.close();
  await js('$("restart").click()');
  await fixture.webContents.executeJavaScript('window.playE4()');
  await wait(200);
  const moved=(await fixture.webContents.capturePage()).toDataURL();
  const changed=await js(`Promise.all([fingerprints(${JSON.stringify(boardBefore)}),fingerprints(${JSON.stringify(moved)})]).then(([a,b])=>changedCells(a,b).map(square))`);
  assert.deepEqual(changed.sort(),['e2','e4']);
  assert.equal((await js(`window.lens.chess('infer',{fen:document.querySelector('#fen').value,changed:${JSON.stringify(changed)}})`)).san,'e4');
  const follow=move=>js(`window.lens.chess('move',{fen,move:${JSON.stringify(move)}}).then(({move})=>followMove(move))`);
  const arrowCount=()=>getOverlay().webContents.executeJavaScript('document.querySelectorAll("line[data-kind=move]").length');
  await js('$("playing-side").value="b"; $("playing-side").dispatchEvent(new Event("change")); $("skill").value=0; $("skill").dispatchEvent(new Event("change"))');
  assert.equal(await js('$("next-move").textContent'),'Waiting for White');
  assert.equal(await arrowCount(),0);
  await follow('e4');
  assert.equal(await js('$("next-move").textContent'),'Choose a defense');
  assert.equal((await suggestions()).length,3);
  assert.match((await suggestions())[0],/e5 · Open Game/);
  await js('$("skill").value=3; $("skill").dispatchEvent(new Event("change"))');
  assert.match((await suggestions())[0],/c5 · Sicilian Defense/);
  await js('$("skill").value=0; $("skill").dispatchEvent(new Event("change")); window.lens.openCoach()');
  const blackCoach=BrowserWindow.getAllWindows().find(window=>window.getTitle()==='Opening Lens Coach');
  for(let i=0;i<30 && !blackCoach.isVisible();i++)await wait(100);
  assert.equal(await blackCoach.webContents.executeJavaScript('document.querySelector("#switch-title").textContent'),'Choose a defense for Black');
  const blackPosition=await js('fen');
  await blackCoach.webContents.executeJavaScript('Array.from(document.querySelectorAll("#switch-options button")).find(b=>b.textContent.includes("Caro")).click()');
  for(let i=0;i<30 && (await js('$("next-move").textContent'))!=='1… c6';i++)await wait(50);
  assert.equal(await js('$("next-move").textContent'),'1… c6');
  assert.equal(await js('fen'),blackPosition);
  await follow('c6');
  assert.equal(await arrowCount(),0);
  await follow('d4');
  assert.equal(await js('$("next-move").textContent'),'2… d5');
  blackCoach.close();
  await js('$("playing-side").value="both"; $("playing-side").dispatchEvent(new Event("change")); $("skill").value=3; $("skill").dispatchEvent(new Event("change")); $("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');
  await follow('e4');
  assert.equal(await js('$("next-move").textContent'),'1… e5');
  await follow('c5');
  assert.match(await js('$("book-notice").textContent'),/c5 leaves the selected line/);
  assert.match(await js('$("book-options").textContent'),/Switch to Sicilian Defense/);
  await js('window.lens.openCoach()');
  const switchCoach=BrowserWindow.getAllWindows().find(window=>window.getTitle()==='Opening Lens Coach');
  for(let i=0;i<30 && !switchCoach.isVisible();i++)await wait(100);
  const switchChoices=()=>switchCoach.webContents.executeJavaScript('document.querySelector("#switch-options").textContent');
  for(let i=0;i<30 && !(await switchChoices()).includes('Sicilian Defense');i++)await wait(50);
  assert.match(await switchChoices(),/Sicilian Defense.*Nf3.*prepare d4/);
  assert.match(await switchChoices(),/Alapin variation.*c3.*pawn support/);
  assert.equal(await js('$("lesson").selectedOptions[0].textContent'),'Italian Game');
  const beforeSwitch=await js('fen');
  await switchCoach.webContents.executeJavaScript('document.querySelector("#switch-options button").click()');
  for(let i=0;i<30 && (await js('$("next-move").textContent'))!=='2. Nf3';i++)await wait(50);
  assert.equal(await js('$("next-move").textContent'),'2. Nf3');
  assert.equal(await js('fen'),beforeSwitch);
  assert.match(await coachMessage(switchCoach),/Coach: Nf3.*prepare d4/);
  switchCoach.close();
  await js(`(async()=>{
    const pgn='1. e4 Nc6 2. Nc3 Nf6 3. d4 e5';
    const parsed=await window.lens.chess('pgn',pgn);
    setFen(parsed.moves.at(-1).after);
    await loadCatalogLine({name:'Nimzowitsch Defense',eco:'B00',pgn},true);
  })()`);
  for(let i=0;i<60;i++){if(await js('Boolean(coached?.result?.fallback && !coached.pending)'))break;await wait(100);}
  assert.equal(await js('coached.result.fallback'),true);
  assert.equal(await arrowCount(),1);
  await js(`(async()=>{
    $('online-token').value='fixture-token';
    $('online-auto').checked=true;
    await extendOnline(async()=>[
      {san:'d5',uci:'d4d5',counts:[20,5,10],total:35},
      {san:'dxe5',uci:'d4e5',counts:[8,4,12],total:24}
    ]);
  })()`);
  assert.equal(await js('$("next-move").textContent'),'4. d5');
  assert.equal(await arrowCount(),1);
  assert.match(await js('$("variations").textContent'),/dxe5 .*24 master games/);
  assert.equal(await js('index'),6);
  await js('$("online-auto").checked=false; $("online-token").value=""; $("online-token").dispatchEvent(new Event("input"))');
  await js(`(async()=>{
    const parsed=await window.lens.chess('pgn','1. Nc3 d5 2. Nf3 e5 3. Nxe5 d4 4. Nb5 c6 5. Na3 f5 6. e3');
    setFen(parsed.moves.at(-1).after);
    await loadExternal(parsed,{name:'Off-book Van Geet study',catalog:true,idea:'Continue developing.'});
    applyPlayerSide(true);render();
  })()`);
  for(let i=0;i<60;i++){if(await js('Boolean(coached?.result?.fallback && coached.result.alternatives.length===3 && !coached.pending)'))break;await wait(100);}
  const planPosition=await js('fen');
  assert.equal(await js('positionPlans().length'),3);
  assert.equal(await getOverlay().webContents.executeJavaScript('document.querySelectorAll("line[data-kind=alternative]").length'),2);
  const plans=await js('positionPlans().map(plan=>plan.move)');
  const drawn=await getOverlay().webContents.executeJavaScript('Array.from(document.querySelectorAll("line[data-kind=move],line[data-kind=alternative]"),line=>({x:Number(line.getAttribute("x1")),y:Number(line.getAttribute("y1"))}))');
  assert.deepEqual(drawn,plans.map(move=>({x:(7-(move.from.charCodeAt(0)-97))*100+50,y:(Number(move.from[1])-1)*100+50})));
  await js('window.lens.openCoach()');
  const planCoach=BrowserWindow.getAllWindows().find(window=>window.getTitle()==='Opening Lens Coach');
  for(let i=0;i<30 && planCoach.webContents.isLoading();i++)await wait(100);
  assert.equal(await planCoach.webContents.executeJavaScript('document.querySelector("#switch-title").textContent'),'Plans for this position');
  await planCoach.webContents.executeJavaScript('document.querySelectorAll(".plan-option")[1].click()');
  for(let i=0;i<30 && (await js('coached.result.move.san'))!==plans[1].san;i++)await wait(50);
  assert.equal(await js('coached.result.move.san'),plans[1].san);
  assert.equal(await js('fen'),planPosition);
  await js('flipped=false; $("flip").checked=false; render()');
  const whiteStart=await getOverlay().webContents.executeJavaScript('(()=>{const line=document.querySelector("line[data-kind=move]");return {x:Number(line.getAttribute("x1")),y:Number(line.getAttribute("y1"))};})()');
  assert.deepEqual(whiteStart,{x:(plans[1].from.charCodeAt(0)-97)*100+50,y:(8-Number(plans[1].from[1]))*100+50});
  await follow(plans[1].san);
  assert.equal(await arrowCount(),0);
  assert.equal(await getOverlay().webContents.executeJavaScript('document.querySelectorAll("line[data-kind=alternative]").length'),0);
  planCoach.close();
  await js('$("playing-side").value="both"; $("playing-side").dispatchEvent(new Event("change"))');
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  await follow('e4');await follow('a6');
  for(let i=0;i<60;i++){if(/^Coach · (off-book|position plan)/.test(await js('$("coach-note").textContent')))break;await wait(100);}
  assert.equal(await js('$("next-move").textContent'),'2. d4');
  assert.match(await js('$("explanation").textContent'),/controls c5 and e5/);
  assert.match(await js('$("plan-preview").textContent'),/^Example continuation: 2\. d4 → /);
  assert.equal(await arrowCount(),1);
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');
  await follow('e4');await follow('c6');await follow('d4');await follow('Qa5+');
  for(let i=0;i<60;i++){if((await js('$("next-move").textContent'))==='3. c3')break;await wait(100);}
  assert.equal(await js('$("next-move").textContent'),'3. c3');
  assert.match(await js('$("review-note").textContent'),/Nf3 is illegal here/);
  assert.equal(await getOverlay().webContents.executeJavaScript('Boolean(document.querySelector("line[data-kind=review][stroke-dasharray]"))'),true);
  await js('window.lens.openCoach()');
  const floating=BrowserWindow.getAllWindows().find(window=>window.getTitle()==='Opening Lens Coach');
  assert.ok(floating);
  for(let i=0;i<30;i++){if(!floating.webContents.isLoading())break;await wait(100);}
  await wait(100);
  assert.match(await coachMessage(floating),/^Coach: c3, .*blocks the check.*Nf3 is illegal/);
  floating.close();
  // Recalibration must search the full catalog even when another catalog line is selected.
  await js('loadCatalogLine({name:"St. George Defense",eco:"B00",pgn:"1. e4 a6"},true)');
  const scandi=new Chess();scandi.loadPgn('1. e4 d5');
  await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(scandi.fen())})`);
  await wait(180);
  const screenshot=process.env.LENS_SCANDINAVIAN_TEST_IMAGE;
  const scandiBoard=screenshot
    ? require('electron').nativeImage.createFromPath(screenshot).crop({x:4,y:9,width:920,height:920})
    : await fixture.webContents.capturePage();
  const detection=await js(`fingerprints(${JSON.stringify(scandiBoard.toDataURL())}).then(image=>matchCapturedOpening(image,epoch))`);
  assert.match(detection.detected,/Scandinavian Defense, after 1… d5/);
  for(let i=0;i<40;i++){if((await js('$("next-move").textContent'))==='2. exd5')break;await wait(100);}
  assert.equal(await js('$("next-move").textContent'),'2. exd5');
  assert.equal(await arrowCount(),1);
  await follow('a3');
  assert.match(await js('$("book-notice").textContent'),/leaves this study line/);
  await js('$("book-options").lastElementChild.click()');
  assert.equal(await js('$("next-move").textContent'),'Coaching stopped');
  assert.equal(await arrowCount(),0);
  await js('$("restart").click()');
  assert.match(await js('$("opening").textContent'),/ST. GEORGE DEFENSE/);
  assert.equal(await js('$("next-move").textContent'),'1. e4');
  assert.equal(await js('$("skill").value'),'3');
  assert.equal((await suggestions()).length,3);
  assert.match(await js('$("status").textContent'),/New game ready/);
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  for(const san of ['e4','e5','Nf3','Nc6','Bc4','Nf6'])await follow(san);
  assert.match(await js('$("book-options").textContent'),/Italian Game · Two Knights Defense/);
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  const mid=new Chess();
  for(const san of ['e4','c5','c3','d5']) mid.move(san);
  for(const reverse of [false,true]){
    if(reverse) await js('$("flip").click()');
    await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(mid.fen())},${reverse})`);
    await wait(180);
    const png=(await fixture.webContents.capturePage()).toDataURL();
    assert.match(await js(`fingerprints(${JSON.stringify(png)}).then(image=>{
      const result=findStudyPosition(image);
      if(!result.match) throw Error('Rendered position did not produce a unique match');
      return adoptStudyPosition(result.match);
    })`),/Sicilian Defense · Alapin variation, after 2… d5/);
    await js('render()');
    assert.equal(await js('$("next-move").textContent'),'3. exd5');
  }
  await js('$("flip").click()');
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(mid.fen())})`);
  await wait(180);
  const skippedPosition=(await fixture.webContents.capturePage()).toDataURL();
  await js(`(async()=>{
    running=true; missedFrames=0; stable=0; pending='';
    baseline=await fingerprints(${JSON.stringify(boardBefore)});
    for(let i=0;i<6;i++){await captureLoop(epoch,async()=>${JSON.stringify(skippedPosition)});clearTimeout(timer);}
  })()`);
  assert.equal(await js('$("next-move").textContent'),'Board needs attention');
  assert.match(await js('$("status").textContent'),/Tracking paused:/);
  assert.equal(await js('$("preview").open'),true);
  assert.equal(await arrowCount(),0);
  await js('$("lesson").value=4; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  assert.equal(await js('$("lesson").selectedOptions[0].textContent'),'French Defense');
  const french=new Chess();french.move('e4');
  await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(french.fen())})`);
  await wait(180);
  const frenchBefore=(await fixture.webContents.capturePage()).toDataURL();
  french.move('e6');french.move('d4');
  await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(french.fen())})`);
  await wait(180);
  const frenchAfter=(await fixture.webContents.capturePage()).toDataURL();
  await follow('e4');
  await js(`(async()=>{
    running=true; missedFrames=0; stable=0; pending='';
    baseline=await fingerprints(${JSON.stringify(frenchBefore)});
    for(let i=0;i<6;i++){await captureLoop(epoch,async()=>${JSON.stringify(frenchAfter)});clearTimeout(timer);}
  })()`);
  assert.match(await js('$("status").textContent'),/Recovered e6, d4/);
  assert.equal(await js('$("next-move").textContent'),'2… d5');
  assert.match(await js('$("plan-preview").textContent'),/2… d5 → 3\. e5 → 3… c5/);
  assert.equal(await arrowCount(),1);
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  await js('pause(); $("lesson").value=4; $("lesson").dispatchEvent(new Event("change"))');
  const monitorId=screen.getPrimaryDisplay().id;
  await js(`window.lens.selectBoard(${monitorId},'moves')`);
  for(let i=0;i<30;i++){if(getSelector() && !getSelector().webContents.isLoading())break;await wait(100);}
  await getSelector().webContents.executeJavaScript('window.lens.selectRegion({x:80,y:80,width:210,height:70})');
  await js('pause()');
  await wait(150);
  assert.equal(await js('Boolean($("read-move-list") || $("clear-move-list"))'),false);
  assert.equal(await js('$("move-list-state").dataset.state'),'waiting');
  let sampleHides=0;
  const sampleHidden=()=>sampleHides++;
  panel.on('hide',sampleHidden);
  const sharedFrame=await js('window.lens.trackingFrame("")');
  assert.ok(sharedFrame.board.startsWith('data:image/png;base64,'));
  assert.equal(await js(`window.lens.confirmTrackingFrame(${sharedFrame.id})`),true);
  const unchangedFrame=await js(`window.lens.trackingFrame(${JSON.stringify(sharedFrame.signature)})`);
  assert.equal(unchangedFrame.board,null);
  assert.equal(await js(`window.lens.confirmTrackingFrame(${sharedFrame.id})`),false);
  panel.off('hide',sampleHidden);
  assert.equal(sampleHides,0);
  await js('window.lens.openCoach()');
  const overlapCoach=BrowserWindow.getAllWindows().find(window=>window.getTitle()==='Opening Lens Coach');
  for(let i=0;i<30 && !overlapCoach.isVisible();i++)await wait(100);
  overlapCoach.setPosition(x+80,y+80);
  for(let i=0;i<20 && !(await warning(overlapCoach)).includes('Moves panel');i++)await wait(50);
  assert.match(await warning(overlapCoach),/chessboard and Moves panel/);
  overlapCoach.close();
  await js('$("lesson").value=2; $("lesson").dispatchEvent(new Event("change"))');
  await js(`toggleTracking(async()=>${JSON.stringify(boardBefore)},true,async()=>{throw Error('Unreadable move list')})`);
  assert.equal(await js('$("tracking").textContent'),'Following');
  assert.equal(await js('$("skill-section").hidden'),false);
  assert.equal((await suggestions()).length,3);
  assert.equal(await js('$("next-move").textContent'),'1. d4');
  assert.match(await js('$("move-list-state").textContent'),/Following the board instead/);
  await js('pause()');
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');
  await js(`toggleTracking(window.lens.capture,true,async()=>({waiting:true,board:${JSON.stringify(boardBefore)},signature:'empty'}))`);
  assert.equal(await js('$("next-move").textContent'),'1. e4');
  assert.match(await js('$("move-list-state").textContent'),/Waiting for the first move/);
  assert.equal(await js('$("skill-section").hidden'),false);
  assert.equal((await suggestions()).length,3);
  const first=await js(`window.lens.chess('pgn','1. e4')`);
  await js(`(async()=>{
    clearTimeout(timer);
    for(let i=0;i<2;i++){await moveListLoop(epoch,async()=>({signature:'first',board:${JSON.stringify(moved)}}),async()=>(${JSON.stringify({...first,board:moved,signature:'first'})}));clearTimeout(timer);}
    pause();
  })()`);
  assert.equal(await js('$("next-move").textContent'),'Waiting for Black');
  assert.match(await js('$("move-list-state").textContent'),/Move list readable/);
  const tandem=await js(`(async()=>{
    const initial=${JSON.stringify(first.initial)},after=${JSON.stringify(first.moves[0].after)};
    setFen(initial);syncIndex();baseline=await fingerprints(${JSON.stringify(boardBefore)});
    running=true;listBaseline='empty';listCandidate='';listStable=0;listBoard=null;uncertain=false;
    let reads=0,quick=false;
    const held=[];
    for(const board of [${JSON.stringify(moved)},${JSON.stringify(boardBefore)},${JSON.stringify(moved)},${JSON.stringify(moved)}]){
      await moveListLoop(epoch,async()=>({signature:'new',board}),async(anchor,id,fast)=>{reads++;quick=fast;throw Error('Unclear text');});
      clearTimeout(timer);held.push(fen);
    }
    await moveListLoop(epoch,async()=>({signature:'new',board:null}),async()=>{reads++;});clearTimeout(timer);
    const result={reads,quick,held,fen,uncertain};pause();return result;
  })()`);
  assert.equal(tandem.reads,1);
  assert.equal(tandem.quick,true);
  assert.deepEqual(tandem.held.slice(0,3),Array(3).fill(first.initial));
  assert.equal(tandem.fen,first.moves[0].after);
  assert.equal(tandem.uncertain,false);
  assert.equal(await js('$("capture-preview").src'),moved);
  assert.match(await js('$("capture-state").textContent'),/Board move confirmed/);
  const restoredTandem=await js(`(async()=>{
    running=true;uncertain=true;let reads=0;
    await moveListLoop(epoch,async()=>({signature:listBaseline,board:${JSON.stringify(moved)}}),async()=>{reads++;});
    clearTimeout(timer);const result={reads,uncertain};pause();return result;
  })()`);
  assert.deepEqual(restoredTandem,{reads:0,uncertain:false});
  const rejectsOldRows=await js(`(async()=>{
    const previous=fen;setFen(fen.replace(/ 1$/,' 10'));
    try{await matchScreenList(epoch,async()=>(${JSON.stringify({...first,board:moved})}),true);return false;}
    catch(error){return error.message.includes('older than the confirmed position');}
    finally{setFen(previous);syncIndex();}
  })()`);
  assert.equal(rejectsOldRows,true);
  await js(`(async()=>{
    const source=new Image();source.src=${JSON.stringify(moved)};await source.decode();
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const context=canvas.getContext('2d');context.translate(canvas.width,canvas.height);context.rotate(Math.PI);context.drawImage(source,0,0);
    await matchScreenList(epoch,async()=>({... ${JSON.stringify(first)},board:canvas.toDataURL()}));
    uncertain=false;render();
  })()`);
  assert.equal(await js('mode()'),'b');
  assert.equal(await js('$("flip").checked'),true);
  assert.equal((await suggestions()).length,3);
  assert.equal(await js('$("next-move").textContent'),'Choose a defense');
  const rejectedEmpty=await js(`matchScreenList(epoch,async()=>({waiting:true,board:${JSON.stringify(moved)}})).then(()=>false,error=>error.message.includes('does not match the starting position'))`);
  assert.equal(rejectedEmpty,true);
  await js('$("lesson").value=4; $("lesson").dispatchEvent(new Event("change"))');
  await fixture.webContents.executeJavaScript(`(()=>{
    const panel=document.createElement('pre');
    panel.style.cssText='position:absolute;inset:0;margin:0;background:white;color:black;font:40px Arial;padding:20px;line-height:1.6;';
    panel.id='ocr-fixture';panel.textContent='1. e4 e6\\n2. d4';document.body.append(panel);
  })()`);
  await wait(180);
  const image=(await fixture.webContents.capturePage()).crop({x:0,y:0,width:320,height:155}).resize({width:650});
  const recognized=await require('../src/move-ocr.cjs').readMoveImage(image.toPNG());
  // Actual diagnostic capture: 12.Rb1 plus a fading, empty b6 highlight.
  const rookBefore=await fs.readFile(path.join(__dirname,'fixtures/move-panels/rook-highlight-before.png'));
  const rookAfter=await fs.readFile(path.join(__dirname,'fixtures/move-panels/rook-highlight-after.png'));
  const rookRecovery=await js(`(async()=>{
    const before=await fingerprints('data:image/png;base64,${rookBefore.toString('base64')}');
    const after=await fingerprints('data:image/png;base64,${rookAfter.toString('base64')}');
    const anchor='r3k1nr/pp4pp/1qnbbp2/4p2P/P2pP3/3P1N2/1P1BNPP1/R2QKB1R w KQkq - 1 12';
    const changed=changedPieceCells(before,after).map(i=>String.fromCharCode(97+7-i%8)+(1+Math.floor(i/8)));
    const candidates=await window.lens.chess('board-candidates',{fen:anchor,changed});
    const supported=candidates.filter(m=>verifyBoardPosition(before,after,anchor,m.after,true,{boardRecovery:true}));
    const wrong=after.slice();wrong[0]=after[1];
    return {changed,supported:supported.map(m=>m.san),rejectsExtraPiece:supported.length===1 && !verifyBoardPosition(before,wrong,anchor,supported[0].after,true,{boardRecovery:true})};
  })()`);
  assert.deepEqual(rookRecovery.supported,['Rb1']);
  assert.ok(rookRecovery.changed.includes('b6'));
  assert.equal(rookRecovery.rejectsExtraPiece,true);
  await require('./move-panel-fixtures.cjs')({nativeImage:require('electron').nativeImage,darkPanelVariant,
    scoreBoard:dataUrl=>js(`fingerprints(${JSON.stringify(dataUrl)}).then(image=>image.map(energy))`),
    fingerprintBoard:dataUrl=>js(`fingerprints(${JSON.stringify(dataUrl)})`),
    matchCapture:data=>js(`matchScreenList(epoch,async()=>(${JSON.stringify(data)})).then(()=>fen)`)});
  assert.deepEqual(recognized.moves.map(move=>move.san),['e4','e6','d4']);
  const staleAnchor=new Chess();staleAnchor.loadPgn('1. d4 d5 2. Nc3 Nf6');
  const recoveredHistory=await require('../src/move-ocr.cjs').readMoveImage(image.toPNG(),null,staleAnchor.fen());
  assert.ok(recoveredHistory.candidates.some(line=>line.moves.map(move=>move.san).join(' ')==='e4 e6 d4'));
  const resync=await js(`(async()=>{try{return await matchScreenList(epoch,async()=>(${JSON.stringify({...recognized,board:frenchAfter})}));}catch(error){return {error:error.message};}})()`);
  assert.match(resync.detected || resync.error,/move list through d4/);
  await js('$("playing-side").value="both"; $("playing-side").dispatchEvent(new Event("change"))');
  await js('render()');
  assert.equal(await js('$("next-move").textContent'),'2… d5');
  const listReads=await js(`(async()=>{
    let reads=0;
    running=true;listBaseline='one';listCandidate='';listStable=0;
    const check=async value=>{await moveListLoop(epoch,async()=>({signature:value,board:${JSON.stringify(frenchAfter)}}),async()=>{reads++;return (${JSON.stringify({...recognized,board:frenchAfter,signature:'two'})});});clearTimeout(timer);};
    await check('one');await check('one');await check('two');await check('two');await check('two');
    pause();
    return reads;
  })()`);
  assert.equal(listReads,1);
  const captureBefore=await fs.readFile(path.join(__dirname,'fixtures/move-panels/two-ply-capture-before.png'));
  const captureAfter=await fs.readFile(path.join(__dirname,'fixtures/move-panels/two-ply-capture-after.png'));
  const twoPly=await js(`(async()=>{
    const saved={fen,baseline,flipped,uncertain,listBaseline};
    pause();setFen('rnbqkbnr/pp4pp/2p1pp2/3P4/3P4/4P3/PP1N1PPP/R1BQKBNR b KQkq - 0 5');
    flipped=true;baseline=await fingerprints('data:image/png;base64,${captureBefore.toString('base64')}');
    listBaseline='before-capture';listCandidate='';listBoard=null;listStable=0;running=true;
    let reads=0;const started=performance.now();
    const sample=async()=>({signature:'after-capture',board:'data:image/png;base64,${captureAfter.toString('base64')}'});
    const read=async()=>{reads++;throw Error('Misread exd5');};
    await moveListLoop(epoch,sample,read);clearTimeout(timer);
    await moveListLoop(epoch,sample,read);clearTimeout(timer);
    const result={fen,uncertain,reads,elapsed:performance.now()-started};pause();
    setFen(saved.fen);baseline=saved.baseline;flipped=saved.flipped;uncertain=saved.uncertain;listBaseline=saved.listBaseline;render();
    return result;
  })()`);
  const captureGame=new Chess('rnbqkbnr/pp4pp/2p1pp2/3P4/3P4/4P3/PP1N1PPP/R1BQKBNR b KQkq - 0 5');
  captureGame.move('cxd5');captureGame.move('h4');
  assert.equal(twoPly.fen,captureGame.fen());
  assert.equal(twoPly.uncertain,false);
  assert.equal(twoPly.reads,0);
  console.log('Two-ply diagnostic recovery:',Math.round(twoPly.elapsed),'ms, no OCR required');
  const lateBefore=await fs.readFile(path.join(__dirname,'fixtures/move-panels/late-block-before.png'));
  const lateAfter=await fs.readFile(path.join(__dirname,'fixtures/move-panels/late-block-after.png'));
  const lateRecovery=await js(`(async()=>{
    const saved={fen,baseline,flipped,uncertain,listBaseline};pause();
    setFen('N1b1k2r/ppQp1ppp/2n5/2B3P1/5P2/P4K2/5p1P/q4B1R w - - 4 25');
    flipped=false;baseline=await fingerprints('data:image/png;base64,${lateBefore.toString('base64')}');
    listBaseline='late-before';listCandidate='';listBoard=null;listStable=0;running=true;
    let reads=0;const started=performance.now();
    const sample=async()=>({signature:'late-after',board:'data:image/png;base64,${lateAfter.toString('base64')}'});
    const read=async()=>{reads++;throw Error('Damaged old rows');};
    await moveListLoop(epoch,sample,read);clearTimeout(timer);
    await moveListLoop(epoch,sample,read);clearTimeout(timer);
    const result={fen,uncertain,reads,elapsed:performance.now()-started};pause();
    setFen(saved.fen);baseline=saved.baseline;flipped=saved.flipped;uncertain=saved.uncertain;listBaseline=saved.listBaseline;render();return result;
  })()`);
  const lateGame=new Chess('N1b1k2r/ppQp1ppp/2n5/2B3P1/5P2/P4K2/5p1P/q4B1R w - - 4 25');
  lateGame.move('Qxc8+');lateGame.move('Nd8');
  assert.equal(lateRecovery.fen,lateGame.fen());
  assert.equal(lateRecovery.uncertain,false);
  assert.equal(lateRecovery.reads,0);
  console.log('Late-game diagnostic recovery:',Math.round(lateRecovery.elapsed),'ms, no OCR required');
  const delayedReads=await js(`(async()=>{
    let reads=0;
    running=true;listBaseline='old';listCandidate='';listStable=0;
    for(let i=0;i<12;i++){
      await moveListLoop(epoch,async()=>({signature:'delayed',board:${JSON.stringify(frenchAfter)}}),async()=>{
        reads++;
        if(reads<3)throw Error('Board animation still in progress');
        return (${JSON.stringify({...recognized,board:frenchAfter,signature:'delayed'})});
      });
      clearTimeout(timer);
    }
    const result={reads,uncertain,baseline:listBaseline};
    pause();return result;
  })()`);
  assert.deepEqual(delayedReads,{reads:3,uncertain:false,baseline:'delayed'});
  const wrong=await js(`matchScreenList(epoch,async()=>(${JSON.stringify({...recognized,board:skippedPosition})})).then(()=>false,error=>error.message.includes('none of its positions'))`);
  assert.equal(wrong,true);
  assert.equal(await js('$("capture-preview").src'),skippedPosition);
  assert.match(await js('$("capture-state").textContent'),/awaiting position confirmation/);
  await require('./developer-smoke.cjs')({panel,js,wait});
  const themeGame=new Chess();themeGame.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6');
  for(const [background,color] of [['#ffffff','#111111'],['#1b1f26','#e5e7eb']]){
    await fixture.webContents.executeJavaScript(`(()=>{
      const panel=document.querySelector('#ocr-fixture');
      panel.style.cssText='position:absolute;inset:0;margin:0;padding:20px;font:22px Arial;line-height:1.7;background:${background};color:${color}';
      panel.textContent='1. e4 e5\\n2. Nf3 Nc6\\n3. Bc4 Bc5\\n4. O-O Nf6';
    })()`);
    await wait(180);
    const themeImage=await fixture.webContents.capturePage();
    const themeRead=await require('../src/move-ocr.cjs').readMoveImage(
      themeImage.resize({width:650}).toPNG(),themeImage.toPNG(),null,darkPanelVariant(themeImage));
    assert.ok((themeRead.candidates || [themeRead]).some(line=>line.moves.at(-1).after===themeGame.fen()),
      JSON.stringify({background,read:(themeRead.candidates || [themeRead]).map(line=>line.moves?.map(move=>move.san))}));
  }
  await fixture.webContents.executeJavaScript('document.querySelector("#ocr-fixture").remove()');
  if(process.env.LENS_MOVE_LIST_TEST_IMAGE){
    const crop=require('electron').nativeImage.createFromPath(process.env.LENS_MOVE_LIST_TEST_IMAGE);
    const variants=await require('../src/move-ocr.cjs').readMoveImage(crop.resize({width:Math.max(650,crop.getSize().width*2)}).toPNG(),crop.toPNG());
    assert.ok(variants.candidates.some(line=>line.moves.map(move=>move.san).join(' ')==='e4 a5'));
    const ware=new Chess();ware.loadPgn('1. e4 a5');
    await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(ware.fen())})`);
    await wait(180);
    const board=(await fixture.webContents.capturePage()).toDataURL();
    const choice=await js(`matchScreenList(epoch,async()=>(${JSON.stringify({...variants,board})})).then(value=>value.detected,error=>error.message)`);
    assert.match(choice,/move list through a5/);
    assert.equal(await js('fen'),ware.fen());
  }
  if(process.env.LENS_KNIGHT_LIST_TEST_IMAGE){
    const crop=require('electron').nativeImage.createFromPath(process.env.LENS_KNIGHT_LIST_TEST_IMAGE).crop({x:13,y:99,width:389,height:36});
    const alternatives=await require('../src/move-ocr.cjs').readMoveImage(crop.resize({width:778}).toPNG(),crop.toPNG());
    assert.ok(alternatives.candidates.some(line=>line.moves.map(m=>m.san).join(' ')==='e4 Na6'));
    const replay=new Chess();
    for(const san of ['e4','Na6']){
      replay.move(san);
      await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(replay.fen())})`);
      await wait(180);
      const board=(await fixture.webContents.capturePage()).toDataURL();
      const held=await js(`matchScreenList(epoch,async()=>(${JSON.stringify({...alternatives,board})})).then(value=>value.detected,error=>error.message)`);
      assert.match(held,new RegExp('move list through '+san));
      assert.equal(await js('fen'),replay.fen());
    }
  }
  if(process.env.LENS_FULL_PANEL_TEST_IMAGE){
    const full=require('electron').nativeImage.createFromPath(process.env.LENS_FULL_PANEL_TEST_IMAGE);
    const data=await require('../src/move-ocr.cjs').readMoveImage(full.resize({width:1248}).toPNG(),full.toPNG(),null,darkPanelVariant(full));
    assert.ok(data.candidates?.some(line=>line.moves.map(m=>m.san).join(' ')==='e4 h5 d4 d6'));
    const game=new Chess();game.loadPgn('1. e4 h5 2. d4 d6');
    await fixture.webContents.executeJavaScript(`window.showFen(${JSON.stringify(game.fen())})`);
    await wait(180);
    const board=(await fixture.webContents.capturePage()).toDataURL();
    const held=await js(`matchScreenList(epoch,async()=>(${JSON.stringify({...data,board})})).then(value=>value.detected,error=>error.message)`);
    assert.match(held,/move list through d6/);
  }
  await js('$("restart").click()');
  await wait(120);
  assert.equal(await js('$("move-list-state").dataset.state'),'idle');
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');
  await js('$("playing-side").value="both"; $("playing-side").dispatchEvent(new Event("change"))');
  const enterMove=move=>js(`$("played-move").value=${JSON.stringify(move)}; $("manual-move").requestSubmit()`);
  await enterMove('Kh4');await wait(100);
  assert.match(await js('$("status").textContent'),/not a legal move/);
  await enterMove('e2e4');await wait(100);
  assert.match(await js('$("status").textContent'),/Recorded e4/);
  assert.equal(await js('$("next-move").textContent'),'1… e5');
  await js('$("restart").click()');await wait(100);
  for(let i=0;i<80;i++){if((await js('$("catalog-summary").textContent')).includes('3,815'))break;await wait(100);}
  assert.match(await js('$("catalog-summary").textContent'),/3,815 lines/);
  await js('$("catalog-query").value="D85"; $("catalog-search").requestSubmit()');
  await wait(150);
  assert.match(await js('$("catalog-results").textContent'),/D85.*Grünfeld/);
  await js('$("catalog-results").firstElementChild.click()');await wait(150);
  assert.match(await js('$("opening").textContent'),/GRÜNFELD/);
  await js('$("online-lookup").click()');
  assert.match(await js('$("online-note").textContent'),/Enter a Lichess access token/);
  await js('$("trap-list").firstElementChild.click()');await wait(150);
  assert.match(await js('$("opening").textContent'),/LÉGAL’S MATE.*TAKE THE BAIT/);
  await js('$("variations").lastElementChild.click()');await wait(150);
  assert.match(await js('$("opening").textContent'),/AVOID THE SETUP/);
  await js(`(async()=>{
    const pgn='1. e4 Nc6';
    const parsed=await window.lens.chess('pgn',pgn);
    setFen(parsed.moves.at(-1).after);
    await loadCatalogLine({name:'Nimzowitsch Defense',eco:'B00',pgn},true);
  })()`);
  for(let i=0;i<40;i++){if((await js('$("next-move").textContent'))==='2. d4')break;await wait(100);}
  assert.equal(await js('$("next-move").textContent'),'2. d4');
  assert.equal(await arrowCount(),1);
  assert.match(await js('$("variations").textContent'),/Nf3.*Declined Variation/);
  await js('Array.from($("variations").children).find(b=>b.textContent.startsWith("Nf3 ·")).click()');
  await wait(200);
  assert.equal(await js('$("next-move").textContent'),'2. Nf3');
  await js('$("lesson").value=0; $("lesson").dispatchEvent(new Event("change"))');await wait(100);
  await js('document.querySelector("#flip").click()');await wait(100);
  assert.equal(await getOverlay().webContents.executeJavaScript('document.querySelector("line").getAttribute("x1")'),'350');
  const display=screen.getPrimaryDisplay(), b=display.bounds, area=display.workArea;
  const reviewSnapshot=require('electron').nativeImage.createFromBitmap(Buffer.alloc(b.width*b.height*4,255),{width:b.width,height:b.height});
  const proposed={x:area.x+42,y:area.y+42,width:300,height:300};
  const proposedMoves={x:area.x+410,y:area.y+42,width:260,height:380};
  const oldBounds=getOverlay().getBounds();
  beginRegionReview(display,reviewSnapshot,proposed,proposedMoves);
  let review=getSelector();
  for(let i=0;i<40 && !review.isVisible();i++)await wait(100);
  assert.notEqual(await review.webContents.executeJavaScript('document.getElementById("moves").hidden'),true);
  assert.deepEqual(getOverlay().getBounds(),oldBounds);
  await review.webContents.executeJavaScript('document.getElementById("board").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}))');
  assert.equal(await review.webContents.executeJavaScript('document.getElementById("board").style.left'),'43px');
  await review.webContents.executeJavaScript('document.getElementById("cancel").click()');
  await wait(150);
  assert.deepEqual(getOverlay().getBounds(),oldBounds);
  beginRegionReview(display,reviewSnapshot,proposed,proposedMoves);
  review=getSelector();
  for(let i=0;i<40 && !review.isVisible();i++)await wait(100);
  await review.webContents.executeJavaScript('document.getElementById("skip-moves").click(); document.getElementById("confirm").click()');
  for(let i=0;i<40 && getSelector();i++)await wait(100);
  assert.deepEqual(getOverlay().getBounds(),proposed);
  // Discord shares this normal window; protected local overlays remain separate.
  await js('window.lens.openStreamView()');
  const stream=BrowserWindow.getAllWindows().find(win=>win.getTitle()==='Opening Lens Stream View');
  assert.ok(stream);
  for(let i=0;i<40 && stream.webContents.isLoading();i++)await wait(100);
  await js('window.lens.capture(true)');
  await js(`window.lens.paint({flipped:true,arrows:[{from:'g8',to:'f6'}],highlights:['f6']});window.lens.publishCoach({opening:'Stream test',usable:true,move:'Nf6',explanation:'Develop the knight.'})`);
  await wait(180);
  assert.equal(await stream.webContents.executeJavaScript('document.getElementById("stream-board").hidden'),false);
  assert.equal(await stream.webContents.executeJavaScript('document.querySelector("svg line").getAttribute("x1")'),'150');
  assert.match(await stream.webContents.executeJavaScript('document.getElementById("message").textContent'),/Nf6, Develop the knight/);
  assert.equal(await stream.webContents.executeJavaScript('typeof window.lens.capture'),'undefined');
  // A stream preview must never become its own tracking input.
  stream.setBounds({...proposed,width:480,height:400});
  await wait(100);
  assert.match(await js('window.lens.capture().then(()=>"accepted",error=>error.message)'),/Stream View overlaps/);
  stream.close();
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${screens.length} monitor(s), overlay and calibration, opening switch prompts, catalog search and line selection, online token prompt, and trap branches.`);
  app.exit(0);
};
