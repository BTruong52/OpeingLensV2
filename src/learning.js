// Lesson progress is independent of catalog continuation lengths and engine
// responses. Only reset/new explicit study selection starts another lesson.
class OpeningLesson {
  reset(moves=[],curated=true){
    this.endPly=Math.max(curated?8:12,Math.min(curated?16:20,moves.length));
    this.phase='opening';this.transitionPly=null;this.summary='';
  }
  update(fen){
    const ply=(Number(fen.split(' ')[5])-1)*2+(fen.split(' ')[1]==='b'?1:0);
    if(this.transitionPly!==null && ply>this.transitionPly)this.phase='complete';
    else if(this.phase!=='complete' && ply>=this.endPly)this.phase='transition';
    return this.phase;
  }
  offer(fen){if(this.phase==='transition')this.transitionPly=(Number(fen.split(' ')[5])-1)*2+(fen.split(' ')[1]==='b'?1:0);}
}
function openingGoals(fen,side,idea){
  const cells=fen.split(' ')[0].replaceAll('/','').replace(/[1-8]/g,n=>'.'.repeat(+n));
  const rank=side==='b'?0:7,own=piece=>side==='w'?piece.toUpperCase():piece;
  const undeveloped=[1,2,5,6].filter(file=>'bn'.includes(cells[rank*8+file]?.toLowerCase()) && cells[rank*8+file]===own(cells[rank*8+file])).length;
  const goals=[idea || 'Keep contesting the center while improving your pieces.'];
  if(undeveloped)goals.push('Finish developing your minor pieces before starting a large attack.');
  goals.push('Check your king’s safety and your opponent’s threats before committing to a plan.');
  return goals.join(' ');
}
function quickExplanation(move,reason,review){
  if(review && /leaves.*king in check/.test(review.reason))return `${move.san} — Answer the check first. ${review.san} would leave your king in check.`;
  let text=(reason || '').replace(/^Coach\s*[·:]\s*/,'').replace(new RegExp('^'+move.san.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+'),'');
  text=text.split(/(?<=[.!?])\s/)[0];
  if(text.length>120){const cut=text.slice(0,117).lastIndexOf(' ');text=text.slice(0,cut)+'…';}
  return `${move.san} — ${text || 'Improve your position while following the opening plan.'}`;
}
if(typeof module!=='undefined')module.exports={OpeningLesson,openingGoals,quickExplanation};
