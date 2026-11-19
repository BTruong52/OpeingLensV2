const { Chess } = require('chess.js');

function squareToCell(square, flipped = false) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return flipped ? { x: 7 - file, y: rank } : { x: file, y: 7 - rank };
}
function cellToSquare(x, y, flipped = false) {
  return String.fromCharCode(97 + (flipped ? 7 - x : x)) + (flipped ? y + 1 : 8 - y);
}
function changedSquares(before, after) {
  const a = new Chess(before), b = new Chess(after), changed = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const sq = cellToSquare(x, y);
    if (JSON.stringify(a.get(sq)) !== JSON.stringify(b.get(sq))) changed.push(sq);
  }
  return changed.sort();
}
// Changed squares alone cannot distinguish promotions, so ambiguous matches are rejected.
function inferMove(fen, changed, candidatesOnly=false) {
  const game = new Chess(fen), wanted = [...changed].sort().join(',');
  const candidates = game.moves({ verbose: true }).filter(move => {
    const squares=[move.from,move.to];
    if(move.flags.includes('e'))squares.push(move.to[0]+move.from[1]);
    if(move.flags.includes('k') || move.flags.includes('q')){
      const kingSide=move.flags.includes('k'),rank=move.from[1];
      squares.push((kingSide?'h':'a')+rank,(kingSide?'f':'d')+rank);
    }
    return candidatesOnly ? squares.every(square=>changed.includes(square)) && changed.length-squares.length<=3 : squares.sort().join(',')===wanted;
  });
  return candidatesOnly ? candidates : candidates.length === 1 ? candidates[0] : null;
}
function positionKey(fen) { return fen.split(' ').slice(0, 4).join(' '); }
// Recover only a unique position reachable in at most two legal half-moves.
// Separate textured piece squares from the background before checking paths.
function recoverMoves(fen,scores) {
  if(!Array.isArray(scores) || scores.length!==64 || !scores.every(Number.isFinite))return null;
  const ranked=scores.map((score,i)=>({score,i})).sort((a,b)=>b.score-a.score);
  const masks=new Set(), bits=Array(64).fill('0');
  for(let i=0;i<63;i++){
    bits[ranked[i].i]='1';
    if(ranked[i].score>=.028 && ranked[i].score-ranked[i+1].score>=.018)masks.add(bits.join(''));
  }
  const occupied=position=>position.split(' ')[0].replaceAll('/','').replace(/[1-8]/g,n=>'0'.repeat(+n)).replace(/[a-z]/gi,'1');
  // A picture consistent with the position we already know is not evidence of a move.
  if(!masks.size || masks.has(occupied(fen)))return null;
  const paths=new Map();
  function consider(path){
    const after=path.at(-1).after;
    if(masks.has(occupied(after)))paths.set(positionKey(after),path);
  }
  for(const first of new Chess(fen).moves({verbose:true})){
    consider([first]);
    for(const second of new Chess(first.after).moves({verbose:true}))consider([first,second]);
  }
  return paths.size===1 ? paths.values().next().value : null;
}
function gamePositions(pgn) {
  const game = new Chess();
  game.loadPgn(pgn);
  const moves = game.history({ verbose: true });
  return { headers: game.getHeaders(), moves, initial: moves[0]?.before || game.fen() };
}
module.exports = { squareToCell, cellToSquare, changedSquares, inferMove, recoverMoves, positionKey, gamePositions };
