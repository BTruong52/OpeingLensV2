const $=id=>document.getElementById(id);
const regions={board:null,moves:null};
const defaults='Drag either box to move it, or drag its bottom-right handle to resize.';
let drawing=null, gesture=null, confirming=false;
const limit=(n,min,max)=>Math.max(min,Math.min(max,n));
function paint(){
  for(const key of ['board','moves']){
    const box=$(key), r=regions[key];box.hidden=!r;
    if(r)Object.assign(box.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});
  }
  $('skip-moves').disabled=!regions.moves;
  $('confirm').disabled=!regions.board || confirming;
}
function enableDraw(key){
  drawing=key;$('stage').style.cursor='crosshair';
  $('hint').textContent=key==='board'?'Drag from one corner of the chessboard to the opposite corner.':'Drag around the numbered moves and leave space for new rows.';
}
function legal(key,rect){
  const minW=key==='board'?160:80,minH=key==='board'?160:28;
  let width=limit(Math.round(rect.width),minW,innerWidth),height=limit(Math.round(rect.height),minH,innerHeight);
  if(key==='board')width=height=Math.min(width,height);
  return {x:limit(Math.round(rect.x),0,innerWidth-width),y:limit(Math.round(rect.y),0,innerHeight-height),width,height};
}
$('stage').onpointerdown=event=>{
  if(event.button!==0)return;
  const hit=event.target.closest('.crop');
  const key=drawing || hit?.id;
  if(!key)return;
  gesture={key,mode:drawing?'draw':event.target.classList.contains('handle')?'size':'move',x:event.clientX,y:event.clientY,original:regions[key]};
  $('stage').setPointerCapture(event.pointerId);
};
$('stage').onpointermove=event=>{
  if(!gesture)return;
  const {key,mode,x,y,original}=gesture, dx=event.clientX-x,dy=event.clientY-y;
  if(mode==='move')regions[key]=legal(key,{...original,x:original.x+dx,y:original.y+dy});
  else if(mode==='size')regions[key]=legal(key,{...original,width:Math.min(innerWidth-original.x,original.width+dx),height:Math.min(innerHeight-original.y,original.height+dy)});
  else regions[key]=legal(key,{x:Math.min(x,event.clientX),y:Math.min(y,event.clientY),width:Math.abs(dx),height:Math.abs(dy)});
  paint();
};
$('stage').onpointerup=$('stage').onpointercancel=()=>{
  if(!gesture)return;
  gesture=null;drawing=null;$('stage').style.cursor='';$('hint').textContent=defaults;
};
for(const key of ['board','moves'])$(key).onkeydown=event=>{
  const offset={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(!offset || !regions[key])return;
  event.preventDefault();
  const r=regions[key], [dx,dy]=offset;
  regions[key]=legal(key,event.shiftKey?{...r,width:r.width+dx,height:r.height+dy}:{...r,x:r.x+dx,y:r.y+dy});
  paint();
};
$('draw-board').onclick=()=>enableDraw('board');
$('draw-moves').onclick=()=>enableDraw('moves');
$('skip-moves').onclick=()=>{regions.moves=null;drawing=null;paint();};
$('cancel').onclick=()=>window.lens.cancelRegions();
$('confirm').onclick=async()=>{
  confirming=true;paint();
  try {
    if(await window.lens.confirmRegions(regions))return;
    $('hint').textContent='Keep both boxes inside the preview and make sure the board and move panel do not overlap.';
  }catch{$('hint').textContent='Could not confirm the boxes. Try again.';}
  confirming=false;paint();
};
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')window.lens.cancelRegions();
  if(event.key==='Enter' && event.target.tagName!=='BUTTON' && !$('confirm').disabled)$('confirm').click();
});
(async()=>{
  const data=await window.lens.reviewRegions();
  if(!data)return;
  $('snapshot').src=data.image;
  regions.board=legal('board',data.board);
  regions.moves=data.moves?legal('moves',data.moves):null;
  if(!data.moves)$('hint').textContent='Board found. No move panel detected. Draw its box manually or continue with the board alone.';
  paint();
})();
