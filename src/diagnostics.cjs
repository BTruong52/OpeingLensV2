const MAX_EVENTS=300;
let enabled=true;
let events=[],captures={},ocr=[],state={},failure=null,failures=[],sequence=0,captureSource=null;
function record(stage,details={},failed=false){
  if(!enabled)return;
  const entry={sequence:++sequence,at:new Date().toISOString(),stage,details};
  events.push(entry);
  if(events.length>MAX_EVENTS)events.shift();
  if(failed){
    failure={at:entry.at,event:entry,captures:{...captures},ocr:[...ocr],state:{...state}};
    if(!failures.length || Date.parse(entry.at)-Date.parse(failures.at(-1).at)>1000){
      failures.push(failure);if(failures.length>3)failures.shift();
    }
  }
}
function setEnabled(value){
  enabled=value===true;
  record(enabled?'Developer Mode enabled':'Developer Mode disabled');
  return snapshot();
}
function clear(){
  events=[];captures={};ocr=[];failure=null;failures=[];
}
function setCaptures(value){
  if(enabled)captures={...captures,...value};
}
function beginOcr(){if(enabled)ocr=[];}
function addOcr(value){if(enabled)ocr.push(value);}
function setState(value){if(enabled)state=value;}
function snapshot(){
  return {schemaVersion:2,enabled,exportedAt:new Date().toISOString(),events:[...events],
    captures:{...captures},ocr:[...ocr],state:{...state},captureSource,failure,failures:[...failures]};
}
module.exports={isEnabled:()=>enabled,setEnabled,clear,record,setCaptures,beginOcr,addOcr,setState,snapshot,
  setCaptureSource:value=>{captureSource=value;}};
