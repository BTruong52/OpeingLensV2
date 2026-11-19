const MAX_EVENTS=100;
let enabled=false;
let events=[],captures={},ocr=[],state={},failure=null,sequence=0;
function record(stage,details={},failed=false){
  if(!enabled)return;
  const entry={sequence:++sequence,at:new Date().toISOString(),stage,details};
  events.push(entry);
  if(events.length>MAX_EVENTS)events.shift();
  if(failed)failure={at:entry.at,event:entry,captures:{...captures},ocr:[...ocr],state:{...state}};
}
function setEnabled(value){
  enabled=value===true;
  record(enabled?'Developer Mode enabled':'Developer Mode disabled');
  return snapshot();
}
function clear(){
  events=[];captures={};ocr=[];failure=null;
}
function setCaptures(value){
  if(enabled)captures={...captures,...value};
}
function beginOcr(){if(enabled)ocr=[];}
function addOcr(value){if(enabled)ocr.push(value);}
function setState(value){if(enabled)state=value;}
function snapshot(){
  return {schemaVersion:1,enabled,exportedAt:new Date().toISOString(),events:[...events],
    captures:{...captures},ocr:[...ocr],state:{...state},failure};
}
module.exports={isEnabled:()=>enabled,setEnabled,clear,record,setCaptures,beginOcr,addOcr,setState,snapshot};
