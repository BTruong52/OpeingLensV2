const {spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const path=require('node:path');
const {Chess}=require('chess.js');
const engine=path.join(__dirname,'..','engine','stockfish-19-lite-single.js');
const uci=move=>move.from+move.to+(move.promotion||'');

function principle(move){
  const file=move.to[0], rank=move.to[1], home=move.color==='w'?'1':'8';
  if(move.san==='O-O' || move.san==='O-O-O')return 'king safety';
  if(move.piece==='p' && !move.captured && 'cdef'.includes(file) && '3456'.includes(rank))return 'central pawn play';
  if(move.piece==='p' && !move.captured && ['b2b3','g2g3','b7b6','g7g6'].includes(uci(move)))return 'fianchetto';
  if(move.piece==='b' && ['b2','g2','b7','g7'].includes(move.to) && move.from[1]===home)return 'fianchetto';
  if('nb'.includes(move.piece) && move.from[1]===home && move.to[1]!==home)return 'piece development';
  return null;
}
function explain(move,theme){
  const {to,from}=move;
  const capture=move.captured?' It also captures on '+to+'.':'';
  if(theme==='king safety')return 'Castling puts your king behind its own pawns when they are still in place and brings a rook closer to the center.';
  if(theme==='central pawn play'){
    const rank=Number(to[1])+(move.color==='w'?1:-1);
    const files=[String.fromCharCode(to.charCodeAt(0)-1),String.fromCharCode(to.charCodeAt(0)+1)];
    return `The pawn on ${to} controls ${files[0]}${rank} and ${files[1]}${rank}, so it can challenge the center even with a different move order.`;
  }
  if(theme==='fianchetto')return move.piece==='p'?`Moving the pawn to ${to} opens ${from} for your bishop to develop on the long diagonal.`:`The bishop develops to ${to} and can exert pressure along the long diagonal.`+capture;
  return `The ${move.piece==='n'?'knight':'bishop'} leaves its starting rank and becomes active on ${to}.`+capture;
}
function thematicCandidates(board,hints){
  const themes=new Set(hints.filter(m=>m.color===board.turn()).map(principle).filter(Boolean));
  return board.moves({verbose:true}).filter(m=>themes.has(principle(m)));
}
function compare(best,candidate){
  if(!best || !candidate || candidate.kind==='mate' && candidate.value<=0)return false;
  if(best.kind==='mate')return best.value>0 && candidate.kind==='mate' && candidate.value>0;
  if(candidate.kind==='mate')return candidate.value>0;
  return candidate.value>=-150 && best.value-candidate.value<=75;
}
function explainIdea(board,move){
  const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
  if(board.isCheck())return `${move.san} answers the check. `+
    (move.captured?`Capture the ${names[move.captured]} on ${move.to}.`:`Move the ${names[move.piece]} to ${move.to} to protect your king.`);
  if(move.captured)return `Capture the ${names[move.captured]} on ${move.to} with your ${names[move.piece]}.`;
  if(move.san.startsWith('O-O'))return explain(move,'king safety');
  const after=new Chess(move.after);
  const targets=after.board().flat().filter(piece=>piece && piece.color!==move.color && piece.type!=='p' &&
    after.attackers(piece.square,move.color).includes(move.to));
  const developing=principle(move)==='piece development';
  let reason=`${developing?'Develop':'Move'} the ${names[move.piece]} to ${move.to}`;
  if(targets.length){
    const target=targets.find(piece=>piece.type==='q') || targets[0];
    return reason+` and ${target.type==='k'?'give check':'put pressure on the '+names[target.type]+' on '+target.square}.`;
  }
  if(principle(move))return explain(move,principle(move));
  return reason+'. Check the opponent’s reply before continuing your plan.';
}
function comparePlan(best,candidate){
  if(!best || !candidate)return false;
  if(best.kind==='cp' && candidate.kind==='cp')return best.value-candidate.value<=75;
  if(best.kind==='mate' && best.value<0)return candidate.kind==='mate' && candidate.value<=best.value;
  return compare(best,candidate);
}
async function coachPosition(fen,hints,{signal,online=[],catalog=[],onlyOnline=false,usual,fallback=false}={}){
  const board=new Chess(fen);
  fallback=fallback && !onlyOnline && !online.length && !catalog.length;
  if(board.isGameOver() || (!fallback && board.moveNumber()>15))return null;
  const inCheck=board.isCheck();
  const enemyKing=board.board().flat().find(piece=>piece?.type==='k' && piece.color!==board.turn());
  if(!enemyKing || board.isAttacked(enemyKing.square,board.turn()))return null;
  const thematic=thematicCandidates(board,hints);
  const legal=board.moves({verbose:true});
  const candidates=fallback?legal:inCheck ? [...thematic,...legal.filter(m=>!thematic.some(t=>uci(t)===uci(m)))] : thematic;
  if(!candidates.length)return null;
  signal?.throwIfAborted();
  const child=spawn(process.execPath,[engine],{windowsHide:true,stdio:['pipe','pipe','ignore'],
    env:{...process.env,...(process.versions.electron ? {ELECTRON_RUN_AS_NODE:'1'} : {})}});
  const lines=createInterface({input:child.stdout});
  let waiting, failure;
  const fail=error=>{failure=error;waiting?.reject(error);waiting=null;};
  const abort=()=>{fail(Error('Position changed.'));child.kill();};
  signal?.addEventListener('abort',abort,{once:true});
  child.on('error',fail);
  child.stdin.on('error',fail);
  child.on('exit',()=>fail(Error('The chess engine stopped before finishing.')));
  lines.on('line',line=>{
    if(!waiting)return;
    const value=waiting.read(line);
    if(value!==undefined){const done=waiting;waiting=null;done.resolve(value);}
  });
  const timer=setTimeout(()=>{fail(Error('Stockfish analysis timed out.'));child.kill();},9000);
  function command(text,read){
    if(failure)return Promise.reject(failure);
    return new Promise((resolve,reject)=>{waiting={read,resolve,reject};child.stdin.write(text+'\n');});
  }
  function search(restrictions=[]){
    let score=null,pv=[],depth=0;
    return command(`position fen ${board.fen()}\ngo depth 13 nodes 24000${restrictions.length?' searchmoves '+restrictions.join(' '):''}`,line=>{
      const value=line.match(/\bscore (cp|mate) (-?\d+)\b/);
      const ply=Number(line.match(/\bdepth (\d+)/)?.[1]||0);
      if(value && ply>=7 && !/\b(?:lowerbound|upperbound)\b/.test(line)){
        score={kind:value[1],value:Number(value[2])};
        pv=(line.split(' pv ')[1]||'').trim().split(/\s+/).slice(0,3);
        depth=ply;
      }
      if(line.startsWith('bestmove '))return {move:line.split(' ')[1],score,pv,depth};
    });
  }
  try{
    await command('uci',line=>line==='uciok'?true:undefined);
    await command('isready',line=>line==='readyok'?true:undefined);
    const best=await search();
    let checked,move,basis,frequency;
    const available=new Map(candidates.map(m=>[uci(m),m]));
    const tested=new Set();
    const rankedOnline=online.map(row=>({...row,basis:'master games'}));
    const ordered=onlyOnline ? rankedOnline : [...rankedOnline,...catalog.map(row=>({...row,basis:'named lines'})),
      ...candidates.slice().sort((a,b)=>{
        const rank={'king safety':0,'central pawn play':1,'piece development':2,fianchetto:3};
        const center=m=>'de'.includes(m.to[0]) ? ('45'.includes(m.to[1])?0:1):2;
        return (rank[principle(a)]??4)-(rank[principle(b)]??4) || center(a)-center(b);
      }).map(m=>({uci:uci(m),basis:'opening fundamentals'}))];
    const checks=new Map([[best.move,best]]);
    async function evaluate(move){if(!checks.has(move))checks.set(move,await search([move]));return checks.get(move);}
    // First try moves from the opening that also respond to the check.
    if(inCheck)ordered.unshift(...hints.filter(h=>h.color===board.turn() && thematic.some(m=>uci(m)===uci(h))).map(m=>({uci:uci(m),basis:'opening fundamentals'})));
    const accepted=[];
    for(const option of ordered){
      if(!available.has(option.uci) || tested.has(option.uci))continue;
      if(tested.size>=6)break;
      tested.add(option.uci);
      const evaluated=await evaluate(option.uci);
      if(evaluated.move!==option.uci || !(fallback?comparePlan:compare)(best.score,evaluated.score))continue;
      accepted.push({checked:evaluated,move:available.get(option.uci),basis:option.basis,frequency:option.count});
      if(!fallback || accepted.length===3)break;
    }
    if(fallback && accepted.length<3 && best.score && available.has(best.move) &&
      !accepted.some(option=>uci(option.move)===best.move)){
      accepted.push({move:available.get(best.move),checked:best,basis:'position plan'});
    }
    if(accepted.length)({checked,move,basis,frequency}=accepted[0]);
    if(!move && inCheck && !onlyOnline){move=available.get(best.move);checked=best;basis='legal defense';}
    if(!move)return null;
    const theme=principle(move) || (inCheck?'king safety':'opening fundamentals');
    const king=board.board().flat().find(p=>p?.type==='k' && p.color===board.turn());
    const attacker=inCheck && board.attackers(king.square,enemyKing.color)[0];
    const pieceNames={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
    const threat=attacker ? `the ${pieceNames[board.get(attacker)?.type] || 'piece'} on ${attacker}` : 'the attacking piece';
    let review=null;
    if(usual && usual.color===board.turn() && /^[a-h][1-8]$/.test(usual.from) && /^[a-h][1-8]$/.test(usual.to) && uci(usual)!==uci(move)){
      const normal=legal.find(m=>uci(m)===uci(usual)), piece=board.get(usual.from);
      if(piece?.color===board.turn() && piece.type===usual.piece){
        if(!normal && inCheck)review={...usual,reason:`${usual.san} is illegal here: it leaves your king in check from ${threat}.`};
        else if(normal){
          const evaluated=await evaluate(uci(normal));
          if(evaluated.score && !compare(best.score,evaluated.score)){
            let reply='';
            try{if(evaluated.pv[1])reply=new Chess(normal.after).move(evaluated.pv[1]).san;}catch{}
            review={...usual,reason:`${usual.san} is legal, but the tactical check rates it poorly here.${reply?' One reply to watch for is '+reply+'.':''}`};
          }
        }
      }
    }
    const replay=new Chess(fen), line=[];
    for(const step of checked.pv[0]===checked.move ? checked.pv : [checked.move]){
      try {line.push(replay.move(step));} catch {break;}
    }
    const reason=inCheck ? (move.piece==='k'?`${move.san} moves the king out of check.`:move.to===attacker?`${move.san} captures ${threat} and ends the check.`:`${move.san} blocks the check from ${threat}.`)+
      (move.san==='c3'?' The pawn also supports d4, a useful Italian-style central setup.':'') : fallback?explainIdea(board,move):explain(move,theme);
    const alternatives=fallback?accepted.map(option=>({
      move:option.move,reason:explainIdea(board,option.move),theme:principle(option.move) || 'position plan',
      depth:option.checked.depth,line:[option.move],basis:'position plan'
    })):[];
    return {move,theme,reason,depth:checked.depth,line,basis:fallback?'position plan':basis,frequency,review,inCheck,fallback,alternatives};
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort',abort);
    lines.close();
    child.kill();
  }
}
module.exports={coachPosition,principle,compare};
