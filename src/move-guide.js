function pieceAt(fen,square){
  const rank=fen.split(' ')[0].split('/')[8-Number(square[1])];
  return rank.replace(/[1-8]/g,n=>'.'.repeat(Number(n)))[square.charCodeAt(0)-97];
}
function clearDiagonal(fen,from,to){
  const dx=Math.sign(to.charCodeAt(0)-from.charCodeAt(0)),dy=Math.sign(Number(to[1])-Number(from[1]));
  let file=from.charCodeAt(0)+dx,rank=Number(from[1])+dy;
  while(file!==to.charCodeAt(0) && rank!==Number(to[1])){
    if(pieceAt(fen,String.fromCharCode(file)+rank)!=='.')return false;
    file+=dx;rank+=dy;
  }
  return true;
}
function illustratedMove(move,italian,explanation){
  const idea=(from,to)=>({from,to,idea:true});
  if(italian && move.from==='e2' && move.to==='e4'){
    const arrows=[];
    if(pieceAt(move.after,'f1')==='B' && clearDiagonal(move.after,'f1','b5'))arrows.push(idea('f1','b5'));
    if(pieceAt(move.after,'d1')==='Q' && clearDiagonal(move.after,'d1','h5'))arrows.push(idea('d1','h5'));
    return arrows;
  }
  if(italian && move.san==='Nf3' && /pressure on e5/.test(explanation))return [idea('f3','e5')];
  if(italian && move.san==='Bc4' && /target f7/.test(explanation) && clearDiagonal(move.after,'c4','f7'))return [idea('c4','f7')];
  if(move.san==='c3' && /support.*d4/i.test(explanation))return [idea('c3','d4')];
  return [];
}
if(typeof module!=='undefined')module.exports={illustratedMove};
