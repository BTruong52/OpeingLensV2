const path=require('node:path');
const fs=require('node:fs/promises');
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {createInterface}=require('node:readline');
let helper,ready,pending;
async function start(directory){
  const source=path.join(__dirname,'window-bounds.cs'),exe=path.join(directory,'window-bounds.exe');
  const bytes=await fs.readFile(source);
  const stamp=require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  let compiled;
  try{compiled=await fs.readFile(exe+'.sha256','utf8');}catch{}
  if(compiled!==stamp){
    await fs.mkdir(directory,{recursive:true});
    const compiler=path.join(process.env.WINDIR || 'C:\\Windows','Microsoft.NET','Framework64','v4.0.30319','csc.exe');
    await promisify(execFile)(compiler,['/nologo','/target:exe','/reference:System.Web.Extensions.dll','/out:'+exe,source],{windowsHide:true});
    await fs.writeFile(exe+'.sha256',stamp);
  }
  helper=spawn(exe,[],{windowsHide:true,stdio:['pipe','pipe','ignore']});
  const fail=error=>{pending?.reject(error);pending=null;helper=null;ready=null;};
  helper.on('error',fail);helper.on('exit',()=>fail(Error('Window capture helper stopped.')));
  helper.stdin.on('error',fail);
  createInterface({input:helper.stdout}).on('line',line=>{
    const request=pending;pending=null;
    if(!request)return;
    try{request.resolve(JSON.parse(line));}catch(error){request.reject(error);}
  });
}
async function windows(directory){
  if(!ready)ready=start(directory).catch(error=>{ready=null;throw error;});
  await ready;
  if(pending)throw Error('Window inventory is busy.');
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{helper?.kill();reject(Error('Window inventory timed out.'));},2500);
    pending={resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}};
    helper.stdin.write('capture\n');
  });
}
function close(){helper?.kill();}
const contains=(outer,inner)=>inner.x>=outer.x && inner.y>=outer.y && inner.x+inner.width<=outer.x+outer.width && inner.y+inner.height<=outer.y+outer.height;
module.exports={windows,close,contains};
