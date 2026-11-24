// A hidden local video consumer. The source is the game window, before desktop
// overlays are composited. No screenshot is sent to a remote service.
const streams=new Map();
async function getVideo(id){
  if(streams.has(id))return streams.get(id);
  const pending=(async()=>{
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{mandatory:{
      chromeMediaSource:'desktop',chromeMediaSourceId:id,maxWidth:7680,maxHeight:4320,maxFrameRate:20}}});
    const video=document.createElement('video');video.muted=true;video.srcObject=stream;
    document.body.append(video);
    stream.getVideoTracks()[0].addEventListener('ended',()=>{streams.delete(id);video.remove();});
    await video.play();
    if(video.readyState<2)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('The game window did not provide a video frame.')),3000);
      video.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});
    });
    return video;
  })();
  streams.set(id,pending);
  try{return await pending;}catch(error){streams.delete(id);throw error;}
}
window.captureCleanRegions=async requests=>{
  const wanted=new Set(requests.map(request=>request.id));
  for(const [id,pending] of streams)if(!wanted.has(id)){
    streams.delete(id);pending.then(video=>{video.srcObject.getTracks().forEach(track=>track.stop());video.remove();}).catch(()=>{});
  }
  const videos=await Promise.all(requests.map(request=>getVideo(request.id)));
  const metadata=[];
  const images=requests.map((request,index)=>{
    const video=videos[index],region=request.region;
    // Borderless windows can report a DWM frame a pixel or two larger than
    // their actual capture surface; framed windows usually exclude resize
    // shadows. Match the capture's aspect rather than assuming either one.
    const bounds=[request.bounds,request.outerBounds,request.clientBounds].filter(b=>b?.width>0 && b?.height>0).sort((a,b)=>
      Math.abs(a.width/a.height-video.videoWidth/video.videoHeight)-Math.abs(b.width/b.height-video.videoWidth/video.videoHeight))[0];
    const sx=video.videoWidth/bounds.width,sy=video.videoHeight/bounds.height;
    const x=Math.round((region.x-bounds.x)*sx),y=Math.round((region.y-bounds.y)*sy);
    const width=Math.round((region.x+region.width-bounds.x)*sx)-x,height=Math.round((region.y+region.height-bounds.y)*sy)-y;
    metadata.push({id:request.id,video:{width:video.videoWidth,height:video.videoHeight},bounds,region,crop:{x,y,width,height},outerBounds:request.outerBounds,frameBounds:request.bounds});
    if(width<1 || height<1 || x<0 || y<0 || x+width>video.videoWidth || y+height>video.videoHeight)throw Error('The game window moved. Select its capture area again.');
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').drawImage(video,x,y,width,height,0,0,width,height);
    return canvas.toDataURL('image/png');
  });
  return {images,metadata};
};
