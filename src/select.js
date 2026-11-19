let start;
const box = document.querySelector('#box');
const list=new URLSearchParams(location.search).get('kind')==='moves';
if(list)document.querySelector('p').textContent='Drag around the move panel and leave room for new rows. You can include the Moves heading. Exclude clocks and navigation buttons. Escape cancels.';
document.addEventListener('pointerdown', e => { start={x:e.clientX,y:e.clientY}; document.body.setPointerCapture(e.pointerId); });
function rect(e) {
  let width=Math.abs(e.clientX-start.x),height=Math.abs(e.clientY-start.y);
  if(!list)width=height=Math.min(width,height);
  return {x:e.clientX<start.x ? start.x-width:start.x,y:e.clientY<start.y ? start.y-height:start.y,width,height,size:width};
}
document.addEventListener('pointermove', e => { if(!start)return; const r=rect(e); Object.assign(box.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'}); });
document.addEventListener('pointerup', async e => { if(!start)return; const r=rect(e); start=null; if(r.width>=(list?80:160) && r.height>=(list?28:160))await window.lens.selectRegion(r); });
