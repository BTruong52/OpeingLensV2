function bubblePosition(arrow,occupied,flipped,width,height){
  const cell=s=>{const file=s.charCodeAt(0)-97,rank=Number(s[1])-1;return flipped?[7-file,rank]:[file,7-rank];};
  const [tx,ty]=cell(arrow.to),[fx,fy]=cell(arrow.from);
  const obstacles=[...new Set([...occupied,arrow.from,arrow.to])].map(s=>{const [x,y]=cell(s);return {x:x*100+13,y:y*100+10,width:74,height:80};});
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  const options=[];
  for(let y=8;y+height<=792;y+=20)for(let x=8;x+width<=792;x+=20){
    const rect={x,y,width,height};
    if(obstacles.some(o=>overlap(rect,o)))continue;
    let crossing=0;
    for(let step=0;step<=10;step++){const px=(fx+(tx-fx)*step/10)*100+50,py=(fy+(ty-fy)*step/10)*100+50;if(px>=x && px<=x+width && py>=y && py<=y+height)crossing+=200;}
    options.push({...rect,score:Math.hypot(x+width/2-(tx*100+50),y+height/2-(ty*100+50))+crossing});
  }
  return options.sort((a,b)=>a.score-b.score)[0] || null;
}
if(typeof module!=='undefined')module.exports={bubblePosition};
