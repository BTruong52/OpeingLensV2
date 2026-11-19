// Small normalized square fingerprints. No captured image leaves this process.
async function fingerprints(dataUrl) {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const canvas = document.createElement('canvas'); canvas.width=160; canvas.height=160;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0,160,160);
  const pixels=ctx.getImageData(0,0,160,160).data;
  const squares=[];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++) {
    const values=[];
    // Ignore coordinates, borders and the outer two pixels of each cell.
    for(let dy=3;dy<17;dy++)for(let dx=3;dx<17;dx++) {
      const i=((y*20+dy)*160+x*20+dx)*4;
      values.push(pixels[i]/255,pixels[i+1]/255,pixels[i+2]/255);
    }
    // Center each channel so a flat last-move tint has less influence than a piece.
    const mean=[0,0,0];
    for(let i=0;i<values.length;i++)mean[i%3]+=values[i];
    squares.push(values.map((value,i)=>value-mean[i%3]/(values.length/3)));
  }
  return squares;
}
function energy(values) { return Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length); }
async function bottomPieceColor(dataUrl) {
  const img=new Image();img.src=dataUrl;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,160,160);
  const pixels=ctx.getImageData(0,0,160,160).data;
  const halves=[[],[]];
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const neutral=[];
    for(let y=8;y<15;y++)for(let x=7;x<13;x++){
      const i=((row*20+y)*160+col*20+x)*4;
      const rgb=[pixels[i],pixels[i+1],pixels[i+2]];
      if(Math.max(...rgb)-Math.min(...rgb)<22)neutral.push((rgb[0]+rgb[1]+rgb[2])/765);
    }
    if(neutral.length<12)continue;
    neutral.sort((a,b)=>a-b);
    halves[row<4?0:1].push(neutral[Math.floor(neutral.length/2)]);
  }
  if(halves.some(values=>values.length<4))return null;
  const average=values=>values.reduce((a,b)=>a+b,0)/values.length;
  const difference=average(halves[1])-average(halves[0]);
  return Math.abs(difference)<.18?null:difference>0?'w':'b';
}
function plausibleBoard(image, occupied) {
  if (!occupied.length || occupied.length===64) return true;
  const emptyScores=image.flatMap((cell,i)=>occupied.includes(i)?[]:[energy(cell)]).sort((a,b)=>a-b);
  const emptyMedian=emptyScores[Math.floor(emptyScores.length/2)];
  return occupied.filter(i=>energy(image[i]) > Math.max(0.022,emptyMedian+0.011)).length >= Math.ceil(occupied.length*0.7);
}
function changedCells(before,after,threshold=0.075) {
  return before.flatMap((a,i)=>{
    const b=after[i]; let delta=0;
    for(let j=0;j<a.length;j++)delta+=(a[j]-b[j])**2;
    return Math.sqrt(delta/a.length)>threshold ? [i]:[];
  });
}
function cosineSimilarity(a,b){
  let dot=0,left=0,right=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];left+=a[i]*a[i];right+=b[i]*b[i];}
  return left && right?dot/Math.sqrt(left*right):0;
}
const pieceEdgeCache=new WeakMap();
function pieceEdges(values){
  if(pieceEdgeCache.has(values))return pieceEdgeCache.get(values);
  const size=Math.sqrt(values.length/3),edges=[];
  if(!Number.isInteger(size) || size<3)return null;
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
    let strength=0;
    for(let channel=0;channel<3;channel++){
      const dx=values[(y*size+x+1)*3+channel]-values[(y*size+x-1)*3+channel];
      const dy=values[((y+1)*size+x)*3+channel]-values[((y-1)*size+x)*3+channel];
      strength+=dx*dx+dy*dy;
    }
    edges.push(Math.sqrt(strength));
  }
  pieceEdgeCache.set(values,edges);
  return edges;
}
function pieceSimilarity(a,b){
  const left=pieceEdges(a),right=pieceEdges(b);
  const pixels=cosineSimilarity(a,b);
  return left && right?Math.max(pixels,cosineSimilarity(left,right)):pixels;
}
function changedPieceCells(before,after){
  return changedCells(before,after).filter(index=>{
    const a=before[index],b=after[index];
    // Last-move tints can change a stationary piece's pixel values.
    // Require both signed-pixel and outline agreement to ignore that change.
    return !(energy(a)>.028 && energy(b)>.028 &&
      cosineSimilarity(a,b)>.8 && pieceSimilarity(a,b)>.9);
  });
}
function verifyBoardPosition(before,after,beforeFen,afterFen,flipped=false,{textConfirmed=false,boardRecovery=false,report}={}){
  const detail=report?{beforeFen,afterFen,flipped,textConfirmed,boardRecovery,cells:[]}:null;
  const finish=(accepted,reason)=>{if(report)report({...detail,accepted,reason});return accepted;};
  if(!before || before.length!==64 || after.length!==64)return finish(false,'A complete board fingerprint is missing.');
  const cells=fen=>fen.split(' ')[0].replace(/\//g,'').replace(/[1-8]/g,n=>'.'.repeat(Number(n)));
  const old=cells(beforeFen),next=cells(afterFen);
  const at=index=>flipped?63-index:index;
  const expected=Array.from({length:64},(_,i)=>i).filter(i=>old[i]!==next[i]);
  if(!expected.length)return finish(false,'No piece changes are expected.');
  const changed=changedPieceCells(before,after).map(at);
  const square=index=>String.fromCharCode(97+index%8)+(8-Math.floor(index/8));
  if(detail){detail.expected=expected.map(square);detail.changed=changed.map(square);}
  if(!textConfirmed && !boardRecovery && changed.some(index=>!expected.includes(index)))return finish(false,'Additional squares changed outside the proposed move.');
  // Recovery still checks every extra square. A flat tint on an empty square
  // is harmless; an extra piece or a changed stationary piece must be rejected.
  const inspected=textConfirmed || boardRecovery?[...new Set([...expected,...changed])]:expected;
  for(const index of inspected){
    const observed=after[at(index)];
    if(next[index]==='.'){
      if(detail)detail.cells.push({square:square(index),expected:'empty',energy:energy(observed)});
      if(energy(observed)>(textConfirmed ? .09 : .04))return finish(false,'A square expected to be empty contains too much visual detail.');
      continue;
    }
    let matching=0,other=0,hasReference=false,otherPiece;
    if(energy(observed)<.028)return finish(false,'A square expected to contain a piece looks empty.');
    for(let source=0;source<64;source++){
      if(old[source]==='.')continue;
      const score=pieceSimilarity(before[at(source)],observed);
      if(old[source]===next[index]){matching=Math.max(matching,score);hasReference=true;}
      else if((old[source]===old[source].toUpperCase())===(next[index]===next[index].toUpperCase())){
        if(score>other){other=score;otherPiece=old[source];}
      }
    }
    if(detail)detail.cells.push({square:square(index),expected:next[index],matching,other,otherPiece,hasReference,energy:energy(observed)});
    if(textConfirmed){
      // A unique legal OCR history and occupied-square match already agree.
      // Only a clear competing piece identification should veto that evidence.
      if(hasReference && other>.96 && other>matching+.12)return finish(false,'A competing piece shape clearly matches better.');
    }else if(matching<.65 || other>matching+.06)return finish(false,'The proposed piece shape is not strong enough for board-only confirmation.');
  }
  return finish(true,'The inspected squares support the proposed position.');
}
if(typeof module!=='undefined')module.exports={changedCells,changedPieceCells,verifyBoardPosition};
