module.exports=async({panel,js,wait})=>{
  const assert=require('node:assert/strict');
  const fs=require('node:fs/promises'),path=require('node:path');
  const {dialog}=require('electron');
  assert.equal((await js('window.lens.diagnosticsSnapshot()')).enabled,true);
  await js('pause(); $("developer-mode").open=true; $("debug-enabled").checked=true; $("debug-enabled").dispatchEvent(new Event("change"))');
  assert.equal((await js('window.lens.diagnosticsSnapshot()')).enabled,true);
  await js('window.lens.diagnosticsState({...window.lensDebug.stateProvider(),onlineToken:"diagnostic-secret-marker"})');
  await js('$("debug-inspect").click()');
  let snapshot;
  for(let i=0;i<60;i++){
    snapshot=await js('window.lens.diagnosticsSnapshot()');
    if(snapshot.ocr.length && snapshot.events.some(event=>event.stage==='OCR completed' || event.stage==='OCR failed'))break;
    await wait(100);
  }
  assert.ok(snapshot.captures.panel.startsWith('data:image/png;base64,'));
  assert.ok(snapshot.captures.board.startsWith('data:image/png;base64,'));
  assert.ok(snapshot.captures.ocrPanel.startsWith('data:image/png;base64,'));
  assert.equal(snapshot.captures.metadata.ocrCrop.width,snapshot.captures.metadata.panelPixels.width);
  assert.ok(snapshot.ocr.length);
  assert.equal(typeof snapshot.ocr[0].text,'string');
  assert.ok(snapshot.ocr[0].elapsedMs>=0);
  assert.ok(Array.isArray(snapshot.ocr[0].parses));
  assert.equal(snapshot.state.onlineToken,undefined);
  await js('window.lensDebug.record("Fixture board mismatch",{reason:"piece disagreement"},true)');
  snapshot=await js('window.lens.diagnosticsSnapshot()');
  assert.equal(snapshot.failure.event.stage,'Fixture board mismatch');
  assert.ok(snapshot.failure.captures.panel);
  await js('$("debug-view").value="failure"; $("debug-view").dispatchEvent(new Event("change"))');
  for(let i=0;i<30;i++){
    if((await js('$("debug-result").textContent')).includes('Fixture board mismatch'))break;
    await wait(100);
  }
  assert.match(await js('$("debug-result").textContent'),/Fixture board mismatch/);
  assert.match(await js('$("debug-ocr-text").textContent'),/Raw text/);
  assert.equal(await js('$("debug-panel-image").hidden'),false);
  assert.equal(await js('$("debug-crop-box").hidden'),false);
  for(let i=0;i<30 && !(await js('$("debug-words").width>0 && !$("debug-words").hidden'));i++)await wait(100);
  assert.equal(await js('$("debug-words").hidden'),false);
  const destination=path.resolve(__dirname,'../.tools/devmode-smoke-report.json');
  await fs.mkdir(path.dirname(destination),{recursive:true});
  const originalDialog=dialog.showSaveDialog;
  try{
    dialog.showSaveDialog=async()=>({canceled:false,filePath:destination});
    const exported=await js('window.lens.diagnosticsExport()');
    assert.equal(exported.path,destination);
    const raw=await fs.readFile(destination,'utf8'),report=JSON.parse(raw);
    assert.equal(report.schemaVersion,2);
    assert.ok(report.runtime.electron);
    assert.ok(report.failure.captures.panel.startsWith('data:image/png;base64,'));
    assert.equal(raw.includes('diagnostic-secret-marker'),false);
  }finally{
    dialog.showSaveDialog=originalDialog;
    await fs.rm(destination,{force:true});
  }
  await js('$("developer-mode").scrollIntoView({block:"start"})');
  await wait(100);
  await fs.writeFile(path.resolve(__dirname,'../.tools/devmode-smoke.png'),(await panel.webContents.capturePage()).toPNG());
  await js('$("debug-enabled").checked=false; $("debug-enabled").dispatchEvent(new Event("change"))');
  const stopped=await js('window.lens.diagnosticsSnapshot()');
  await js('window.lensDebug.record("Should not record")');
  assert.equal((await js('window.lens.diagnosticsSnapshot()')).events.length,stopped.events.length);
  await js('$("debug-clear").click(); $("developer-mode").open=false');
  assert.equal((await js('window.lens.diagnosticsSnapshot()')).failure,null);
};
