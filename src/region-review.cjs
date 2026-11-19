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
module.exports={panelNearBoard};
