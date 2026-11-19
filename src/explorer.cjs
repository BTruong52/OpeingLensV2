const {Chess}=require('chess.js');
function explorerMoves(fen,payload){
  if(!Array.isArray(payload?.moves))throw Error('Lichess returned an unexpected response.');
  const results=[];
  for(const row of payload.moves.slice(0,12)){
    if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(row.uci))continue;
    const counts=[row.white,row.draws,row.black];
    if(!counts.every(n=>Number.isSafeInteger(n)&&n>=0))continue;
    try {
      const move=new Chess(fen).move(row.uci);
      results.push({san:move.san,uci:row.uci,counts,total:counts.reduce((a,b)=>a+b,0)});
    } catch {}
  }
  return results.sort((a,b)=>b.total-a.total).slice(0,8);
}
async function fetchMasters(fen,token){
  if(typeof token!=='string' || !/^[A-Za-z0-9_-]{10,300}$/.test(token))throw Error('Enter a Lichess access token to use online lookup.');
  const position=new Chess(fen).fen();
  const url=new URL('https://explorer.lichess.org/masters');
  url.search=new URLSearchParams({fen:position,moves:'12',topGames:'0'});
  const response=await fetch(url,{signal:AbortSignal.timeout(9000),redirect:'error',headers:{Accept:'application/json',Authorization:`Bearer ${token}`,'User-Agent':'OpeningLens/0.1 (opening study tool)'}});
  if(response.status===401 || response.status===403)throw Error('Lichess did not accept this access token. Check it or create a new token.');
  if(response.status===429)throw Object.assign(Error('Lichess is limiting requests. Try again in one minute.'),{rateLimited:true});
  if(!response.ok)throw Error(`Lichess Explorer returned HTTP ${response.status}.`);
  return explorerMoves(position,await response.json());
}
module.exports={explorerMoves,fetchMasters};
