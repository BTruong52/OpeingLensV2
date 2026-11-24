const {nativeImage}=require('electron');
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
function withoutMoveTimes(png,words){
  if(words.filter(w=>/^\d+(?:[.,]\d+)?s/i.test(w.text)).length<4)return null;
  const image=nativeImage.createFromBuffer(png),{width,height}=image.getSize();
  const moves=words.filter(w=>/^(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8sS][+#]?$|^[O0]-[O0]/.test(w.text));
  const white=moves.filter(w=>w.bbox.x0>width*.1 && w.bbox.x0<width*.4);
  const black=moves.filter(w=>w.bbox.x0>width*.45 && w.bbox.x0<width*.8);
  if(white.length<2 || black.length<2)return null;
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const starts=[median(white.map(w=>w.bbox.x0)),median(black.map(w=>w.bbox.x0))];
  const font=median(moves.map(w=>w.bbox.y1-w.bbox.y0));
  const span=Math.min((starts[1]-starts[0])*.45,font*5.5);
  const bytes=image.toBitmap();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(x<width*.09 || starts.some(start=>x>=start-4 && x<start+span))continue;
    const i=(y*width+x)*4;bytes[i]=bytes[i+1]=bytes[i+2]=255;bytes[i+3]=255;
  }
  return nativeImage.createFromBitmap(bytes,{width,height}).toPNG();
}
module.exports={darkPanelVariant,withoutMoveTimes};
