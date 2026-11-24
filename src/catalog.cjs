const fs=require('node:fs');
const path=require('node:path');
const { Chess }=require('chess.js');
const { positionKey }=require('./core.cjs');

function mask(fen){
  return fen.split(' ')[0].replaceAll('/','').replace(/[1-8]/g,n=>'0'.repeat(+n)).replace(/[a-z]/gi,'1');
}
function normalize(value){return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');}
function buildCatalog(directory,{useCache=true,writeCache=false}={}){
  const volumes=[...'abcde'].map(volume=>fs.readFileSync(path.join(directory,volume+'.tsv'),'utf8'));
  const hash=require('node:crypto').createHash('sha256').update('catalog-index-1\n'+volumes.join('\n')).digest('hex');
  const cachePath=path.join(directory,'index.json');
  let records=[],positions=new Map(),occupied=new Map(),cached=false;
  if(useCache)try{
    const data=JSON.parse(fs.readFileSync(cachePath,'utf8'));
    if(data.hash===hash){
      records=data.records;positions=new Map(data.positions);
      occupied=new Map(data.occupied.map(([key,entries])=>[key,new Map(entries)]));cached=true;
    }
  }catch{}
  const add=(fen,id,index,move)=>{
    const key=positionKey(fen);
    if(!positions.has(key)) {
      positions.set(key,[]);
      const squares=mask(fen);
      if(!occupied.has(squares))occupied.set(squares,new Map());
      occupied.get(squares).set(key,{fen,id,index,next:move?.san});
    } else if(!move) {
      // A named endpoint describes this exact position; a prefix can name a
      // different variation that only appears several moves later.
      const group=occupied.get(mask(fen)), previous=group.get(key);
      if(previous.next || index<previous.index)group.set(key,{fen,id,index});
    }
    positions.get(key).push({id,index,next:move?.san,uci:move && move.from+move.to+(move.promotion||'')});
  };
  if(!cached)for(const volume of volumes){
    const rows=volume.trimEnd().split(/\r?\n/).slice(1);
    for(const row of rows){
      const [eco,name,pgn]=row.split('\t');
      const c=new Chess();
      try{c.loadPgn(pgn,{strict:true});}catch(error){throw Error(`Invalid catalog line ${eco} ${name}: ${error.message}`);}
      const moves=c.history({verbose:true});
      const id=records.push({eco,name,pgn,plies:moves.length,searchKey:normalize(`${eco} ${name}`)})-1;
      moves.forEach((move,index)=>add(move.before,id,index,move));
      add(c.fen(),id,moves.length);
    }
  }
  // Generated once for a build, never written into an installed app at runtime.
  if(writeCache && !cached)fs.writeFileSync(cachePath,JSON.stringify({hash,records,positions:[...positions],
    occupied:[...occupied].map(([key,entries])=>[key,[...entries]])}));
  const describe=entry=>({...entry,...records[entry.id]});
  return {
    size:records.length, positions:positions.size,
    search:query=>records.flatMap((r,id)=>r.searchKey.includes(normalize(query))?[{id,eco:r.eco,name:r.name}]:[]).slice(0,24),
    line:id=>records[id],
    at:fen=>{
      const entries=positions.get(positionKey(fen))||[], groups=new Map();
      const named=entries.find(e=>!e.next);
      for(const entry of entries) {
        if(!entry.uci)continue;
        const group=groups.get(entry.uci)||{entry,count:0};
        group.count++;
        if(records[entry.id].plies-entry.index<records[group.entry.id].plies-group.entry.index)group.entry=entry;
        groups.set(entry.uci,group);
      }
      const next=[...groups.values()].sort((a,b)=>b.count-a.count).slice(0,12).map(({entry,count})=>({...describe(entry),count}));
      return {name:named?records[named.id].name:null,next};
    },
    detect:scores=>{
      const ranked=scores.map((value,i)=>({value,i})).sort((a,b)=>b.value-a.value);
      const bits=Array(64).fill('0'), matches=new Map();
      for(let i=0;i<63;i++){
        bits[ranked[i].i]='1';
        if(ranked[i].value<.028 || ranked[i].value-ranked[i+1].value<.018)continue;
        for(const [key,entry] of occupied.get(bits.join(''))||[])matches.set(key,entry);
      }
      return matches.size===1 ? {match:describe(matches.values().next().value)} : {ambiguous:matches.size>1};
    }
  };
}
module.exports={buildCatalog};
