// Restrict live OCR to rows whose pixels changed since the confirmed panel.
function changedMoveRows(previous,current,onCrop){
  const {width,height}=current.getSize();
  if(!previous || previous.getSize().width!==width || previous.getSize().height!==height){
    onCrop?.({x:0,y:0,width,height});return current;
  }
  const before=previous.toBitmap(),after=current.toBitmap();
  let top=height,bottom=-1;
  for(let y=0;y<height;y++){
    let changed=0;
    for(let x=0;x<width;x+=3){
      const i=(y*width+x)*4;
      if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>45)changed++;
    }
    if(changed>=Math.max(3,width*.006)){top=Math.min(top,y);bottom=y;}
  }
  if(bottom<0 || bottom-top>height*.6){
    onCrop?.({x:0,y:0,width,height});return current;
  }
  const margin=Math.max(18,Math.round(width*.04));
  top=Math.max(0,top-margin);bottom=Math.min(height,bottom+margin+1);
  const region={x:0,y:top,width,height:bottom-top};
  onCrop?.(region);
  return current.crop(region);
}
module.exports={changedMoveRows};
