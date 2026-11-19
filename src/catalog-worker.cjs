const {parentPort,workerData}=require('node:worker_threads');
try{
  const book=require('./catalog.cjs').buildCatalog(workerData);
  const request=(action,data)=>{
    if(action==='summary')return {count:book.size,positions:book.positions};
    if(action==='search')return book.search(data);
    if(action==='line')return book.line(data);
    if(action==='at')return book.at(data);
    if(action==='detect' && Array.isArray(data) && data.length===64 && data.every(Number.isFinite))return book.detect(data);
    throw Error('Unsupported catalog lookup.');
  };
  parentPort.on('message',({id,action,data})=>{
    try {parentPort.postMessage({id,value:request(action,data)});}
    catch(error){parentPort.postMessage({id,error:error.message});}
  });
  parentPort.postMessage({ready:true});
}catch(error){parentPort.postMessage({fatal:error.message});}
