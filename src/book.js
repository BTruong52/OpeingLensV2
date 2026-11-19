function positionKey(fen) { return fen.split(' ').slice(0,4).join(' '); }

function lineIndexAt(line, fen) {
  const key = positionKey(fen);
  if (positionKey(line.initial) === key) return 0;
  const index = line.moves.findIndex(move => positionKey(move.after) === key);
  return index < 0 ? -1 : index+1;
}

// Keep the selected line if possible; otherwise prefer playable lines in the same opening.
function continuations(book, selected, fen) {
  return book.flatMap((opening, lesson) => opening.lines.flatMap((line, variation) => {
    const index = lineIndexAt(line,fen);
    if (index < 0 || index >= line.moves.length || (selected?.lesson === lesson && selected?.variation === variation)) return [];
    return [{lesson,variation,index,next:line.moves[index].san}];
  })).sort((a,b) => Number(b.lesson===selected?.lesson)-Number(a.lesson===selected?.lesson));
}

function rankedOptions(book, fen, level) {
  const seen=new Set();
  return continuations(book,null,fen)
    .map(option=>{
      const opening=book[option.lesson];
      const line=opening.lines[option.variation];
      const move=line.moves[option.index];
      return {...option,level:line.level ?? opening.level ?? 0,moveKey:move.from+move.to+(move.promotion||'')};
    })
    .sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level) || a.level-b.level)
    .filter(option=>{
      if(seen.has(option.moveKey))return false;
      seen.add(option.moveKey);
      return true;
    }).slice(0,3);
}

function findVisiblePosition(scores, lines, preferred,accept) {
  const matches = new Map();
  for (const line of lines) {
    for (const [index,fen] of [line.initial,...line.moves.map(move=>move.after)].entries()) {
      let cell=0, weakestPiece=Infinity, strongestEmpty=0;
      for (const char of fen.split(' ')[0]) {
        if (char === '/') continue;
        if (/^[1-8]$/.test(char)) {
          for(let i=0;i<Number(char);i++) strongestEmpty=Math.max(strongestEmpty,scores[cell++]);
        } else weakestPiece=Math.min(weakestPiece,scores[cell++]);
      }
      if (weakestPiece < 0.028 || weakestPiece-strongestEmpty < 0.018) continue;
      const key=positionKey(fen);
      const candidate={line,index,fen};
      if(accept && !accept(candidate))continue;
      const previous=matches.get(key);
      if (!previous || (line.id===preferred && previous.line.id!==preferred)
          || (previous.line.id!==preferred && index<line.moves.length && previous.index===previous.line.moves.length)) {
        matches.set(key,candidate);
      }
    }
  }
  return matches.size===1 ? {match:matches.values().next().value} : {ambiguous:matches.size>1};
}

if (typeof module !== 'undefined') module.exports = {lineIndexAt,continuations,findVisiblePosition,rankedOptions};
