const $ = id => document.getElementById(id);
const adminMode=window.lens.adminMode;
const learning=new OpeningLesson();
const lessonSide=()=>mode()==='both'?(flipped?'b':'w'):mode();
document.title=adminMode?'Opening Lens (Admin)':'Opening Lens';
document.querySelector('header .eyebrow').textContent=adminMode?'OPENING LENS (ADMIN) · CONTINUOUS COACH':'OPENING LESSON · LEARN THEN PLAY';
$('show-bubbles').checked=localStorage.getItem('lens-bubbles')!=='off';
$('show-bubbles').onchange=()=>{localStorage.setItem('lens-bubbles',$('show-bubbles').checked?'on':'off');render();};
const levels=['Beginner','Intermediate','Hard','Expert'];
const lessons = [
  { name:'Italian Game', intro:'Develop naturally, contest the center, and aim your bishop at f7.', lines:[
    { name:'Classical development', defense:{name:'Open Game',level:0,why:'Match White’s central pawn and develop naturally. It becomes the Italian only if White later plays Bc4.'}, pgn:'1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3', idea:'Build a strong center while bringing your pieces into the game.' },
    { name:'Two Knights Defense', pgn:'1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3', idea:'Black develops with pressure on e4. Support the center before attacking.' }
  ]},
  { name:'Sicilian Defense', intro:'An asymmetric fight: Black challenges d4 with the c-pawn.', lines:[
    { name:'Open Sicilian · Najdorf setup', level:3, defense:{name:'Sicilian Defense',level:3,why:'Challenge White’s center from the flank. The uneven pawn structure creates chances for both sides.'}, pgn:'1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6', idea:'White gains active pieces; Black prepares counterplay on the queenside.' },
    { name:'Alapin variation', level:1, pgn:'1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4', idea:'White prepares d4 with a pawn, aiming for a broad center.' }
  ]},
  { name:'Queen’s Gambit', intro:'Offer a flank pawn to challenge Black’s central foothold.', lines:[
    { name:'Declined', defense:{name:'Queen’s Pawn Game',level:0,why:'Contest d4 immediately. If White plays c4, you can defend your center with e6.'}, pgn:'1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3', idea:'Black reinforces d5. White develops and increases pressure on the center.' },
    { name:'Accepted', pgn:'1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4', idea:'White develops quickly and recovers the pawn with the bishop.' }
  ]},
  {name:'Caro–Kann Defense',level:0,intro:'Black prepares to contest the center with a supported d-pawn.',lines:[
    {name:'Classical variation',defense:{name:'Caro–Kann Defense',level:0,why:'Prepare d5 with pawn support and leave your light-square bishop room to develop.'},pgn:'1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5',idea:'Develop the light-square bishop before closing the pawn chain.'}
  ]},
  {name:'French Defense',level:2,intro:'Black challenges e4 and often plays against a closed center.',lines:[
    {name:'Advance variation',defense:{name:'French Defense',level:2,why:'Support d5. If White advances e5, attack the base of the pawn chain with c5.'},pgn:'1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6',idea:'Black attacks the base of White’s pawn chain on d4.'}
  ]},
  {name:'English Opening',level:2,intro:'White controls d5 from the flank with the c-pawn.',lines:[
    {name:'Symmetrical variation',defense:{name:'Symmetrical English',level:0,why:'Match the flank pawn and contest d4 without committing your central pawns.'},pgn:'1. c4 c5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7',idea:'Develop the bishop on the long diagonal while keeping the central pawns flexible.'}
  ]},
  {name:'Réti Opening',level:3,intro:'White develops the king’s knight and keeps several pawn structures available.',lines:[
    {name:'Réti Gambit',defense:{name:'Réti · occupy the center',level:0,why:'Take the center with d5 while White develops a knight.'},pgn:'1. Nf3 d5 2. c4 dxc4 3. e3 Nf6 4. Bxc4',idea:'Challenge d5 from the flank, then recover the pawn through development.'}
  ]},
  {name:'Bird’s Opening',level:2,intro:'White claims e5 early at the cost of a more exposed kingside.',lines:[
    {name:'Classical setup',pgn:'1. f4 d5 2. Nf3 Nf6 3. e3 g6 4. Be2 Bg7',idea:'Develop quickly to support the f-pawn and prepare to castle.'}
  ]},
  {name:'Nimzo–Larsen Attack',level:1,intro:'White develops the bishop to b2 to pressure the long diagonal.',lines:[
    {name:'Modern variation',pgn:'1. b3 e5 2. Bb2 Nc6 3. e3 d5 4. Bb5',idea:'Pressure e5 and pin the knight so Black has to defend the center.'}
  ]},
  {name:'Flexible Black setups',intro:'Develop and contest the center in response to White.',lines:[
    {name:'Indian Defense setup',defense:{name:'Indian Defense setup',level:1,why:'Develop the knight and control e4 before committing your central pawns.'},pgn:'1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',idea:'Use your pieces to pressure the center.'},
    {name:'Dutch Defense',defense:{name:'Dutch Defense',level:3,why:'Claim e4 with the f-pawn. The active kingside plan comes with more king-safety decisions.'},pgn:'1. d4 f5 2. g3 Nf6 3. Bg2 g6',idea:'Control e4 and develop the bishop on the long diagonal.'},
    {name:'Reversed Sicilian',defense:{name:'Reversed Sicilian setup',level:2,why:'Occupy the center with e5 and prepare a flexible setup against White’s flank pawn.'},pgn:'1. c4 e5 2. Nc3 Nf6 3. g3 d5',idea:'Build an active center against the English flank pawn.'},
    {name:'Flexible English defense',defense:{name:'English · flexible knight setup',level:1,why:'Develop and keep your options open; the knight controls d5 and e4.'},pgn:'1. c4 Nf6 2. Nc3 e6 3. Nf3 d5',idea:'Develop first, then contest the center with d5.'},
    {name:'Réti · flexible defense',defense:{name:'Réti · flexible knight setup',level:1,why:'Match White’s development and wait to see which center White chooses.'},pgn:'1. Nf3 Nf6 2. c4 e6 3. Nc3 d5',idea:'Build a supported center with e6 and d5.'},
    {name:'Réti · flank counterplay',defense:{name:'Réti · flank counterplay',level:2,why:'Use c5 to control d4 and leave room to respond to either e4 or c4.'},pgn:'1. Nf3 c5 2. c4 Nc6 3. Nc3 Nf6',idea:'Contest the center from the flank.'}
  ]}
];
let blackDefenseChosen=false;
let blackDefenseName='';
const mode=()=>$('playing-side').value;
const turnToCoach=()=>adminMode?(mode()==='both' || mode()===fen?.split(' ')[1]):lessonSide()===fen?.split(' ')[1];
const pickingBlackDefense=()=>mode()==='b' && fen?.split(' ')[1]==='b' && !blackDefenseChosen && hasBookChoices();
let fen, initialFen, selected=false, flipped=false, moves=[], index=0, study, lineIndex=0, running=false, baseline, timer, busy=false, pending='', stable=0, epoch=0;
let departure=null, coachingStopped=false, uncertain=false, missedFrames=0;
let external=null, catalogKey, catalogData, extending, searchVersion=0;
let coached;
let preferredOpening;
let moveListSelected=false;
let listBaseline='',listCandidate='',listStable=0;
let listBoard=null;
let onlineResult=null, onlineRequest=null, onlineVersion=0;
const requestMasters=(position,token)=>window.lens.onlineMasters(position,token);
window.lensDebug.stateProvider=()=>({fen,initialFen,running,uncertain,flipped,side:mode(),skill:$('skill').selectedOptions[0]?.textContent,
  opening:study?.name || external?.name,index,lineLength:moves.length,moveListSelected,listStable,listBaseline,listCandidate,
  selected,edition:adminMode?'admin':'learning',lessonPhase:learning.phase,lessonEndPly:learning.endPly,coachPending:Boolean(coached?.pending),coachMove:coached?.result?.move?.san,
  status:$('status').textContent,captureState:$('capture-state').textContent});
