// Find alternating runs of equal-width squares, then verify the full 8×8 grid.
// get(x,y) returns an RGB triplet from a downscaled monitor image.
function detectBoards(width,height,get,verticalPitchRatio=1) {
  const distance=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]));
  function runs(length,pixel) {
    const list=[];
    for(let i=0;i<length;i++){
      const rgb=pixel(i), last=list.at(-1);
      if(last && distance(last.rgb,rgb)<=13) last.end=i+1;
      else list.push({start:i,end:i+1,rgb});
    }
    return list;
  }
  function grids(list) {
    const found=[];
    for(let i=0;i+7<list.length;i++){
      const cells=list.slice(i,i+8);
      // Internal grid lines are more reliable than rounded corners or labels
      // along the outside edge.
      const groups=[0,1].map(parity=>cells.filter((_,k)=>k%2===parity).map(r=>r.rgb));
      const modes=groups.map(group=>group.map(rgb=>({rgb,count:group.filter(color=>distance(rgb,color)<=17).length})).sort((a,b)=>b.count-a.count)[0]);
      if(!modes.every(mode=>mode.count>=3) || distance(modes[0].rgb,modes[1].rgb)<23)continue;
      const refined=(cells[7].start-cells[1].start)/6;
      const edges=(cells[7].end-cells[0].start)/8;
      for(const [start,pitch] of [[Math.max(0,cells[1].start-refined),refined],[cells[0].start,edges]]){
        if(pitch<13 || !cells.every((r,k)=>Math.abs(r.start-(start+k*pitch))<=Math.max(2,pitch*.09)))continue;
        if(!found.some(previous=>Math.abs(previous.start-start)<.05 && Math.abs(previous.pitch-pitch)<.05))found.push({start,pitch,colors:modes.map(mode=>mode.rgb)});
      }
    }
    return found;
  }
  const byColumn=new Map(), found=[];
  for(let y=0;y<height;y+=3) for(const row of grids(runs(width,x=>get(x,y)))) {
    const x=row.start;
    for(const probe of [.14,2.14,4.14,6.14]){
    const sampleX=x+Math.round(row.pitch*probe);
    if(!byColumn.has(sampleX)) byColumn.set(sampleX,grids(runs(height,yy=>get(sampleX,yy))));
    for(const col of byColumn.get(sampleX)){
      const expectedVertical=row.pitch*verticalPitchRatio;
      if(y<col.start || y>=col.start+col.pitch*8 || Math.abs(expectedVertical-col.pitch)>Math.max(.7,expectedVertical*.035)) continue;
      const phase=Math.floor((y-col.start)/col.pitch)%2;
      const colors=phase ? row.colors.slice().reverse() : row.colors;
      if(distance(colors[0],col.colors[0])>20 || distance(colors[1],col.colors[1])>20)continue;
      if(found.some(r=>Math.abs(r.x-x)<row.pitch*.4 && Math.abs(r.y-col.start)<row.pitch*.4 && Math.abs(r.size-8*row.pitch)<row.pitch*.5))continue;
      let good=0;
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        let votes=0;
        for(const dy of [.14,.86])for(const dx of [.14,.86]) {
          if(distance(get(Math.floor(x+(c+dx)*row.pitch),Math.floor(col.start+(r+dy)*col.pitch)),colors[(r+c)%2])<=24)votes++;
        }
        if(votes>=2)good++;
      }
      if(good>=60)found.push({x,y:col.start,size:8*row.pitch,height:8*col.pitch});
    }
    if(found.some(r=>r.x===x && y>=r.y && y<r.y+r.height))break;
    }
  }
  return found;
}
module.exports={detectBoards};
