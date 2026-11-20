const { app, BrowserWindow, ipcMain, screen, desktopCapturer, globalShortcut, dialog, shell, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const core = require('./core.cjs');
const { detectBoards } = require('./board-detector.cjs');
const { Chess } = require('chess.js');
const { Worker } = require('node:worker_threads');
const { fetchMasters } = require('./explorer.cjs');
const { coachPosition } = require('./coach.cjs');
const { readMoveImage, findMovesHeading } = require('./move-ocr.cjs');
const {changedMoveRows}=require('./move-panel-crop.cjs');
const diagnostics=require('./diagnostics.cjs');
const startedAt=new Date().toISOString();
process.on('uncaughtExceptionMonitor',error=>diagnostics.record('Main-process exception',
  {message:error.message,stack:error.stack},true));
const { panelNearBoard } = require('./region-review.cjs');
const { createHash } = require('node:crypto');
const { answerCoach } = require('./coach-chat.cjs');
let coachWindow, coachState, chatBusy=false;
let streamWindow,streamBoard;
function sendStream(channel,value){
  if(streamWindow && !streamWindow.isDestroyed() && !streamWindow.webContents.isLoading())streamWindow.webContents.send(channel,value);
}
function publishStreamBoard(image){
  if(!streamWindow || streamWindow.isDestroyed())return;
  streamBoard=typeof image==='string'?image:image.toDataURL();
  sendStream('stream-board',streamBoard);
}
let moveList, readingList=false;
let trackingFrame,confirmedFrame,trackingFrameId=0;
let lastDiagnosticCapture=0;
let coachingTask;
let worker, catalogId=0, catalogError, onlineBusy=false, nextOnlineRequest=0;
const catalogPending=new Map();
function askCatalog(action,data){
  if(catalogError)return Promise.reject(catalogError);
  if(!worker){
    worker=new Worker(path.join(__dirname,'catalog-worker.cjs'),{workerData:path.join(__dirname,'..','data','openings')});
    const fail=error=>{catalogError=error;for(const req of catalogPending.values())req.reject(error);catalogPending.clear();};
    worker.on('error',fail);
    worker.on('exit',code=>{if(code && !catalogError)fail(Error('Opening catalog worker stopped.'));});
    worker.on('message',({id,value,error,fatal})=>{
      if(fatal){fail(Error(fatal));return;}
      const pending=catalogPending.get(id);
      if(!pending)return;
      catalogPending.delete(id);
      if(error)pending.reject(Error(error));else pending.resolve(value);
    });
    worker.unref();
  }
  return new Promise((resolve,reject)=>{
    const id=++catalogId;
    catalogPending.set(id,{resolve,reject});
    worker.postMessage({id,action,data});
  });
}
let panel, overlay, selector, boardRegion, boardDisplayId, capturing=false, annotations = { arrows: [], highlights: [] }, visible = true;
const options = { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true };
const intersects=(a,b)=>a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y;
function updateCoachOverlap(){
  if(!coachWindow || coachWindow.isDestroyed() || coachWindow.webContents.isLoading())return;
  const bounds=coachWindow.getBounds();
  const targets=[];
  if(boardRegion && intersects(bounds,boardRegion))targets.push('chessboard');
  if(moveList && intersects(bounds,moveList.region))targets.push('Moves panel');
  coachWindow.webContents.send('coach-overlap',targets);
}
function excludeFromCapture(win){
  if(process.platform==='win32')win.setContentProtection(true);
}
function isPanelSender(event) {
  return Boolean(panel && !panel.isDestroyed() && !panel.webContents.isDestroyed() && event.sender===panel.webContents);
}
function sendOverlay() { const data={...annotations,visible}; if (overlay && !overlay.isDestroyed() && !overlay.webContents.isDestroyed()) overlay.webContents.send('paint',data); sendStream('paint',data); }
function safeWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
}
function makeOverlay() {
  if (overlay) overlay.close();
  overlay = new BrowserWindow({ ...boardRegion, transparent: true, frame: false, hasShadow: false, resizable: false, focusable: false, skipTaskbar: true, alwaysOnTop: true, webPreferences: options });
  overlay.setIgnoreMouseEvents(true);
  excludeFromCapture(overlay);
  overlay.setAlwaysOnTop(true, 'screen-saver');
  safeWindow(overlay);
  overlay.loadFile(path.join(__dirname, 'overlay.html'));
  overlay.webContents.once('did-finish-load', sendOverlay);
}
function connectBoard(region,id,auto=false) {
  streamBoard=null;sendStream('stream-board',null);
  boardRegion=region;boardDisplayId=id;
  annotations={arrows:[],highlights:[]};
  makeOverlay();
  updateCoachOverlap();
  panel.webContents.send('board-selected',{...region,displayId:id,auto});
}
app.whenReady().then(async () => {
  if(process.argv.includes('--release-check')){
    try{
      const book=await askCatalog('summary');
      const game=new Chess();game.loadPgn('1. e4 c6 2. d4 Qa5+');
      const plan=core.gamePositions('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3').moves;
      const recommendation=await coachPosition(game.fen(),plan,{usual:plan[2]});
      const blank=nativeImage.createFromBitmap(Buffer.alloc(200*60*4,255),{width:200,height:60});
      const ocr=await readMoveImage(blank.toPNG());
      if(book.count!==3815 || recommendation?.move.san!=='c3' || !recommendation.review || !ocr.waiting)throw Error('Release dependency check did not pass.');
      console.log(`Opening Lens v${app.getVersion()}: ${book.count} openings loaded, local Coach and OCR passed.`);
      app.exit(0);
    }catch(error){console.error(error);app.exit(1);}
    return;
  }
  if(process.argv.includes('--screen-test')){
    try{
      const result=await findCaptureRegions();
      let movePanelStatus='not detected';
      if(result.moves){
        const {width,height}=result.image.getSize(), bounds=result.display.bounds;
        const region=result.moves,sx=width/bounds.width,sy=height/bounds.height;
        const image=result.image.crop({x:Math.round((region.x-bounds.x)*sx),y:Math.round((region.y-bounds.y)*sy),
          width:Math.round(region.width*sx),height:Math.round(region.height*sy)});
        try {
          const read=await readMoveImage(image.resize({width:Math.min(1600,Math.max(650,image.getSize().width*2))}).toPNG(),image.toPNG(),null,darkPanelVariant(image));
          movePanelStatus=read.waiting?'waiting for first move':'readable text';
        }catch(error){movePanelStatus=error.message;}
      }
      console.log(JSON.stringify({display:result.display.label,board:result.board,moves:result.moves || null,movePanelStatus}));
      app.exit(0);
    }catch(error){console.error(error.message);app.exit(1);}
    return;
  }
  panel = new BrowserWindow({ width: 440, height: 880, minWidth: 390, minHeight: 660, backgroundColor: '#10191b', title: 'Opening Lens', webPreferences: options });
  safeWindow(panel);
  panel.loadFile(path.join(__dirname, 'index.html'));
  if (process.argv.includes('--smoke-test')) panel.webContents.once('did-finish-load', async () => {
    try { await require('../test/native-smoke.cjs')({ app, panel, getOverlay: () => overlay, getSelector: () => selector, darkPanelVariant, beginRegionReview }); }
    catch(error){console.error(error);app.exit(1);}
  });
  panel.on('closed', () => app.quit());
  globalShortcut.register('CommandOrControl+Shift+Space', () => { visible = !visible; sendOverlay(); });
  for (const name of ['display-added','display-removed','display-metrics-changed']) {
    screen.on(name, (_event, display) => {
      if (panel.isDestroyed()) return;
      if (display.id === boardDisplayId) {
        boardRegion = null;
        overlay?.close();
        overlay = null;
        panel.webContents.send('board-selected', null);
      }
      if(display.id===moveList?.id){
        moveList=null;
        panel.webContents.send('move-list-selected',false);
      }
      updateCoachOverlap();
      panel.webContents.send('displays-changed');
    });
  }
});
app.on('will-quit', () => globalShortcut.unregisterAll());
ipcMain.handle('open-coach',event=>{
  if(!isPanelSender(event))return;
  if(coachWindow && !coachWindow.isDestroyed()){
    if(coachWindow.isMinimized())coachWindow.restore();
    if(!coachWindow.isVisible() && !coachWindow.webContents.isLoading())coachWindow.showInactive();
    updateCoachOverlap();
    return;
  }
  const display=screen.getAllDisplays().find(d=>d.id===boardDisplayId)||screen.getDisplayMatching(panel.getBounds());
  const area=display.workArea, width=350,height=Math.min(560,area.height);
  const left=area.x+12,right=area.x+area.width-width-12,top=area.y+12,bottom=area.y+area.height-height-12;
  const corners=[[right,top],[right,bottom],[left,top],[left,bottom]].map(([x,y])=>({x,y,width,height}));
  const used=[boardRegion,moveList?.region,panel.getBounds()].filter(Boolean);
  const bounds=corners.find(candidate=>!used.some(region=>intersects(candidate,region))) || corners[0];
  coachWindow=new BrowserWindow({title:'Opening Lens Coach',...bounds,show:false,minWidth:300,minHeight:350,alwaysOnTop:true,backgroundColor:'#10191b',webPreferences:options});
  excludeFromCapture(coachWindow);
  safeWindow(coachWindow);
  coachWindow.on('closed',()=>{coachWindow=null;});
  coachWindow.webContents.once('did-finish-load',()=>{
    if(coachState && coachWindow)coachWindow.webContents.send('coach-state',coachState);
    updateCoachOverlap();
  });
  for(const event of ['move','resize','show','restore'])coachWindow.on(event,updateCoachOverlap);
  coachWindow.once('ready-to-show',()=>coachWindow?.showInactive());
  coachWindow.loadFile(path.join(__dirname,'coach-window.html'));
});
ipcMain.on('coach-state',(event,state)=>{
  if(!isPanelSender(event))return;
  coachState=state;
  sendStream('coach-state',state);
  if(coachWindow && !coachWindow.isDestroyed() && !coachWindow.webContents.isDestroyed())coachWindow.webContents.send('coach-state',state);
});
ipcMain.handle('open-stream-view',event=>{
  if(!isPanelSender(event))return false;
  if(streamWindow && !streamWindow.isDestroyed()){streamWindow.show();return true;}
  const displays=screen.getAllDisplays();
  const display=displays.find(d=>d.id!==boardDisplayId) || screen.getDisplayMatching(panel.getBounds());
  const area=display.workArea;
  streamWindow=new BrowserWindow({title:'Opening Lens Stream View',x:area.x+20,y:area.y+20,
    width:Math.min(1040,area.width-40),height:Math.min(780,area.height-40),minWidth:480,minHeight:400,
    backgroundColor:'#10191b',webPreferences:{...options,preload:path.join(__dirname,'stream-preload.cjs')}});
  safeWindow(streamWindow);
  streamWindow.on('closed',()=>{streamWindow=null;streamBoard=null;});
  streamWindow.webContents.once('did-finish-load',()=>{
    sendStream('stream-board',streamBoard);
    sendStream('paint',{...annotations,visible});
    if(coachState)sendStream('coach-state',coachState);
  });
  streamWindow.loadFile(path.join(__dirname,'stream-view.html'));
  // Reuse the last clean tracking frame; opening this view never starts a capture loop.
  if(trackingFrame?.region===boardRegion)publishStreamBoard(trackingFrame.board);
  return true;
});
ipcMain.handle('choose-coach-variation',(event,position,id)=>{
  if(!coachWindow || event.sender!==coachWindow.webContents || coachState?.fen!==position || !coachState.variations?.some(choice=>choice.id===id))return false;
  if(!panel || panel.isDestroyed())return false;
  panel.webContents.send('coach-variation',{position,id});
  return true;
});
ipcMain.handle('ask-coach',async(event,data)=>{
  if(!coachWindow || event.sender!==coachWindow.webContents || chatBusy)throw Error('Coach chat is unavailable.');
  chatBusy=true;
  try{return await answerCoach({...data,position:coachState});}finally{chatBusy=false;}
});
ipcMain.handle('list-displays', event => {
  if (!isPanelSender(event)) return [];
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d,i) => ({
    id:d.id, label:`Monitor ${i+1} · ${d.label || 'Display'} (${d.bounds.width}×${d.bounds.height})${d.id === primary.id ? ' · Primary' : ''}`
  }));
});
ipcMain.handle('select-board', (event, id, kind) => {
  if (!isPanelSender(event)) return;
  if (selector) return;
  const display = screen.getAllDisplays().find(d => d.id === id);
  if (!display) throw Error('That monitor is no longer connected. Choose another monitor.');
  selector = new BrowserWindow({ ...display.workArea, transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: options });
  selector.targetDisplay = display;
  selector.moveList=kind==='moves';
  safeWindow(selector);
  selector.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') { event.preventDefault(); selector?.close(); }
  });
  selector.loadFile(path.join(__dirname, 'select.html'),{query:{kind:selector.moveList?'moves':'board'}});
  const restorePanel = panel.isVisible() && !panel.isMinimized();
  if (restorePanel) panel.hide();
  selector.on('closed', () => {
    selector = null;
    if (restorePanel && !panel.isDestroyed()) panel.showInactive();
  });
});
ipcMain.handle('region-selected', (event, rect) => {
  if (!selector || event.sender !== selector.webContents) return;
  const {id} = selector.targetDisplay;
  const bounds = selector.getContentBounds();
  const isList=selector.moveList;
  const [givenW,givenH]=isList?[rect.width,rect.height]:[rect.size,rect.size];
  if(![rect.x,rect.y,givenW,givenH].every(Number.isFinite) || rect.x<0 || rect.y<0)return false;
  let width=Math.round(Math.min(givenW,bounds.width-rect.x)),height=Math.round(Math.min(givenH,bounds.height-rect.y));
  if(!isList)width=height=Math.min(width,height);
  if(width<(isList?80:160) || height<(isList?28:160))return false;
  const completedSelector = selector;
  // Let the IPC acknowledgement reach the selection renderer before destroying it.
  completedSelector.hide();
  setTimeout(() => { if (!completedSelector.isDestroyed()) completedSelector.close(); }, 50);
  const region={x:Math.round(bounds.x+rect.x),y:Math.round(bounds.y+rect.y),width,height};
  if(isList){moveList={region,id};panel.webContents.send('move-list-selected',true);updateCoachOverlap();}
  else connectBoard(region,id);
  return true;
});
ipcMain.handle('clear-move-list',event=>{
  if(!isPanelSender(event))return;
  moveList=null;panel.webContents.send('move-list-selected',false);updateCoachOverlap();
});
function beginRegionReview(display,image,board,moves,restore=()=>{}){
  selector=new BrowserWindow({...display.workArea,frame:false,alwaysOnTop:true,skipTaskbar:true,show:false,backgroundColor:'#10191b',webPreferences:options});
  const win=selector;
  win.targetDisplay=display;
  safeWindow(win);
  const bounds=win.getContentBounds(), screenBounds=display.bounds, dims=image.getSize();
  const sx=dims.width/screenBounds.width,sy=dims.height/screenBounds.height;
  const crop=image.crop({x:Math.round((bounds.x-screenBounds.x)*sx),y:Math.round((bounds.y-screenBounds.y)*sy),width:Math.floor(bounds.width*sx),height:Math.floor(bounds.height*sy)});
  const local=region=>region && {...region,x:region.x-bounds.x,y:region.y-bounds.y};
  win.review={board:local(board),moves:local(moves),image:crop.toDataURL()};
  win.once('ready-to-show',()=>win.show());
  win.on('closed',()=>{
    if(selector===win)selector=null;
    restore();
    if(!win.confirmed && !panel.isDestroyed())panel.webContents.send('region-review-cancelled');
  });
  win.loadFile(path.join(__dirname,'review.html'));
}
ipcMain.handle('region-review-data',event=>{
  if(selector?.review && event.sender===selector.webContents)return selector.review;
});
ipcMain.handle('cancel-region-review',event=>{
  if(selector?.review && event.sender===selector.webContents){
    const win=selector;
    setTimeout(()=>{if(!win.isDestroyed())win.close();},50);
  }
});
ipcMain.handle('confirm-region-review',(event,regions)=>{
  if(!selector?.review || event.sender!==selector.webContents)return false;
  const win=selector,bounds=win.getContentBounds(), id=win.targetDisplay.id;
  const read=(rect,board)=>{
    if(!rect || ![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite))return null;
    const [x,y,width,height]=[rect.x,rect.y,rect.width,rect.height].map(Math.round);
    if(x<0 || y<0 || x+width>bounds.width || y+height>bounds.height || width<(board?160:80) || height<(board?160:28) || (board && width!==height))return null;
    return {x:x+bounds.x,y:y+bounds.y,width,height};
  };
  const board=read(regions?.board,true), list=read(regions?.moves,false);
  if(!board || (regions?.moves && (!list || intersects(board,list))))return false;
  win.confirmed=true;
  win.hide();
  setTimeout(()=>{
    if(win.isDestroyed())return;
    win.close();
    moveList=list?{region:list,id}:null;
    panel.webContents.send('move-list-selected',Boolean(list));
    connectBoard(board,id,true);
  },100);
  return true;
});
async function findCaptureRegions(){
    const displays=screen.getAllDisplays();
    // Request monitor-sized thumbnails so the normal scan preserves the
    // spacing of fine grid lines on large boards.
    const captureWidth=Math.max(...displays.map(d=>Math.round(d.bounds.width*d.scaleFactor)));
    const captureHeight=Math.max(...displays.map(d=>Math.round(d.bounds.height*d.scaleFactor)));
    const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:captureWidth,height:captureHeight}});
    const matches=[];
    for(const display of displays) {
      const image=sources.find(source=>source.display_id===String(display.id))?.thumbnail;
      if(!image || image.isEmpty())continue;
      const {width,height}=image.getSize();
      const pixels=image.toBitmap();
      const scaleX=display.bounds.width/width, scaleY=display.bounds.height/height;
      const pixel=(x,y)=>{const i=4*(y*width+x);return [pixels[i+2],pixels[i+1],pixels[i]];};
      // Desktop thumbnail dimensions may stretch the monitor image. Match
      // rows and columns in monitor coordinates, not raw thumbnail pixels.
      for(const rect of detectBoards(width,height,pixel,scaleX/scaleY)) {
        const w=rect.size*scaleX,h=rect.height*scaleY;
        if(Math.abs(w-h)>Math.max(4,w*.04))continue;
        const size=Math.round((w+h)/2);
        if(size<160)continue;
        matches.push({display,image,rect,pixel,width,height,scaleX,scaleY,region:{x:display.bounds.x+Math.round(rect.x*scaleX),y:display.bounds.y+Math.round(rect.y*scaleY),width:size,height:size}});
      }
    }
    if(matches.length!==1)throw Error(matches.length?'Found several possible boards. Close extra boards or select yours manually.':'No clear 8×8 grid found. Use a flat, straight-on view or select the board manually.');
    const candidate=matches[0];
    const {display,image,rect,pixel,width,height,scaleX,scaleY,region}=candidate;
    let moves;
    try {
      const headings=await findMovesHeading(image.toPNG());
      const guess=panelNearBoard(rect,headings,width,height,pixel);
      if(guess)moves={x:display.bounds.x+Math.round(guess.x*scaleX),y:display.bounds.y+Math.round(guess.y*scaleY),width:Math.round(guess.width*scaleX),height:Math.round(guess.height*scaleY)};
    }catch{}
    return {display,image,board:region,moves};
}
ipcMain.handle('find-board', async event => {
  if(!isPanelSender(event) || selector || capturing || readingList) throw Error('Finish the current board capture first.');
  capturing=true;
  const oldOverlay=overlay, wasVisible=oldOverlay?.isVisible(), panelVisible=panel.isVisible();
  if(panelVisible)panel.hide();
  oldOverlay?.hide();
  let reviewing=false;
  const restore=()=>{
    if(panelVisible && !panel.isDestroyed())panel.showInactive();
    if(wasVisible && oldOverlay && !oldOverlay.isDestroyed())oldOverlay.showInactive();
  };
  try {
    await new Promise(resolve=>setTimeout(resolve,150));
    const {display,image,board,moves}=await findCaptureRegions();
    beginRegionReview(display,image,board,moves,restore);
    reviewing=true;
  } finally {
    capturing=false;
    if(!reviewing)restore();
  }
});
ipcMain.handle('paint-board', (event, data) => {
  if (!isPanelSender(event)) return;
  annotations = data; sendOverlay();
});
async function captureRegions(regions,calibration) {
  if (capturing) throw Error('A capture is already in progress. Try again in a moment.');
  const displays=screen.getAllDisplays();
  const targets=regions.map(({region,id})=>{
    const display=displays.find(d=>d.id===id);
    if(!display)throw Error('The selected monitor disconnected. Select the region again.');
    const b=display.bounds;
    if(region.x<b.x || region.y<b.y || region.x+region.width>b.x+b.width || region.y+region.height>b.y+b.height)throw Error('Select each region entirely inside one display.');
    return {region,display};
  });
  // The drawing and Coach windows stay visible but are excluded from capture.
  const panelVisible = panel.isVisible() && !panel.isMinimized();
  if (!calibration && panelVisible && regions.some(target=>intersects(panel.getBounds(),target.region))) {
    throw Error('The main window overlaps a capture area. Move it aside and restart tracking.');
  }
  if(streamWindow && !streamWindow.isDestroyed() && streamWindow.isVisible() && !streamWindow.isMinimized() &&
    regions.some(target=>intersects(streamWindow.getBounds(),target.region))){
    throw Error('Stream View overlaps the board or move panel. Move Stream View to another monitor or a clear area.');
  }
  capturing = true;
  if (calibration && panelVisible) panel.hide();
  try {
    if(calibration && panelVisible)await new Promise(resolve => setTimeout(resolve, 120));
    const width=Math.max(...targets.map(({display:d})=>Math.round(d.bounds.width*d.scaleFactor)));
    const height=Math.max(...targets.map(({display:d})=>Math.round(d.bounds.height*d.scaleFactor)));
    const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width,height}});
    return targets.map(({region,display})=>{
      const b=display.bounds,image=sources.find(s=>s.display_id===String(display.id))?.thumbnail;
      if(!image || image.isEmpty())throw Error('Windows did not return an image for this monitor. Try windowed mode.');
      const dims=image.getSize(), sx=dims.width/b.width,sy=dims.height/b.height;
      const x=Math.round((region.x-b.x)*sx),y=Math.round((region.y-b.y)*sy);
      const crop=image.crop({x,y,width:Math.round((region.x+region.width-b.x)*sx)-x,height:Math.round((region.y+region.height-b.y)*sy)-y});
      if(crop.isEmpty())throw Error('A selected region was empty. Select it again.');
      return crop;
    });
  } finally {
    capturing=false;
    if (calibration && panelVisible && !panel.isDestroyed()) panel.showInactive();
  }
}
ipcMain.handle('capture-board',async(event,calibration)=>{
  if(!isPanelSender(event) || !boardRegion)throw Error('Select a board first.');
  const [image]=await captureRegions([{region:boardRegion,id:boardDisplayId}],calibration);
  const url=image.toDataURL();
  publishStreamBoard(url);
  if(diagnostics.isEnabled()){
    diagnostics.setCaptures({board:url,liveMetadata:{at:new Date().toISOString(),
      boardRegion:{...boardRegion,displayId:boardDisplayId},boardPixels:image.getSize()}});
    diagnostics.record('Board captured',{calibration});
  }
  return url;
});
function darkPanelVariant(image){
  const {width,height}=image.getSize(), pixels=image.toBitmap();
  if(pixels.length!==width*height*4 || width>1100 || height>1100)return null;
  const gray=i=>(pixels[i]+pixels[i+1]+pixels[i+2])/3;
  const samples=Array.from({length:49},(_,i)=>gray((Math.floor((Math.floor(i/7)+.5)*height/7)*width+Math.floor((i%7+.5)*width/7))*4)).sort((a,b)=>a-b);
  if(samples[24]>100)return null;
  // Keep the full selected area, but give small light-on-dark text a second
  // pass on a light background at twice the pixel size.
  const edge=Math.max(3,Math.floor(width*.02));
  let end=height-1;
  for(;end>=28;end--){
    let ink=0;
    for(let x=edge;x<width-edge;x++)if(gray((end*width+x)*4)>Math.max(85,samples[24]+46))ink++;
    if(ink>=4 && ink<width*.3)break;
  }
  const w=width*2,h=Math.min(height,end+15)*2,target=Buffer.alloc(w*h*4,255);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const src=(Math.floor(y/2)*width+Math.floor(x/2))*4,to=(y*w+x)*4;
    target[to]=target[to+1]=target[to+2]=255-Math.round(gray(src));
  }
  return nativeImage.createFromBitmap(target,{width:w,height:h}).toPNG();
}
async function sampleTrackingFrame(calibration=false){
  const started=performance.now();
  const [board,list]=await captureRegions([{region:boardRegion,id:boardDisplayId},moveList],calibration);
  publishStreamBoard(board);
  trackingFrame={id:++trackingFrameId,board,list,region:boardRegion,moves:moveList,
    signature:createHash('sha256').update(list.toBitmap()).digest('hex'),captureMs:performance.now()-started};
  if(diagnostics.isEnabled() && (calibration || Date.now()-lastDiagnosticCapture>=1000)){
    lastDiagnosticCapture=Date.now();
    diagnostics.setCaptures({board:board.toDataURL(),panel:list.toDataURL(),
      confirmedBoard:confirmedFrame?.board.toDataURL() || null,
      liveMetadata:{at:new Date().toISOString(),frameId:trackingFrame.id,signature:trackingFrame.signature,captureMs:trackingFrame.captureMs,
        boardRegion:{...boardRegion,displayId:boardDisplayId},movePanel:{...moveList},
        boardPixels:board.getSize(),panelPixels:list.getSize(),
        displays:screen.getAllDisplays().map(display=>({id:display.id,bounds:display.bounds,scaleFactor:display.scaleFactor}))}});
  }
  return trackingFrame;
}
ipcMain.handle('tracking-frame',async(event,knownSignature)=>{
  if(!isPanelSender(event) || !boardRegion || !moveList)throw Error('Select the board and move panel first.');
  const frame=await sampleTrackingFrame();
  if(frame.signature!==knownSignature)frame.boardUrl=frame.board.toDataURL();
  return {id:frame.id,signature:frame.signature,board:frame.boardUrl || null};
});
ipcMain.handle('confirm-tracking-frame',(event,id)=>{
  if(!isPanelSender(event) || trackingFrame?.id!==id || trackingFrame.region!==boardRegion || trackingFrame.moves!==moveList)return false;
  confirmedFrame=trackingFrame;
  diagnostics.record('Frame confirmed',{frameId:id,signature:trackingFrame.signature});
  return true;
});
async function captureMoveList(event,anchor,id,quick=false){
  if(!isPanelSender(event) || !boardRegion || !moveList)throw Error('Select the board and the numbered move list first.');
  if(readingList)throw Error('The move list is already being read.');
  readingList=true;
  try {
    const frame=id===undefined?await sampleTrackingFrame(true):trackingFrame;
    if(!frame || (id!==undefined && frame.id!==id) || frame.region!==boardRegion || frame.moves!==moveList){
      throw Error('The capture changed. Retrying the current frame.');
    }
    const {board}=frame;
    const previous=confirmedFrame?.region===boardRegion && confirmedFrame.moves===moveList?confirmedFrame.list:null;
    let ocrCrop;
    const list=quick?changedMoveRows(previous,frame.list,diagnostics.isEnabled()?region=>{ocrCrop=region;}:undefined):frame.list;
    const width=list.getSize().width;
    const image=list.resize({width:Math.min(1600,Math.max(650,width*2)),quality:'best'});
    const known=typeof anchor==='string' && anchor.length<=120 ? new Chess(anchor).fen() : null;
    const scaled=image.toPNG(),original=list.toPNG(),contrast=darkPanelVariant(list);
    const started=performance.now();
    if(diagnostics.isEnabled()){
      diagnostics.beginOcr();
      const panelImage=frame.list.toDataURL();
      diagnostics.setCaptures({board:frame.boardUrl || board.toDataURL(),panel:panelImage,ocrPanel:panelImage,
        confirmedBoard:confirmedFrame?.board.toDataURL() || null,original:list.toDataURL(),scaled:image.toDataURL(),
        contrast:contrast?'data:image/png;base64,'+contrast.toString('base64'):null,
        metadata:{at:new Date().toISOString(),frameId:frame.id,signature:frame.signature,captureMs:frame.captureMs,quick,anchor:known,
          boardRegion:{...boardRegion,displayId:boardDisplayId},movePanel:{...moveList},
          boardPixels:board.getSize(),panelPixels:frame.list.getSize(),ocrInputPixels:list.getSize(),
          ocrCrop:ocrCrop || {x:0,y:0,...frame.list.getSize()},
          displays:screen.getAllDisplays().map(display=>({id:display.id,bounds:display.bounds,scaleFactor:display.scaleFactor}))}});
      diagnostics.record('OCR started',{frameId:frame.id,quick,anchor:known});
    }
    let result;
    try{
      result=await readMoveImage(scaled,original,known,contrast,{quick,
        onPass:diagnostics.isEnabled()?pass=>diagnostics.addOcr(pass):undefined});
      if(diagnostics.isEnabled())diagnostics.record('OCR completed',{frameId:frame.id,elapsedMs:performance.now()-started,waiting:Boolean(result.waiting),
        candidates:(result.candidates || (result.waiting?[]:[result])).map(line=>({moves:line.moves.map(move=>move.san).join(' '),
          initial:line.initial,fen:line.moves.at(-1)?.after || line.initial}))});
    }catch(error){
      diagnostics.record('OCR failed',{frameId:frame.id,elapsedMs:performance.now()-started,error:error.message},true);
      throw error;
    }
    return {board:frame.boardUrl || board.toDataURL(),signature:frame.signature,frameId:frame.id,
      ...result};
  } finally {readingList=false;}
}
ipcMain.handle('capture-move-list',captureMoveList);
function diagnosticSnapshot(){
  return {...diagnostics.snapshot(),runtime:{appVersion:app.getVersion(),platform:process.platform,arch:process.arch,
    electron:process.versions.electron,chrome:process.versions.chrome,node:process.versions.node,
    packaged:app.isPackaged,startedAt}};
}
ipcMain.handle('diagnostics-enabled',(event,value)=>{
  if(!isPanelSender(event))throw Error('Unsupported caller.');
  diagnostics.setEnabled(value);
  return diagnosticSnapshot();
});
ipcMain.handle('diagnostics-snapshot',event=>{
  if(!isPanelSender(event))throw Error('Unsupported caller.');
  return diagnosticSnapshot();
});
ipcMain.on('diagnostics-event',(event,entry)=>{
  if(!isPanelSender(event) || !diagnostics.isEnabled() || typeof entry?.stage!=='string' ||
    entry.stage.length>100 || JSON.stringify(entry.details || {}).length>64000)return;
  diagnostics.record(entry.stage,entry.details,entry.failed===true);
});
ipcMain.on('diagnostics-state',(event,state)=>{
  if(!isPanelSender(event) || !diagnostics.isEnabled())return;
  const keys=['fen','initialFen','running','uncertain','flipped','side','skill','opening','index','lineLength',
    'moveListSelected','listStable','listBaseline','listCandidate','selected','coachPending','coachMove','status','captureState'];
  const safe={};
  for(const key of keys)if(['string','number','boolean'].includes(typeof state?.[key]))safe[key]=state[key];
  diagnostics.setState(safe);
});
ipcMain.handle('diagnostics-clear',event=>{
  if(!isPanelSender(event))throw Error('Unsupported caller.');
  diagnostics.clear();return diagnosticSnapshot();
});
ipcMain.handle('diagnostics-inspect',async(event,fen)=>{
  if(!isPanelSender(event) || !diagnostics.isEnabled())throw Error('Enable Developer Mode first.');
  if(diagnostics.snapshot().state.running)throw Error('Pause tracking before taking a manual diagnostic capture.');
  let error;
  try{
    if(boardRegion && !moveList){
      const [board]=await captureRegions([{region:boardRegion,id:boardDisplayId}],true);
      diagnostics.setCaptures({board:board.toDataURL(),liveMetadata:{at:new Date().toISOString(),
        boardRegion:{...boardRegion,displayId:boardDisplayId},boardPixels:board.getSize()}});
      diagnostics.record('Manual board inspection',{movePanelSelected:false});
      error='Board captured. Select a move panel to inspect OCR.';
    }else await captureMoveList(event,fen);
  }catch(caught){error=caught.message;diagnostics.record('Manual inspection failed',{error},true);}
  return {snapshot:diagnosticSnapshot(),error};
});
ipcMain.handle('diagnostics-export',async event=>{
  if(!isPanelSender(event))throw Error('Unsupported caller.');
  const report=diagnosticSnapshot();
  const result=await dialog.showSaveDialog(panel,{title:'Export Opening Lens diagnostics',
    defaultPath:path.join(app.getPath('documents'),'Opening-Lens-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),
    filters:[{name:'Diagnostic report with capture images',extensions:['json']}]});
  if(result.canceled)return {canceled:true};
  await fs.writeFile(result.filePath,JSON.stringify(report,null,2),'utf8');
  return {path:result.filePath};
});
ipcMain.handle('move-list-signature',async event=>{
  if(!isPanelSender(event) || !moveList)throw Error('Select the move list first.');
  const [image]=await captureRegions([moveList],false);
  return createHash('sha256').update(image.toBitmap()).digest('hex');
});
ipcMain.handle('chess', (event, action, data) => {
  if (!isPanelSender(event)) throw Error('Unsupported caller.');
  if (action === 'initial') return new Chess().fen();
  if (action === 'occupied') return new Chess(data).board().flatMap(row=>row.filter(Boolean).map(piece=>piece.square));
  if (action === 'validate') return new Chess(data).fen();
  if (action === 'move') { const c = new Chess(data.fen); const m = c.move(data.move); return { fen: c.fen(), move: m }; }
  if (action === 'infer') return core.inferMove(data.fen, data.changed);
  if (action === 'board-candidates') return core.inferMove(data.fen,data.changed,true);
  if (action === 'recover') return core.recoverMoves(data.fen,data.scores);
  if (action === 'recover-candidates') return core.recoverMoves(data.fen,data.scores,true);
  if (action === 'pgn') return core.gamePositions(data);
  throw Error('Unknown action.');
});
ipcMain.handle('catalog', (event,action,data)=>{
  if(!isPanelSender(event))throw Error('Unsupported caller.');
  return askCatalog(action,data);
});
ipcMain.handle('online-masters',async(event,fen,token)=>{
  if(!isPanelSender(event) || onlineBusy)throw Error('An online lookup is already running.');
  if(Date.now()<nextOnlineRequest)throw Error('Wait one minute after the last rate limit.');
  onlineBusy=true;
  try{return await fetchMasters(fen,token);}
  catch(error){if(error.rateLimited)nextOnlineRequest=Date.now()+60_000;throw error;}
  finally{onlineBusy=false;}
});
ipcMain.handle('online-token-page',event=>{
  if(isPanelSender(event))return shell.openExternal('https://lichess.org/account/oauth/token/create');
});
ipcMain.handle('coach-position',async(event,fen,hints,online,onlyOnline,usual)=>{
  if(!isPanelSender(event) || typeof fen!=='string' || fen.length>120 || !Array.isArray(hints) || hints.length>16)throw Error('Invalid coaching request.');
  coachingTask?.abort();
  const task=new AbortController();
  coachingTask=task;
  const started=performance.now();
  diagnostics.record('Coach analysis started',{fen,hints:hints.length,onlyOnline:onlyOnline===true});
  try{
    const local=await askCatalog('at',fen).catch(()=>({next:[]}));
    const popularity=Array.isArray(online)?online.slice(0,8)
      .filter(row=>row && typeof row.uci==='string' && Number.isSafeInteger(row.total) && row.total>0)
      .map(row=>({uci:row.uci,count:row.total})).sort((a,b)=>b.count-a.count):[];
    const result=await coachPosition(fen,hints,{signal:task.signal,online:popularity,catalog:local.next,onlyOnline:onlyOnline===true,usual,
      fallback:!local.next?.length && !popularity.length});
    diagnostics.record('Coach analysis completed',{fen,elapsedMs:performance.now()-started,move:result?.move?.san,
      depth:result?.depth,basis:result?.basis,alternatives:result?.alternatives?.map(plan=>plan.move.san)});
    return result;
  }
  catch(error){
    diagnostics.record(task.signal.aborted?'Coach analysis superseded':'Coach analysis failed',
      {fen,elapsedMs:performance.now()-started,error:error.message},!task.signal.aborted);
    if(task.signal.aborted)return null;throw error;
  }
  finally{if(coachingTask===task)coachingTask=null;}
});
ipcMain.handle('import-pgn', async event => {
  if (!isPanelSender(event)) return;
  const result = await dialog.showOpenDialog(panel, { properties: ['openFile'], filters: [{ name: 'Chess game', extensions: ['pgn'] }] });
  if (result.canceled) return null;
  const file = result.filePaths[0];
  if ((await fs.stat(file)).size > 2_000_000) throw Error('Choose a PGN smaller than 2 MB.');
  return core.gamePositions(await fs.readFile(file, 'utf8'));
});