function verifyTrackedBoard(before,after,beforeFen,afterFen,orientation,options={}){
  return verifyBoardPosition(before,after,beforeFen,afterFen,orientation,{...options,
    report:window.lensDebug.enabled?details=>window.lensDebug.record('Piece evidence',details):undefined});
}
async function refreshDisplays() {
  const old=$('monitor').value, displays=await window.lens.displays();
  $('monitor').replaceChildren(...displays.map(d=>new Option(d.label,d.id)));
  if(displays.some(d=>String(d.id)===old)) $('monitor').value=old;
  else if(displays.find(d=>d.label.endsWith(' · Primary'))) $('monitor').value=displays.find(d=>d.label.endsWith(' · Primary')).id;
  $('select').disabled=!displays.length;
}
function status(text) {
  if($('status').textContent!==text)window.lensDebug.record('Status',{message:text,fen});
  $('status').textContent=text;window.lensDebug.updateState();
}
function pause() {
  running=false; epoch++; clearTimeout(timer); $('tracking').textContent='Paused'; $('track').textContent='Calibrate & start tracking';
  window.lensDebug.record('Tracking paused',{fen});window.lensDebug.updateState();
}
async function safely(fn) { try { await fn(); } catch(e) { pause(); status(e.message.replace(/^Error invoking remote method '[^']+': Error: /,'')); } }
function setFen(next) {
  if(fen!==next) {
    $('online-results').replaceChildren();
    $('online-note').textContent='';
  }
  if(fen!==next){window.lens.paint({flipped,arrows:[],highlights:[]});}
  fen=next; $('fen').value=fen;
}
async function chooseLesson() {
  pause(); study=lessons[Number($('lesson').value)]; lineIndex=0;
  external=null;
  coachingStopped=false; departure=null; uncertain=false;
  $('intro').textContent=study.intro; $('game-info').textContent='Guided opening lesson. Learn the ideas, then continue independently.';
  await chooseLine(0,true,true);
}
function chooseLine(n, reset=false, remember=false) {
  const parsed=study.lines[n];
  lineIndex=n; moves=parsed.moves; initialFen=parsed.initial;
  if(reset || remember || !learning.endPly)learning.reset(moves,true);
  if(remember)preferredOpening={study,lineIndex:n};
  if(reset){index=0;setFen(initialFen);}
  else syncIndex();
  render();
}
function syncIndex() {
  index=lineIndexAt({initial:initialFen,moves},fen);
}
function followMove(move,paint=true) {
  const expected=index>=0 ? moves[index] : null;
  setFen(move.after);
  if(expected?.from===move.from && expected?.to===move.to && expected?.promotion===move.promotion) index++;
  else syncIndex();
  const offLine=index<0;
  const options=study && (offLine || !moves[index]) ? continuations(lessons,{lesson:lessons.indexOf(study),variation:lineIndex},fen) : [];
  departure=(offLine || options.length) ? {san:move.san,options} : null;
  if(paint)render();
}
function switchVariation({lesson,variation}) {
  study=lessons[lesson];
  external=null;
  $('lesson').value=lesson;
  $('intro').textContent=study.intro;
  departure=null;
  if(mode()==='b' && turnToCoach()){
    blackDefenseChosen=true;
    blackDefenseName=study.lines[variation].defense?.name || study.name;
  }
  chooseLine(variation,false,true);
  status(`Switched to ${study.name} · ${study.lines[variation].name}.`);
}
function renderSuggestions() {
  const container=$('suggestions');
  container.replaceChildren();
  $('skill-section').hidden=(!adminMode && learning.phase==='complete') || (!study && !external?.catalog) || coachingStopped;
  if($('skill-section').hidden)return;
  if(uncertain){
    $('suggestion-note').textContent='Opening suggestions will return when the board position is confirmed.';
    return;
  }
  if(!turnToCoach()){
    $('suggestion-note').textContent=mode()==='b'?'Waiting for White’s move.':'Waiting for Black’s move.';
    return;
  }
  if(pickingBlackDefense()){
    const options=coachVariations();
    for(const choice of options)addChoice(container,`…${choice.move} · ${choice.name} — ${choice.why}`,()=>chooseVariation(choice));
    $('suggestion-note').textContent=options.length?'Choose a defense for the current board.':'Looking for a catalog reply to White’s move…';
    return;
  }
  const level=Number($('skill').value);
  const options=rankedOptions(lessons,fen,level);
  for(const option of options) {
    const opening=lessons[option.lesson];
    const b=document.createElement('button');
    b.className='variation';
    b.textContent=`${option.next} · ${opening.name} · ${opening.lines[option.variation].name} (${levels[option.level]})`;
    b.onclick=()=>switchVariation(option);
    container.append(b);
  }
  $('suggestion-note').textContent=options.length===3?'Pick an option to show its arrow.':options.length?`Only ${options.length} distinct book ${options.length===1?'move is':'moves are'} loaded for this position.`:'No book moves are loaded for this position.';
}
function bookExplanation(move){
  const italian=study?.name==='Italian Game';
  if(italian){
    const points={e4:'Plant a pawn in the center and open diagonals for your bishop and queen.',Nf3:'Develop the knight, put pressure on e5, and clear the path to castle.',Bc4:'Develop the bishop to target f7, a square initially defended only by the king.',c3:'Support a later d4 push so you can contest the center with two pawns.',d3:'Protect e4 and open a diagonal for your other bishop.',Nc6:'Develop the knight and defend the e5 pawn.',Bc5:'Develop the bishop and point it toward f2.'};
    if(points[move.san])return points[move.san];
  }
  if(move.san.startsWith('O-O'))return 'Castle to move the king away from the center and bring the rook into play.';
  if(move.captured)return `${move.san} captures on ${move.to}. Notice which pieces control that square after the trade.`;
  if(move.piece==='n' || move.piece==='b')return `Develop this piece to ${move.to} so it can influence more of the board.`;
  return study?.lines[lineIndex].idea || external?.idea || `Follow this move to ${move.to} in the selected line.`;
}
function variationReason(name,move,plan=''){
  if(name.includes('Sicilian Defense')){
    if(move.san==='Nf3')return 'Develop the knight and prepare d4 to challenge Black’s c5 pawn.';
    if(move.san==='c3')return 'Prepare d4 with pawn support so White can build a broad center.';
  }
  if(move.san.startsWith('O-O'))return 'Move the king away from the center and bring a rook into play.';
  if(move.captured || move.san.includes('x'))return `Capture on ${move.to} to change who controls that square. Watch for the recapture.`;
  if(plan)return plan;
  if(/^[NB]/.test(move.san))return `Develop the ${move.san[0]==='N'?'knight':'bishop'} to ${move.to}, bringing another piece into play.`;
  if(/^[cdef][3-6]/.test(move.san))return `Advance a pawn to ${move.to} to influence the center.`;
  return 'This is a known continuation from the current position, so you can keep studying without undoing moves.';
}
function positionPlans(){
  if(!adminMode)return [];
  if(!canCoach() || !sameCoach(coached) || !coached.result?.fallback || moves[index])return [];
  const primary=coached.result.move;
  const same=plan=>plan.move.from===primary.from && plan.move.to===primary.to && plan.move.promotion===primary.promotion;
  const plans=coached.result.alternatives || [];
  return [...plans.filter(same),...plans.filter(plan=>!same(plan))];
}
function coachVariations(){
  const plans=positionPlans();
  if(plans.length){
    return plans.map((plan,index)=>({id:'plan:'+plan.move.from+plan.move.to+(plan.move.promotion||''),
      name:plan.theme,move:plan.move.san,why:plan.reason,plan,
      intent:index===0?'recommended':plan.move.captured || /[+#]/.test(plan.move.san)?'attack':'defense'}));
  }
  if(uncertain || coachingStopped || !turnToCoach() || (!pickingBlackDefense() && !departure && index>=0))return [];
  const selected=study?{lesson:lessons.indexOf(study),variation:lineIndex}:null;
  const choices=[], seen=new Set();
  const picking=pickingBlackDefense(), skill=Number($('skill').value);
  const eligible=continuations(lessons,picking?null:selected,fen);
  if(picking)eligible.sort((a,b)=>{
    const difficulty=o=>lessons[o.lesson].lines[o.variation].defense?.level;
    return Math.abs((difficulty(a)??10)-skill)-Math.abs((difficulty(b)??10)-skill);
  });
  for(const option of eligible){
    const opening=lessons[option.lesson], line=opening.lines[option.variation], move=line.moves[option.index];
    const id=`guide:${option.lesson}:${option.variation}`;
    const key=move.from+move.to+(move.promotion||'');
    if(picking && (!line.defense || seen.has(key)))continue;
    seen.add(key);
    const defense=picking?line.defense:null;
    choices.push({id,name:defense?.name || `${opening.name} · ${line.name}`,move:move.san,why:defense?.why || variationReason(opening.name,move,line.idea),option});
  }
  if(catalogKey===positionKey(fen))for(const line of catalogData?.next || []){
    if(seen.has(line.uci))continue;
    seen.add(line.uci);
    choices.push({id:`catalog:${line.id}:${line.uci}`,name:picking?'Catalog reply':line.name,move:line.next,why:variationReason(line.name,{san:line.next,to:line.uci.slice(2,4)}),line});
  }
  return choices.slice(0,picking?3:4);
}
async function chooseVariation(choice){
  if(choice?.plan && sameCoach(coached)){
    coached.result={...coached.result,...choice.plan};
    render();
  }
  else if(choice?.option)switchVariation(choice.option);
  else if(choice?.line){
    if(mode()==='b' && turnToCoach()){blackDefenseChosen=true;blackDefenseName='';}
    await loadCatalogLine(choice.line);
  }
}
window.lens.onCoachVariation(({position,id})=>{
  if(position!==fen)return;
  const choice=coachVariations().find(item=>item.id===id);
  if(choice)safely(()=>chooseVariation(choice));
});
function render() {
  if(!adminMode && !uncertain)learning.update(fen);
  if(!adminMode && learning.phase==='complete' && !uncertain){renderLessonComplete();return;}
  const transitioning=!adminMode && learning.phase==='transition';
  const move=!transitioning && !coachingStopped && !uncertain && !departure && index>=0 ? moves[index]:null;
  const catalogEnd=canContinue();
  $('opening').textContent=(study?.name || external?.name || 'Imported game').toUpperCase();
  const named=catalogKey===fen.split(' ').slice(0,4).join(' ') && catalogData?.name;
  $('position-name').textContent=!uncertain && named ? 'Position in the catalog: '+named : '';
  $('next-move').textContent=coachingStopped ? 'Coaching stopped' : uncertain ? (running?'Checking board':'Board needs attention') : move ? `${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}` : departure || index<0 ? 'Outside this line' : catalogEnd ? 'Finding a continuation…' : 'The line is complete!';
  $('explanation').textContent=uncertain ? 'The heading is your previous study. The captured position has not been confirmed, so no arrow is shown.' : catalogEnd ? 'The named line ends here. Checking the catalog for the next move.' : index<0 ? 'This position is outside the selected study. Choose a matching variation, explore the catalog, or restart.' : external?.idea || (move ? (study ? study.lines[lineIndex].idea : 'Follow the recorded move on the board and watch the position develop.') : 'Explore another variation or import a full game to continue learning.');
  if(move && study)$('explanation').textContent=study.name==='Sicilian Defense'?variationReason(study.name,move,bookExplanation(move)):bookExplanation(move);
  else if(move && external?.catalog && !external.online)$('explanation').textContent=variationReason(external.name,move);
  if(move && mode()==='b' && blackDefenseChosen && index===1 && study?.lines[lineIndex].defense){
    $('explanation').textContent=study.lines[lineIndex].defense.why;
  }
  showContinuation(move ? moves.slice(index,index+3) : []);
  $('previous').disabled=index<=0 || coachingStopped; $('next').disabled=!move;
  if(!uncertain && !coachingStopped && (!turnToCoach() || pickingBlackDefense())){
    const picking=pickingBlackDefense();
    $('next-move').textContent=picking?'Choose a defense':mode()==='b'?'Waiting for White':'Waiting for Black';
    $('explanation').textContent=picking?'Choose a reply to White’s move. The arrow will show your choice.':'The Coach will suggest a move when it is your turn.';
    showContinuation([]);
    if(picking)$('next').disabled=true;
  }
  $('book-notice').textContent='';
  $('book-options').replaceChildren();
  if(departure && !coachingStopped && !uncertain) {
    const {san,options}=departure;
    $('book-notice').textContent=options.length
      ? `${san} leaves the selected line. Continue with a matching book variation?`
      : `${san} leaves this study line. See the opening catalog below for other continuations.`;
    if(!options.length)$('catalog-panel').open=true;
    for(const option of options) {
      const b=document.createElement('button');
      b.className='variation';
      b.textContent=`Switch to ${lessons[option.lesson].name} · ${lessons[option.lesson].lines[option.variation].name} (${option.next})`;
      b.onclick=()=>switchVariation(option);
      $('book-options').append(b);
    }
    const stop=document.createElement('button');
    stop.className='variation';stop.textContent='Stop opening guidance';
    stop.onclick=()=>{ coachingStopped=true;departure=null;pause();render();status('Opening guidance stopped. Choose a study or restart to begin again.'); };
    $('book-options').append(stop);
  }
  $('variations').replaceChildren();
  if(study)study.lines.forEach((line,n)=>{
    const b=document.createElement('button'); b.className='variation'; b.textContent=`${n===lineIndex?'●':'○'} ${line.name}`;
    b.onclick=()=>{departure=null;coachingStopped=false;chooseLine(n,false,true);}; $('variations').append(b);
  });
  if(external?.trap) external.trap.lines.forEach((line,n)=>{
    addChoice($('variations'),line.name,()=>loadTrap(external.trap,n));
  });
  if(external?.catalog && !coachingStopped && !uncertain && catalogKey===fen.split(' ').slice(0,4).join(' ')) {
    const shownMove=move ? move.from+move.to+(move.promotion||'') : null;
    for(const line of (catalogData?.next || []).filter(line=>line.uci!==shownMove).slice(0,4)) {
      addChoice($('variations'),`${line.next} · ${line.name}`,()=>loadCatalogLine(line));
    }
  }
  if(external?.online && !coachingStopped && !uncertain && onlineResult?.position===fen) {
    for(const row of (onlineResult.rows || []).filter(row=>row.san!==move?.san).slice(0,4)) {
      const position=fen;
      addChoice($('variations'),`${row.san} · ${row.total.toLocaleString()} master games`,()=>useOnlineMove(row,position));
    }
  }
  const coachedMove=renderCoach(move);
  if(coachedMove && (!move || move.from!==coachedMove.from || move.to!==coachedMove.to || move.promotion!==coachedMove.promotion)) {
    $('next').disabled=true;
  }
  const arrow=turnToCoach() && !pickingBlackDefense() ? coachedMove || move : null;
  const review=canCoach() && sameCoach(coached) ? coached.result?.review : null;
  $('review-note').textContent=review?'Review arrow · '+review.reason:'';
  const arrows=arrow?[{from:arrow.from,to:arrow.to}]:[];
  const plans=arrow?positionPlans():[];
  if(plans.length){
    $('opening').textContent='POSITION PLAN';
    $('book-notice').textContent='Choose one idea and reassess after your opponent’s reply.';
    $('plan-preview').textContent='Alternative next moves · '+plans.map(plan=>plan.move.san).join(' / ');
  }
  arrows.push(...plans.slice(1).map((plan,index)=>({from:plan.move.from,to:plan.move.to,alternative:index+1,intent:plan.move.captured || /[+#]/.test(plan.move.san)?'attack':'defense'})));
  const explanation=$('explanation').textContent;
  const ideas=arrow?illustratedMove(arrow,arrow===move && study?.name==='Italian Game',explanation):[];
  arrows.push(...ideas);
  if(review)arrows.push({from:review.from,to:review.to,review:true});
  if(transitioning){
    $('next-move').textContent=arrow?'The opening is complete! · '+arrow.san:turnToCoach()?'Preparing your final transition move…':'The opening is complete!';
    $('book-notice').textContent='One final move to connect this opening to the middlegame, then you continue independently.';
    if(arrow)learning.offer(fen);
  }
  const occupied=fen.split(' ')[0].replaceAll('/','').replace(/[1-8]/g,n=>'.'.repeat(+n)).split('').flatMap((p,i)=>p==='.'?[]:[String.fromCharCode(97+i%8)+(8-Math.floor(i/8))]);
  const bubble=arrow && $('show-bubbles').checked?{from:arrow.from,to:arrow.to,text:quickExplanation(arrow,explanation,review)}:null;
  window.lens.paint({flipped,arrows,highlights:arrow ? [arrow.from,arrow.to]:[],occupied,bubble});
  window.lens.publishCoach({
    fen,usable:Boolean(arrow && !uncertain),opening:plans.length?'Position plan · '+(fen.split(' ')[1]==='b'?'Black':'White')+' to move':mode()==='b' && blackDefenseName && Number(fen.split(' ')[5])<=2 ? blackDefenseName : $('opening').textContent,move:arrow?.san,
    explanation,details:[study?.intro || external?.idea,explanation,review?.reason,openingGoals(fen,lessonSide(),study?.lines[lineIndex]?.idea || external?.idea)].filter(Boolean).join('\n\n'),phase:adminMode?'admin':learning.phase,review:review?.reason,variations:coachVariations().map(({id,name,move,why,intent})=>({id,name,move,why,intent})),
    departure:!uncertain && !coachingStopped && departure ? departure.san : null,
    pickingDefense:pickingBlackDefense(),planning:Boolean(plans.length)
  });
  renderSuggestions();
  window.lensDebug.updateState();
  showCatalogPosition();
  if(catalogEnd) extendCatalogLine();
}
function renderLessonComplete(){
  if(!learning.summary)learning.summary=openingGoals(fen,lessonSide(),study?.lines[lineIndex]?.idea || external?.idea);
  $('opening').textContent=study?.name || external?.name || 'Opening lesson';
  $('next-move').textContent='The opening is complete!';
  $('explanation').textContent='You’re ready to continue independently.';
  $('coach-note').textContent=learning.summary;
  for(const id of ['plan-preview','review-note','book-notice','position-name'])$(id).textContent='';
  for(const id of ['book-options','variations','catalog-next'])$(id).replaceChildren();
  $('previous').disabled=true;$('next').disabled=true;$('skill-section').hidden=true;
  window.lens.paint({flipped,arrows:[],highlights:[]});
  window.lens.publishCoach({fen,usable:false,opening:$('opening').textContent,explanation:'The opening is complete! You’re ready to continue independently.',details:learning.summary,phase:'complete',variations:[]});
  window.lensDebug.updateState();
}
function showContinuation(line){
  $('plan-preview').textContent=line.length>1
    ? 'Example continuation: '+line.map(m=>`${m.before.split(' ')[5]}${m.color==='w'?'.':'…'} ${m.san}`).join(' → ')+'. The reply can differ.'
    : '';
}
function canCoach(){
  if(!adminMode && learning.phase==='complete')return false;
  return Boolean(fen && (study || external) && !coachingStopped && !uncertain && turnToCoach() && !pickingBlackDefense());
}
function hasBookChoices(){
  if(!fen || !lessons[0].lines[0].moves)return false;
  return continuations(lessons,null,fen).length>0 ||
    (catalogKey===positionKey(fen) && Boolean(catalogData?.next.length));
}
function sameCoach(request){
  return request?.fen===fen && request.moves===moves && (adminMode || request.phase===learning.phase);
}
function renderCoach(bookMove){
  const note=$('coach-note');
  note.textContent='';
  if(!canCoach()){
    if(uncertain)note.textContent='The Coach will resume after the position is confirmed.';
    return null;
  }
  if(adminMode && index>=0 && !bookMove && catalogKey===positionKey(fen) && catalogData?.next.length)return null;
  if(!sameCoach(coached))analyzePlan();
  if(coached.pending){
    note.textContent='Coach is checking the opening plan…';
    if(!bookMove){
      $('next-move').textContent='Finding a plan…';
      $('explanation').textContent='The Coach is checking ideas for this position.';
    }
    return null;
  }
  if(!coached.result){
    note.textContent=(coached.error || 'The Coach did not find an opening-plan move that passed its tactical check.')+
      (bookMove?' The book arrow is still shown.':' No coaching arrow is shown.');
    return null;
  }
  const {move,theme,reason,line,basis,frequency}=coached.result;
  const evidence=basis==='master games' ? `Played in ${frequency.toLocaleString()} recorded master games.`
    : basis==='named lines' ? `Found in ${frequency} named catalog ${frequency===1?'line':'lines'} from this position.`
    : basis==='position plan'?'These are alternative next moves checked for this position.':'Chosen for the opening idea; no game count was used.';
  if(bookMove && !coached.result.review){
    note.textContent=bookMove.san===move.san ? `Coach · ${reason}` : `Coach · ${move.san} is another way to play the idea. ${reason} The arrow still follows the book.`;
    return null;
  }
  $('next-move').textContent=`${move.before.split(' ')[5]}${move.color==='w'?'.':'…'} ${move.san}`;
  $('explanation').textContent=reason;
  note.textContent=coached.result.inCheck
    ? 'Coach · answer the check first. The arrow shows a legal defense.'
    : coached.result.fallback?`Coach · position plan. ${evidence}`:`Coach · off-book ${theme}. ${evidence} The move passed the tactical check.`;
  showContinuation(line || []);
  return move;
}
async function analyzePlan(){
  const request={fen,moves,pending:true,phase:learning.phase};
  coached=request;
  let refresh,usual;
  try {
    const online=onlineResult?.position===request.fen ? onlineResult.rows || [] : [];
    if(coached!==request || !sameCoach(request) || !canCoach())return;
    if((index<0 || !moves[index]) && !online.length && $('online-auto').checked && $('online-token').value.trim() && onlineResult?.position!==request.fen){
      refresh=lookupMasters(request.fen);
    }
    const pieces=request.fen.split(' ')[0].split('/').flatMap(rank=>Array.from(rank).flatMap(char=>/[1-8]/.test(char)?Array(Number(char)).fill(null):[char]));
    const turn=request.fen.split(' ')[1];
    usual=index>=0 ? moves[index] : request.moves.find(move=>{
      const cell=(8-Number(move.from[1]))*8+move.from.charCodeAt(0)-97;
      return move.color===turn && pieces[cell]===(turn==='w'?move.piece.toUpperCase():move.piece);
    });
    request.result=await window.lens.coachPosition(request.fen,request.moves.slice(0,16),online,false,usual,!adminMode && (learning.phase==='transition' || !moves[index]));
  }
  catch {request.error='The Coach could not complete the tactical check.';}
  finally {
    request.pending=false;
    if(coached===request && sameCoach(request) && canCoach())render();
  }
  if(refresh){
    try {
      const online=await refresh;
      if(!online.rows?.length || coached!==request || !sameCoach(request) || !canCoach())return;
      const refined=await window.lens.coachPosition(request.fen,request.moves.slice(0,16),online.rows,false,usual);
      if(refined?.basis==='master games' && coached===request && sameCoach(request) && canCoach()){
        request.result=refined;render();
      }
    }catch{}
  }
}
function addChoice(parent,label,action){
  const b=document.createElement('button');
  b.className='variation';b.textContent=label;b.onclick=()=>safely(action);
  parent.append(b);
}
async function loadExternal(parsed,entry,reset=false){
  study=null;external=entry;initialFen=parsed.initial;moves=parsed.moves;
  if(reset || !learning.endPly)learning.reset(moves,false);
  coachingStopped=false;uncertain=false;departure=null;
  syncIndex();
  if(reset || index<0){pause();index=0;setFen(initialFen);}
  $('intro').textContent=entry.name;
  $('game-info').textContent=entry.source;
  render();
}
async function loadCatalogLine(entry,browse=false){
  const before=fen;
  const parsed=await window.lens.chess('pgn',entry.pgn);
  if(!browse && fen!==before)return;
  const selectedLine={name:entry.name,catalog:true,idea:'Follow this named sequence from the Lichess opening catalog.',source:`ECO ${entry.eco} · Lichess opening catalog`};
  learning.reset(parsed.moves,false);
  preferredOpening={parsed,external:selectedLine};
  await loadExternal(parsed,selectedLine);
}
async function extendCatalogLine(){
  if(!catalogData)return;
  const choice=catalogData.next[0];
  if(!choice){
    extendOnline();
    return;
  }
  const owner=external || study;
  if(extending?.fen===fen && extending?.study===owner)return;
  const request={fen,study:owner};
  extending=request;
  try {
    const parsed=await window.lens.chess('pgn',choice.pgn);
    if(fen!==request.fen || (external || study)!==request.study || !canContinue())return;
    const nextIndex=lineIndexAt(parsed,fen);
    if(nextIndex<0 || !parsed.moves[nextIndex])throw Error('No valid continuation could be loaded.');
    await loadExternal(parsed,{name:owner.name,catalog:true,source:'Lichess opening catalog',idea:'The study line ended here. The arrow shows a continuation from the offline catalog; alternatives are listed below.'});
  } catch {
    if(fen===request.fen && (external || study)===request.study && canContinue()){
      $('next-move').textContent='Continuation unavailable';
      $('explanation').textContent='Choose another continuation from the offline catalog below.';
    }
  } finally { if(extending===request)extending=null; }
}
function canContinue(){
  if(!adminMode)return false;
  return Boolean(study || external?.catalog) && index===moves.length && !coachingStopped && !uncertain && !departure && turnToCoach() && !pickingBlackDefense();
}
async function extendOnline(fetchMoves=requestMasters){
  const position=fen, owner=external || study;
  if(sameCoach(coached) && (coached.pending || coached.result?.fallback) &&
    (!$('online-auto').checked || !$('online-token').value.trim()))return;
  if(!$('online-auto').checked || !$('online-token').value.trim()){
    $('next-move').textContent='The line is complete!';
    $('explanation').textContent='The offline catalog has no next move here. Enable automatic lookup in Online continuations to draw arrows from master-game moves.';
    addChoice($('variations'),'Set up automatic online arrows',()=>{
      $('online-panel').open=true;
      $('online-token').focus();
    });
    return;
  }
  if(extending?.fen===position && extending?.study===owner)return;
  const request={fen:position,study:owner};
  extending=request;
  const version=onlineVersion;
  try{
    $('next-move').textContent='Looking up master games…';
    $('explanation').textContent='No offline move remains. Checking Lichess for a continuation.';
    const result=await lookupMasters(position,false,fetchMoves);
    if(fen!==position || (external || study)!==owner || !canContinue() || !$('online-auto').checked || result.stale)return;
    if(result.error || !result.rows?.length){
      if(sameCoach(coached) && (coached.pending || coached.result?.fallback)){render();return;}
      $('next-move').textContent=result.error?'Online lookup unavailable':'The line is complete!';
      $('explanation').textContent=result.error || 'Lichess returned no recorded master-game moves for this position.';
      return;
    }
    try {
      const suggestions=await window.lens.coachPosition(position,moves.slice(0,16),result.rows,true);
      if(fen!==position || !canContinue() || (external || study)!==owner || !$('online-auto').checked)return;
      const choice=suggestions && result.rows.find(row=>row.uci===suggestions.move.from+suggestions.move.to+(suggestions.move.promotion||''));
      if(!choice){
        if(sameCoach(coached) && coached.result?.fallback){render();return;}
        $('next-move').textContent='The line is complete!';
        $('explanation').textContent='The Coach did not find a master-game move that both fits this plan and passes its tactical check.';
        return;
      }
      await useOnlineMove(choice,position,()=>canContinue() && (external || study)===owner && $('online-auto').checked,suggestions.reason);
    } catch {
      if(fen===position && canContinue()){
        $('next-move').textContent='Continuation unavailable';
        $('explanation').textContent='The returned move could not be loaded.';
      }
    }
  } finally {
    if(extending===request)extending=null;
    if((fen!==position || (external || study)!==owner || version!==onlineVersion) && canContinue())render();
  }
}
async function showCatalogPosition(){
  if(!fen)return;
  const key=fen.split(' ').slice(0,4).join(' ');
  if(key===catalogKey)return;
  catalogKey=key;
  catalogData=null;
  $('catalog-next').replaceChildren();
  $('catalog-position').textContent='Looking up position…';
  try {
    const data=await window.lens.catalog('at',fen);
    if(catalogKey!==key)return;
    catalogData=data;
    $('catalog-position').textContent=[data.name,data.next.length ? `${data.next.length} continuation${data.next.length===1?'':'s'} shown.` : 'No continuations in the offline catalog for this position.'].filter(Boolean).join(' · ');
    for(const line of data.next)addChoice($('catalog-next'),`${line.next} · ${line.eco} ${line.name}`,()=>loadCatalogLine(line));
    render();
  }catch(error){
    if(catalogKey!==key)return;
    $('catalog-position').textContent=error.message;
    if(external?.catalog && index===moves.length && !uncertain && !coachingStopped){
      $('next-move').textContent='Catalog unavailable';
      $('explanation').textContent='The named line ends here, and the catalog could not be queried.';
    }
  }
}
async function loadTrap(trap,n){
  pause();
  const line=trap.lines[n];
  await loadExternal(await window.lens.chess('pgn',line.pgn),{name:`${trap.name} · ${line.name}`,idea:trap.idea,source:'Trap study · compare the two branches',trap});
}
async function step(delta) {
  pause(); if(index<0)return;
  departure=null;uncertain=false;
  index=Math.max(0,Math.min(moves.length,index+delta));
  setFen(index ? moves[index-1].after:initialFen);render();
  status('Study position updated. Match the website board before calibrating tracking.');
}
function boardSquare(i,orientation){const x=i%8,y=Math.floor(i/8);return String.fromCharCode(97+(orientation?7-x:x))+(orientation?y+1:8-y);}
function square(i){return boardSquare(i,flipped);}
function findStudyPosition(image) {
  const lines=study ? lessons.flatMap((opening,lesson)=>opening.lines.map((line,variation)=>({
    ...line,lesson,variation,id:`${lesson}:${variation}`
  }))) : [{initial:initialFen,moves,id:'pgn'}];
  const scores=image.map(energy);
  return findVisiblePosition(flipped?scores.reverse():scores,lines,study?`${lessons.indexOf(study)}:${lineIndex}`:'pgn');
}
function adoptStudyPosition({line,index:depth,fen:detected}) {
  setFen(detected);
  if(study) {
    study=lessons[line.lesson];
    lineIndex=line.variation;
    $('lesson').value=line.lesson;
    $('intro').textContent=study.intro;
    initialFen=line.initial;
    moves=line.moves;
  }
  index=depth;
  departure=null;
  coachingStopped=false;
  const name=depth===0 && study ? 'Starting position' : study ? `${study.name} · ${study.lines[lineIndex].name}` : external?.name || 'Recorded game';
  const last=depth ? moves[depth-1] : null;
  return last ? `${name}, after ${last.before.split(' ')[5]}${last.color==='w'?'.':'…'} ${last.san}` : name;
}
async function matchCapturedOpening(image,token){
  const {match,ambiguous}=findStudyPosition(image);
  if(match)return {detected:adoptStudyPosition(match)};
  if(ambiguous || (!study && !external?.catalog))return {ambiguous};
  const scores=image.map(energy);
  const catalog=await window.lens.catalog('detect',flipped?scores.reverse():scores);
  if(token!==epoch || !catalog.match)return {ambiguous:catalog.ambiguous};
  const entry=catalog.match, parsed=await window.lens.chess('pgn',entry.pgn);
  if(token!==epoch)return {};
  setFen(entry.fen);
  await loadExternal(parsed,{name:entry.name,catalog:true,idea:'Follow this named sequence from the Lichess opening catalog.',source:`ECO ${entry.eco} · Lichess opening catalog`});
  const last=parsed.moves[entry.index-1];
  return {detected:last ? `${entry.name}, after ${last.before.split(' ')[5]}${last.color==='w'?'.':'…'} ${last.san}` : entry.name};
}
function positionKey(position){return position.split(' ').slice(0,4).join(' ');}
function applyPlayerSide(blackAtBottom){
  flipped=blackAtBottom;$('flip').checked=flipped;
  const side=flipped?'b':'w';
  if(mode()!==side){blackDefenseChosen=false;blackDefenseName='';}
  $('playing-side').value=side;
  $('find-status').textContent=`Detected ${flipped?'Black':'White'} at the bottom · coaching ${flipped?'Black':'White'}.`;
}
async function detectPlayerSide(capture,token){
  const side=await bottomPieceColor(capture);
  if(token===epoch && side)applyPlayerSide(side==='b');
}
function showCapturedBoard(capture,message='Latest capture · awaiting position confirmation.'){
  if(capture){$('capture-preview').src=capture;$('preview').hidden=false;}
  $('capture-state').textContent=message;
}
async function matchScreenList(token,read=window.lens.captureMoveList,latest=false,check={}){
  const started=performance.now();
  const data=await read(latest?fen:null);
  if(token!==epoch)return null;
  showCapturedBoard(data.board);
  if(!latest)await detectPlayerSide(data.board,token);
  const image=check.image || await fingerprints(data.board);
  if(token!==epoch)return null;
  const scores=image.map(energy);
  if(data.waiting){
    const start=await window.lens.chess('initial');
    if(token!==epoch)return null;
    const {match}=findVisiblePosition(flipped?scores.reverse():scores,[{initial:start,moves:[]}]);
    if(!match)throw Error('No move rows are visible, and the board does not match the starting position. Keep the numbered moves visible or correct the position.');
    setFen(start);syncIndex();departure=null;coachingStopped=false;
    showCapturedBoard(data.board,'Starting position confirmed.');
    return {waiting:true,image,detected:'starting position',signature:data.signature,frameId:data.frameId};
  }
  const lines=data.candidates || [data];
  window.lensDebug.record('Matching captured position',{latest,frameId:data.frameId,fen,flipped,candidates:lines.length,readMs:performance.now()-started});
  const visible=latest?lines.map(line=>({initial:line.moves.at(-1)?.after || line.initial,moves:[],source:line})):lines;
  let {match,ambiguous}=findVisiblePosition(flipped?[...scores].reverse():scores,visible);
  if(ambiguous && latest && baseline){
    const resolved=findVisiblePosition(flipped?[...scores].reverse():scores,visible,undefined,candidate=>
      positionKey(candidate.fen)===positionKey(fen) ||
      verifyTrackedBoard(baseline,image,fen,candidate.fen,flipped,{textConfirmed:true}));
    if(resolved.match){match=resolved.match;ambiguous=false;}
  }
  if(ambiguous){
    const fitting=[];
    findVisiblePosition(flipped?[...scores].reverse():scores,visible,undefined,candidate=>{fitting.push(candidate);return true;});
    const pieces=position=>position.split(' ')[0].replace(/\//g,'').replace(/[1-8]/g,n=>'.'.repeat(Number(n)));
    const placements=fitting.map(candidate=>pieces(candidate.fen));
    const agreed=[...placements[0]].map((piece,index)=>placements.every(position=>position[index]===piece)?piece:'.');
    const ranks=Array.from({length:8},(_,rank)=>agreed.slice(rank*8,rank*8+8).join('').replace(/\.+/g,empty=>String(empty.length)));
    const reference=ranks.join('/')+' w - - 0 1';
    ({match,ambiguous}=findVisiblePosition(flipped?[...scores].reverse():scores,visible,undefined,candidate=>
      verifyTrackedBoard(image,image,reference,candidate.fen,flipped,{textConfirmed:true})));
  }
  if(!match && !latest){
    const other=findVisiblePosition(flipped?scores:[...scores].reverse(),data.candidates || [data]);
    if(other.match){applyPlayerSide(!flipped);match=other.match;ambiguous=false;}
  }
  if(latest && match)match={...match,line:match.line.source,index:match.line.source.moves.length};
  if(!match)throw Error(ambiguous?'The move list has several positions that look like this board.':'The move list was read, but none of its positions matched the board crop. Check both crops and orientation.');
  const ply=position=>Number(position.split(' ')[5])*2+(position.split(' ')[1]==='b'?1:0);
  if(latest && ply(match.fen)<ply(fen))throw Error('The visible rows are older than the confirmed position. Keep the newest row visible.');
  if(latest && match.index!==match.line.moves.length)throw Error('The newest row is visible, but the board has not caught up yet.');
  if(check.move && positionKey(match.fen)!==positionKey(check.move.after))throw Error('The move text disagrees with the observed piece move.');
  const history=match.line.moves.slice(0,match.index);
  const start=history.findIndex(move=>positionKey(move.before)===positionKey(fen));
  if(latest && !check.move && baseline && start>=0 && positionKey(match.fen)!==positionKey(fen) &&
    !history.slice(start).some(move=>move.promotion) &&
    !verifyTrackedBoard(baseline,image,fen,match.fen,flipped,{textConfirmed:true})){
    throw Error('The board contains a clear piece mismatch with the move text. Check the capture or recalibrate.');
  }
  if(start>=0)history.slice(start).forEach(move=>followMove(move,false));
  else {
    setFen(match.fen);syncIndex();
    departure=index<0 && history.length ? {san:history.at(-1).san,options:[]} : null;
  }
  showCapturedBoard(data.board,'Position confirmed.');
  window.lensDebug.record('Position accepted',{frameId:data.frameId,fen,latest,elapsedMs:performance.now()-started,
    source:'OCR and board agreement',lastMove:history.at(-1)?.san});
  return {image,signature:data.signature,frameId:data.frameId,detected:history.length?`move list through ${history.at(-1).san} (${history.length} half-moves)`:'starting position from the move list'};
}
async function moveListLoop(token,sample=window.lens.trackingFrame,read=window.lens.captureMoveList){
  if(!running || token!==epoch)return;
  try{
    const frame=await sample(uncertain?'':listBaseline);
    if(!running || token!==epoch)return;
    if(frame.board)showCapturedBoard(frame.board);
    const current=frame.signature;
    if(current===listBaseline){
      if(uncertain && frame.board && baseline){
        const restored=await fingerprints(frame.board);
        if(!running || token!==epoch)return;
        if(!changedCells(baseline,restored,.018).length){
          uncertain=false;render();status('The board and move panel are back at the confirmed position.');
          showCapturedBoard(null,'Position confirmed.');
        }
      }
      listBoard=null;listCandidate='';listStable=0;
      timer=setTimeout(()=>moveListLoop(token),160);
      return;
    }
    if(current!==listCandidate && !uncertain){
      uncertain=true;render();status('Checking the new move against the board…');
    }
    const image=await fingerprints(frame.board);
    if(!running || token!==epoch)return;
    const settled=listBoard && changedCells(listBoard,image,.018).length===0;
    listBoard=image;
    listStable=current===listCandidate && settled?listStable+1:1;
    listCandidate=current;
    if(window.lensDebug.enabled)window.lensDebug.record('Frame stability',{frameId:frame.id,signature:current,settled:Boolean(settled),stableFrames:listStable});
    if(settled && (listStable===2 || listStable%5===0)){
      try{
        const changed=baseline?changedPieceCells(baseline,image).map(square):[];
        let move=changed.length?await window.lens.chess('infer',{fen,changed}):null;
        if(!running || token!==epoch)return;
        let verified=move && verifyTrackedBoard(baseline,image,fen,move.after,flipped);
        if(!verified && baseline && changed.length>=2 && changed.length<=7){
          const candidates=await window.lens.chess('board-candidates',{fen,changed});
          if(!running || token!==epoch)return;
          const supported=candidates.filter(candidate=>verifyTrackedBoard(baseline,image,fen,candidate.after,flipped,{boardRecovery:true}));
          if(supported.length===1){move=supported[0];verified=true;}
        }
        window.lensDebug.record('Move inference',{frameId:frame.id,fen,changed,move:move?.san,verified:Boolean(verified)});
        let matched;
        if(verified){
          // A changed move panel plus two stable, matching piece frames is
          // sufficient evidence. Keep OCR off the latency-critical path.
          followMove(move,false);
          window.lensDebug.record('Fast board confirmation',{frameId:frame.id,move:move.san,fen:move.after,ocrSkipped:true});
          matched={image,signature:current,frameId:frame.id,boardVerified:true,ocrSkipped:true,detected:move.san};
        }else{
          // Opponent and user can both move between samples. Recover a unique
          // short legal path from occupancy, then require strict piece evidence.
          const recoveryScores=image.map(energy);
          const recoveryCandidates=baseline?await window.lens.chess('recover-candidates',{fen,scores:flipped?recoveryScores.reverse():recoveryScores}):null;
          if(!running || token!==epoch)return;
          const supportedPaths=(recoveryCandidates || []).filter(path=>verifyTrackedBoard(baseline,image,fen,path.at(-1).after,flipped,{boardRecovery:true}));
          const recovered=supportedPaths.length===1?supportedPaths[0]:null;
          if(recovered?.length){
            for(const played of recovered)followMove(played,false);
            const detected=recovered.map(played=>played.san).join(' → ');
            window.lensDebug.record('Board-only recovery',{frameId:frame.id,moves:recovered.map(played=>played.san),fen,reason:'Unique legal path supported by stable board shapes.'});
            matched={image,signature:current,frameId:frame.id,boardVerified:true,detected};
          }else matched=await matchScreenList(token,anchor=>read(anchor,frame.id,false),true,{image});
        }
        if(!running || token!==epoch || !matched)return;
        if(matched.frameId!==undefined)await window.lens.confirmTrackingFrame(matched.frameId);
        if(!running || token!==epoch)return;
        if(matched.waiting){
          baseline=matched.image;uncertain=false;
          listBaseline=matched.signature || current;
          setMoveListState('waiting','Move panel found. Waiting for the first move.');
          showCapturedBoard(frame.board,'Starting position confirmed.');
          render();status('Starting position confirmed. Waiting for the first move.');
          timer=setTimeout(()=>moveListLoop(token),160);
          return;
        }
        baseline=matched.image;listBaseline=matched.signature || current;uncertain=false;
        showCapturedBoard(frame.board,matched.boardVerified?'Board move confirmed · move-panel change detected.':'Position confirmed.');
        setMoveListState('readable',matched.boardVerified
          ?`Board verified · ${matched.detected}. Watching the move panel for changes.`
          :`Move list readable · board confirmed · ${matched.detected}.`);
        render();status(matched.boardVerified?`Tracked ${matched.detected} from the stable board. Watching both inputs.`:`Following ${matched.detected}.`);
      }catch(error){
        if(!running || token!==epoch)return;
        uncertain=true;render();
        setMoveListState('error','Needs attention · the move text and board could not be matched yet.');
        status(`Move list not confirmed. ${error.message.replace(/^Error invoking remote method '[^']+': Error: /,'')} Retrying automatically.`);
        window.lensDebug.record('Position rejected',{frameId:frame.id,fen,error:error.message},true);
      }
    }
  }catch(error){
    if(token!==epoch)return;
    uncertain=true;render();status('Capture temporarily unavailable. Retrying automatically.');
    window.lensDebug.record('Capture loop retry',{fen,error:error.message},true);
  }
  if(running && token===epoch)timer=setTimeout(()=>moveListLoop(token),160);
}
async function captureLoop(token, grab=window.lens.capture) {
  if(!running || token!==epoch)return;
  try {
    const capture=await grab(),current=await fingerprints(capture);
    if(!running || token!==epoch)return;
    showCapturedBoard(capture);
    const changed=changedPieceCells(baseline,current).map(square).sort();
    const signature=changed.join(',');
    stable=signature===pending?stable+1:1;pending=signature;
    if(changed.length){
      missedFrames++;
      if(!uncertain){uncertain=true;render();}
      if(stable>=2 && (stable===2 || stable%4===0)){
        let path=null;
        const candidates=await window.lens.chess('board-candidates',{fen,changed});
        if(!running || token!==epoch)return;
        const supported=candidates.filter(move=>verifyTrackedBoard(baseline,current,fen,move.after,flipped,{boardRecovery:true}));
        if(supported.length===1)path=supported;
        if(!path){
          const scores=current.map(energy);
          const paths=await window.lens.chess('recover-candidates',{fen,scores:flipped?scores.reverse():scores});
          if(!running || token!==epoch)return;
          const verified=(paths || []).filter(moves=>verifyTrackedBoard(baseline,current,fen,moves.at(-1).after,flipped,{boardRecovery:true}));
          if(verified.length===1)path=verified[0];
        }
        if(path){
          path.forEach(move=>followMove(move,false));
          baseline=current;pending='';stable=0;uncertain=false;missedFrames=0;
          render();showCapturedBoard(null,'Board position confirmed.');
          status(`Tracked ${path.map(move=>move.san).join(' → ')}. Watching for the next move.`);
          window.lensDebug.record('Board position accepted',{fen,moves:path.map(move=>move.san)});
        }else if(moveListSelected){
          const result=await matchScreenList(token,window.lens.captureMoveList,true);
          if(!running || token!==epoch)return;
          if(result && !result.waiting){
            baseline=result.image;pending='';stable=0;uncertain=false;missedFrames=0;
            render();status(`Resynced from the ${result.detected}.`);
          }
        }else{
          status('Catching up with the board… Select the optional move panel to recover longer sequences.');
          window.lensDebug.record('Board resync pending',{fen,changed},true);
        }
      }
    }else{
      missedFrames=0;
      if(uncertain){uncertain=false;render();status('Board is back at the confirmed position.');}
      showCapturedBoard(null,'Position confirmed.');
    }
  }catch(error){
    if(token!==epoch)return;
    uncertain=true;render();status(`Retrying tracking: ${error.message}`);
    window.lensDebug.record('Board tracking retry',{fen,error:error.message},true);
  }
  if(running && token===epoch)timer=setTimeout(()=>captureLoop(token),250);
}
$('select').onclick=()=>safely(async()=>{pause();await window.lens.selectBoard(Number($('monitor').value));});
$('select-move-list').onclick=()=>safely(async()=>{pause();await window.lens.selectBoard(Number($('monitor').value),'moves');});
function setMoveListState(state,message){
  const label=$('move-list-state');
  label.dataset.state=state;label.textContent=message;
}
window.lens.onMoveList(value=>{
  if(!value && moveListSelected && running && $('prefer-move-list').checked){pause();status('Move list cleared. Calibrate again to follow the board.');}
  moveListSelected=value;
  if(!value){setMoveListState('idle','No move panel selected.');return;}
  setMoveListState('waiting',selected?'Checking the move panel…':'Move area selected. Select the board to verify it.');
  if(!selected)return;
  const token=epoch;
  setTimeout(()=>{if(moveListSelected && token===epoch)safely(()=>toggleTracking(window.lens.capture,true));},180);
});
$('prefer-move-list').onchange=()=>{pause();status('Tracking source changed. Calibrate again.');};
$('auto-find').onclick=async()=>{
  pause();
  $('auto-find').disabled=true;
  $('find-status').textContent='Looking for the board and move panel…';
  try { await window.lens.findBoard(); $('find-status').textContent='Review and confirm the capture boxes to calibrate.'; }
  catch(error) {
    $('find-status').textContent=error.message.replace(/^Error invoking remote method 'find-board': Error: /,'');
  } finally { $('auto-find').disabled=false; }
};
window.lens.onReviewCancelled(()=>$('find-status').textContent='Capture review canceled.');
window.lens.onDisplays(()=>safely(refreshDisplays));
window.lens.onBoard(region=>{
  selected=Boolean(region);pause();uncertain=false;
  $('preview').hidden=true;$('capture-preview').removeAttribute('src');
  $('connection').textContent=selected?'Board selected':'Not selected';
  if(region) $('monitor').value=region.displayId;
  $('find-status').textContent=region?.auto?'Board found. Checking its opening position…':'';
  render();
  status(selected?'Board selected. Calibrate to find its position in the loaded lines.':'Monitor changed. Select the board again.');
  if(region?.auto) {
    $('manual-fen').checked=false;
    safely(()=>toggleTracking(window.lens.capture,moveListSelected));
    $('find-status').textContent='Board found. See Follow the Position for the calibration result.';
  }
});
$('flip').onchange=()=>{pause();flipped=$('flip').checked;render();status('Orientation changed. Recalibrate before tracking.');};
$('lesson').onchange=()=>safely(chooseLesson);
$('skill').onchange=()=>{if(fen)render();};
$('playing-side').onchange=()=>{blackDefenseChosen=false;blackDefenseName='';if(fen)render();};
$('previous').onclick=()=>safely(()=>step(-1)); $('next').onclick=()=>safely(()=>step(1));
$('restart').onclick=()=>safely(async()=>{
  if(!initialFen)return;
  learning.reset(moves,Boolean(study));
  pause();index=0;departure=null;coachingStopped=false;uncertain=false;missedFrames=0;pending='';stable=0;
  blackDefenseChosen=false;blackDefenseName='';
  await window.lens.clearMoveList();
  $('manual-fen').checked=false;
  $('preview').hidden=true;$('capture-preview').removeAttribute('src');
  if(preferredOpening?.study){
    study=preferredOpening.study;
    external=null;
    $('lesson').value=lessons.indexOf(study);
    $('intro').textContent=study.intro;
    $('game-info').textContent='Guided opening · '+study.lines[preferredOpening.lineIndex].name;
    chooseLine(preferredOpening.lineIndex,true);
  } else if(preferredOpening?.external){
    await loadExternal(preferredOpening.parsed,preferredOpening.external,true);
  } else {
    setFen(initialFen);render();
  }
  status(`New game ready · ${study?.name || external?.name || 'Starting position'}. Reset the website board too, then calibrate to track it.`);
});
if($('import'))$('import').onclick=()=>safely(async()=>{
  pause();const parsed=await window.lens.importPgn();if(!parsed)return;
  study=null;external=null;moves=parsed.moves;index=0;initialFen=parsed.initial;departure=null;coachingStopped=false;uncertain=false;setFen(initialFen);
  const h=parsed.headers;
  $('intro').textContent='Recorded game · '+(h.Opening||h.ECO||'Imported PGN');
  $('game-info').textContent=`${h.White||'White'} vs ${h.Black||'Black'} · ${h.Event||'Unknown event'} · ${h.Date||'Unknown date'} · ${h.Result||'*'}`;
  render();status('PGN loaded. The game’s main line is used.');
});
$('catalog-search').onsubmit=async event=>{
  event.preventDefault();
  const version=++searchVersion, query=$('catalog-query').value.trim().toLowerCase();
  if(!query)return;
  $('catalog-results').replaceChildren();
  $('catalog-search-note').textContent='Searching…';
  try{
    const records=await window.lens.catalog('search',query);
    if(version!==searchVersion)return;
    $('catalog-search-note').textContent=records.length?`${records.length} results shown. Opening a line can reset the study position.`:'No openings matched.';
    for(const entry of records)addChoice($('catalog-results'),`${entry.eco} · ${entry.name}`,async()=>loadCatalogLine(await window.lens.catalog('line',entry.id),true));
  }catch(error){if(version===searchVersion)$('catalog-search-note').textContent=error.message;}
};
$('token-page').onclick=()=>safely(()=>window.lens.tokenPage());
async function useOnlineMove(row,position,stillCurrent=()=>true,reason=''){
  if(fen!==position || !stillCurrent())return;
  const {move}=await window.lens.chess('move',{fen:position,move:row.uci});
  if(fen!==position || !stillCurrent())return;
  const parsed=index>=0 ? {initial:initialFen,moves:[...moves.slice(0,index),move]} : {initial:position,moves:[move]};
  await loadExternal(parsed,{name:external?.name || study?.name || 'Master game continuation',catalog:true,online:true,
    idea:`${reason ? reason+' ' : ''}This move was played in ${row.total.toLocaleString()} recorded master games. Pick an alternative below to change the arrow.`,
    source:'Lichess Masters Explorer'});
}
function showOnlineResults(result){
  const {position,rows,error}=result;
  $('online-results').replaceChildren();
  $('online-note').textContent=error || (rows.length?'Ranked by game count. W/D/B means White wins, draws, and Black wins.':'No master-game moves found for this position.');
  if(error)return;
  for(const row of rows)addChoice($('online-results'),`${row.san} · ${row.total.toLocaleString()} games · W/D/B: ${row.counts.join('/')}`,()=>useOnlineMove(row,position));
}
async function lookupMasters(position,force=false,fetchMoves=requestMasters){
  const token=$('online-token').value.trim();
  if(!token)return {position,error:'Enter a Lichess access token to look up master games.'};
  if(!force && onlineResult?.position===position)return onlineResult;
  const version=onlineVersion;
  if(onlineRequest){
    if(onlineRequest.position===position && onlineRequest.version===version)return onlineRequest.promise;
    await onlineRequest.promise;
    if(position!==fen || version!==onlineVersion)return {stale:true};
    return lookupMasters(position,force,fetchMoves);
  }
  const button=$('online-lookup');
  button.disabled=true;
  $('online-results').replaceChildren();
  $('online-note').textContent='Looking up master games…';
  const request={position,version};
  onlineRequest=request;
  request.promise=(async()=>{
    let result;
    try {result={position,rows:await fetchMoves(position,token)};}
    catch(error){result={position,error:error.message.replace(/^Error invoking remote method 'online-masters': Error: /,'')};}
    finally {onlineRequest=null;button.disabled=false;}
    if(version!==onlineVersion || position!==fen)return {stale:true};
    onlineResult=result;
    showOnlineResults(result);
    return result;
  })();
  return request.promise;
}
$('online-token').oninput=()=>{
  onlineVersion++;
  onlineResult=null;
  $('online-results').replaceChildren();
  $('online-note').textContent='';
};
$('online-token').onchange=()=>{if(fen && canContinue())render();};
$('online-auto').onchange=()=>{if(fen && canContinue())render();};
$('online-lookup').onclick=async()=>{
  if(!fen)return;
  const result=await lookupMasters(fen,true);
  if(result.error)$('online-note').textContent=result.error;
  if(canContinue() && $('online-auto').checked)render();
};
$('apply-fen').onclick=()=>safely(async()=>{pause();setFen(await window.lens.chess('validate',$('fen').value.trim()));$('manual-fen').checked=true;departure=null;uncertain=false;syncIndex();render();status('Position corrected. Calibration will use this FEN.');});
$('initial').onclick=()=>safely(async()=>{pause();setFen(await window.lens.chess('initial'));departure=null;uncertain=false;syncIndex();render();});
$('manual-move').onsubmit=async event=>{
  event.preventDefault();
  const input=$('played-move');
  const entered=input.value.trim();
  if(!entered || !fen)return;
  pause();
  try {
    const {move}=await window.lens.chess('move',{fen,move:entered});
    uncertain=false;followMove(move);input.value='';
    status(`Recorded ${move.san}. Enter the next played move here, or recalibrate to resume automatic tracking.`);
  } catch {
    status(`“${entered}” is not a legal move from the coach’s current position. Try SAN (Nf3) or coordinate notation (g1f3).`);
  }
};
async function toggleTracking(grab=window.lens.capture,forceList=false,readList=window.lens.captureMoveList){
  if(running){pause();return;}
  if(busy)return;
  if(!selected){status('Select the board first.');return;}
  busy=true;
  const token=++epoch;
  const manual=!forceList && $('manual-fen').checked;
  $('track').disabled=true;$('tracking').textContent='Checking capture';status('Capturing the selected monitor…');
  try {
    let image,detected,signature,frameId,moveListError;
    if(forceList) {
      status('Reading the move list and checking it against the board…');
      let matched;
      try{matched=await matchScreenList(token,readList);}
      catch(error){
        if(token!==epoch)return;
        setMoveListState('error','Needs attention · select the panel around its numbered rows and keep the board visible.');
        moveListError=error;
      }
      if(token!==epoch || (!matched && !moveListError))return;
      if(matched?.waiting){
        setMoveListState('waiting','Move panel found. Waiting for the first move.');
        ({image,detected,signature,frameId}=matched);
      } else if(matched) {
        ({image,detected,signature,frameId}=matched);
        setMoveListState('readable',`Move list readable · ${detected}.`);
      }
    }
    if(!image) {
    const capture=await grab(true);
    if(!manual)await detectPlayerSide(capture,token);
    image=await fingerprints(capture);
    if(token!==epoch)return;
    showCapturedBoard(capture);
    if(manual) {
      const occupied=await window.lens.chess('occupied',fen);
      if(token!==epoch)return;
      if(!plausibleBoard(image,Array.from({length:64},(_,i)=>i).filter(i=>occupied.includes(square(i))))) {
        $('preview').open=true;
        if(!image.some(cell=>energy(cell)>0.025)) { uncertain=true;render();throw Error('The capture looks empty. Check the preview and reselect the full board.'); }
        detected='the supplied FEN (verify the capture; the board image could not be validated)';
      }
    } else {
      const found=await matchCapturedOpening(image,token);
      if(token!==epoch)return;
      detected=found.detected;
      if(!detected && moveListSelected && !moveListError){
        status('Board alone was not enough. Reading the move list…');
        try {
          const matched=await matchScreenList(token,readList);
          if(token!==epoch || !matched)return;
          ({image,detected,signature,frameId}=matched);
          if(matched.waiting){
            setMoveListState('waiting','Move panel found. Waiting for the first move.');
          }else{
            setMoveListState('readable',`Move list readable · ${detected}.`);
          }
        }catch(error){
          if(token!==epoch)return;
          $('preview').open=true;uncertain=true;render();throw error;
        }
      }
      if(!detected) {
        $('preview').open=true;uncertain=true;render();
        if(moveListError)throw moveListError;
        if(found.ambiguous)throw Error('Several positions have the same occupied squares. Select the numbered move list or use a FEN.');
        const samples=image.map(energy);
        if(samples.every(score=>score<.025))throw Error('The capture has too little piece detail. Check whether the preview is blank or shows the wrong area.');
        throw Error('The visible squares did not match a known position. Check orientation and crop, select the numbered move list, or use a FEN.');
      }
    }
    }
    uncertain=false;render();
    baseline=image;running=true;stable=0;missedFrames=0;pending='';$('tracking').textContent='Following';$('track').textContent='Pause tracking';status(detected ? `${manual?'Using':'Matched'} ${detected}. Tracking is on.` : 'Calibrated using the supplied FEN. Tracking is on.');
    showCapturedBoard(null,manual?'Using the supplied position.':'Position confirmed.');
    if(frameId!==undefined)await window.lens.confirmTrackingFrame(frameId);
    if(token!==epoch)return;
    await window.lens.openCoach();
    if(token!==epoch)return;
    if(moveListSelected && $('prefer-move-list').checked && !moveListError){
      listBaseline=signature || '';listCandidate='';listStable=0;listBoard=null;
      $('tracking').textContent='Following board + moves';
      status(detected ? `Matched ${detected}. Watching the move list for changes.` : 'Watching the move list for changes.');
      timer=setTimeout(()=>moveListLoop(token),160);
    } else {
      if(moveListError){
        setMoveListState('error','Moves panel not confirmed. Following the board instead.');
        status('Board confirmed. Opening suggestions use the board position while the Moves panel is unreadable.');
      }
      timer=setTimeout(()=>captureLoop(token),700);
    }
  } finally {busy=false;$('track').disabled=false;}
}
$('track').onclick=()=>safely(toggleTracking);

(async()=>{
  window.lens.catalog('summary').then(({count,positions})=>{$('catalog-summary').textContent=`Offline opening catalog · ${count.toLocaleString()} lines · ${positions.toLocaleString()} positions`;}).catch(error=>{$('catalog-position').textContent=error.message;});
  traps.forEach(trap=>addChoice($('trap-list'),trap.name,()=>loadTrap(trap,0)));
  await refreshDisplays();
  await Promise.all(lessons.flatMap(l=>l.lines.map(async line=>Object.assign(line,await window.lens.chess('pgn',line.pgn)))));
  lessons.forEach((l,i)=>{const option=document.createElement('option');option.value=i;option.textContent=l.name;$('lesson').append(option);});
  setFen(await window.lens.chess('initial'));await chooseLesson();

})().catch(e=>status(e.message));
