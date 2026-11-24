function panelNearBoard(board,headings,width,height,pixel){
  const boardHeight=board.height || board.size;
  const options=headings.filter(h=>{
    const x=(h.x0+h.x1)/2;
    return (x>board.x+board.size || x<board.x) && h.y0>=board.y-boardHeight*.25 && h.y0<=board.y+boardHeight*.58;
  });
  if(options.length!==1)return null;
  const h=options[0], x=Math.round((h.x0+h.x1)/2);
  const right=x>board.x;
  const min=right? Math.ceil(board.x+board.size):0;
  const max=right?width:Math.floor(board.x);
  if(x<min || x>=max)return null;
  const y=Math.min(height-1,Math.max(0,h.y1+7));
  const base=pixel(x,y), equal=rgb=>Math.max(...rgb.map((v,i)=>Math.abs(v-base[i])))<23;
  let start=x,end=x;
  while(start>min && equal(pixel(start-1,y)))start--;
  while(end+1<max && equal(pixel(end+1,y)))end++;
  const halfway=Math.floor((x+end)/2);
  let bottom=y;
  while(bottom+1<Math.min(height,y+Math.round(boardHeight*1.15)) && equal(pixel(halfway,bottom+1)))bottom++;
  // Navigation buttons change the background across much of the panel,
  // unlike a move or a piece icon. Keep controls outside the suggested crop.
  const bandStart=Math.floor(y+boardHeight*.32);
  for(let yy=bandStart;yy<bottom;yy++){
    let different=0;
    for(let i=1;i<=15;i++){
      const rgb=pixel(Math.round(start+(end-start)*i/16),yy);
      if(Math.max(...rgb.map((v,k)=>Math.abs(v-base[k])))>=12)different++;
    }
    if(different>=11){bottom=yy-1;break;}
  }
  if(end-start<85 || bottom-h.y0<50)return null;
  return {x:start,y:Math.max(0,h.y0-8),width:end-start+1,height:bottom-Math.max(0,h.y0-8)+1};
}
// Numbered rows are stronger evidence than a title, and work on unlabeled
// panels. Require SAN beside the number, never a player rating or clock.
function panelFromRows(board,words,width,height,pixel){
  const candidates=[];
  const san=/^(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?$|^[O0]-[O0](?:-[O0])?[+#]?$/;
  for(const word of words){
    if(!/^\d{1,3}[.)]?$/.test(word.text.trim()))continue;
    const box=word.bbox,cy=(box.y0+box.y1)/2;
    if(cy<board.y || cy>board.y+board.height*.92 || box.x0>board.x && box.x0<board.x+board.size)continue;
    const side=box.x0>=board.x+board.size?'right':'left';
    const end=side==='right'?width:board.x;
    const moves=words.filter(w=>w.bbox.x0>box.x1+5 && w.bbox.x1<end &&
      Math.abs((w.bbox.y0+w.bbox.y1)/2-cy)<Math.max(8,box.y1-box.y0) && san.test(w.text.trim()));
    if(moves.length)candidates.push({box,moves,side});
  }
  if(!candidates.length)return null;
  const groups=[];
  for(const row of candidates){
    let group=groups.find(g=>g.side===row.side && Math.abs(g.x-row.box.x0)<18);
    if(!group){group={side:row.side,x:row.box.x0,rows:[]};groups.push(group);}
    group.rows.push(row);
  }
  groups.sort((a,b)=>b.rows.length-a.rows.length);
  if(groups[1]?.rows.length===groups[0].rows.length)return null;
  const group=groups[0],first=group.rows.sort((a,b)=>a.box.y0-b.box.y0)[0];
  const left=Math.max(group.side==='right'?board.x+board.size:0,Math.floor(group.x-12));
  const limit=group.side==='right'?width:board.x;
  const y=Math.max(0,first.box.y0-12);
  // A highlighted last-move cell must not become the panel's right edge.
  // Use the longest quiet strip, including the blank space below the rows.
  let right=Math.ceil(Math.max(...group.rows.flatMap(row=>row.moves.map(w=>w.bbox.x1)))+24);
  for(const probe of [y,y+3,first.box.y1+7,Math.round(board.y+board.height*.75)]){
    if(probe>=height)continue;
    const base=pixel(Math.min(limit-1,left+20),probe);
    const equal=rgb=>Math.max(...rgb.map((v,i)=>Math.abs(v-base[i])))<24;
    let edge=left+20;
    while(edge<limit-1 && equal(pixel(edge,probe)))edge++;
    right=Math.max(right,edge);
  }
  right=Math.min(limit,right);
  const bottom=Math.min(height,board.y+board.height*.9);
  if(right-left<85 || bottom-y<30)return null;
  return {x:left,y,width:right-left,height:Math.round(bottom-y)};
}
module.exports={panelNearBoard,panelFromRows};
