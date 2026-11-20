const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const { findVisiblePosition } = require('../src/book.js');
const { detectBoards } = require('../src/board-detector.cjs');
const { buildCatalog } = require('../src/catalog.cjs');
const { explorerMoves } = require('../src/explorer.cjs');
const traps = require('../src/traps.js');
const path = require('node:path');
const { coachPosition } = require('../src/coach.cjs');
const { parseMoveText,parseRows } = require('../src/move-ocr.cjs');
const { answerCoach } = require('../src/coach-chat.cjs');
const { panelNearBoard } = require('../src/region-review.cjs');
const {moveGridText}=require('../src/move-layout.cjs');
const {verifyBoardPosition}=require('../src/vision.js');
const diagnostics=require('../src/diagnostics.cjs');
test('confirmed anchor ignores damaged old rows but still rejects a new missing row',()=>{
  const anchor='N1b1k2r/ppQp1ppp/2n5/2B3P1/5P2/P4K2/5p1P/q4B1R w - - 4 25';
  const lines=parseRows('11. cxd6 c6\n13. Nxf3 exf3\n25. W xc8+ ds',true,anchor);
  assert.ok(lines.some(line=>line.moves.map(move=>move.san).join(' ')==='Qxc8+ Nd8'));
  assert.throws(()=>parseRows('25. Qxc8+ Nd8\n27. h3',true,anchor),/skipped/);
});
test('pawn capture OCR retains a legal c/e alternative for board confirmation',()=>{
  const anchor='rnbqkbnr/pp4pp/2p1pp2/3P4/3P4/4P3/PP1N1PPP/R1BQKBNR b KQkq - 0 5';
  const lines=parseRows('5... exd5\n6. h4',true,anchor);
  assert.deepEqual(new Set(lines.map(line=>line.moves.map(move=>move.san).join(' '))),new Set(['exd5 h4','cxd5 h4']));
  assert.equal(parseRows('5... exd5\n6. h4',false,anchor).length,1);
});

test('auto-find proposes the panel around a unique Moves heading beside the board',()=>{
  const board={x:20,y:35,size:350};
  const heading={x0:520,x1:570,y0:59,y1:72};
  const pixel=(x,y)=>x>=405 && x<690 && y>=50 && y<389 ? [24,28,36] : [12,17,22].map(x=>x+65);
  const panel=panelNearBoard(board,[heading],720,430,pixel);
  assert.deepEqual(panel,{x:405,y:51,width:285,height:338});
  assert.equal(panelNearBoard(board,[],720,430,pixel),null);
});
test('Developer Mode keeps bounded logs and retains the failure capture independently',()=>{
  diagnostics.setEnabled(false);diagnostics.clear();
  diagnostics.record('Ignored',{value:1});
  assert.equal(diagnostics.snapshot().events.length,0);
  diagnostics.setEnabled(true);
  diagnostics.setState({fen:'test position',running:true});
  diagnostics.setCaptures({panel:'failure image'});
  diagnostics.addOcr({text:'1. e4 e5'});
  diagnostics.record('Match rejected',{reason:'ambiguous'},true);
  diagnostics.setCaptures({panel:'newer image'});
  for(let i=0;i<120;i++)diagnostics.record('Frame',{index:i});
  const result=diagnostics.snapshot();
  assert.equal(result.events.length,100);
  assert.equal(result.failure.captures.panel,'failure image');
  assert.equal(result.failure.ocr[0].text,'1. e4 e5');
  assert.equal(result.captures.panel,'newer image');
  diagnostics.clear();
  assert.equal(diagnostics.snapshot().failure,null);
  assert.equal(diagnostics.snapshot().state.running,true);
  diagnostics.setEnabled(false);diagnostics.clear();
});

test('Coach finds an Italian-style defense and flags Nf3 when the king is in check',async()=>{
  const position=new Chess();position.loadPgn('1. e4 c6 2. d4 Qa5+');
  const study=new Chess();study.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3');
  const hints=study.history({verbose:true});
  const result=await coachPosition(position.fen(),hints,{usual:hints[2]});
  assert.equal(result?.move.san,'c3');
  assert.match(result.reason,/queen on a5.*supports d4/);
  assert.match(result.review.reason,/Nf3 is illegal/);
  assert.equal(result.review.from,'g1');
});

test('local chat gets verified position facts and cannot select an arrow',async()=>{
  const position={usable:true,move:'3. c3',opening:'Italian Game',fen:new Chess().fen(),explanation:'The pawn blocks the check.',review:'Nf3 leaves the king in check.'};
  assert.match(await answerCoach({position,question:'Why?'}),/blocks the check/);
  const result=await answerCoach({position,question:'Why not Nf3?',model:'local-tutor'},async(url,options)=>{
    assert.equal(url,'http://127.0.0.1:11434/api/chat');
    const {messages,stream}=JSON.parse(options.body);
    assert.equal(stream,false);
    assert.match(messages[1].content,/Nf3 leaves the king in check/);
    return {ok:true,json:async()=>({message:{content:'Deal with the check first.'}})};
  });
  assert.equal(result,'Deal with the check first.');
});

test('screen move list accepts numbered legal SAN and rejects missing or illegal moves',()=>{
  const game=new Chess();game.loadPgn('1. e4 e6 2. d4');
  assert.equal(parseMoveText('1. e4 e6\n2 d4').moves.at(-1).after,game.fen());
  assert.equal(parseMoveText('1 e2.e4 | e7.e6\n2 d2.d4').moves.at(-1).after,game.fen());
  assert.throws(()=>parseMoveText('1. e4 e6\n3. d4'),/skipped/);
  assert.throws(()=>parseMoveText('1. e4 d4'),/legal/);
  assert.throws(()=>parseMoveText('2. d4 d5'),/show move 1/);
});
test('move panels accept compact PGN, figurines, coordinates and separate Black replies',()=>{
  const expected=new Chess();expected.loadPgn('1. e4 e5 2. Nf3 Nc6');
  for(const text of [
    '1.e4 e5 2.Nf3 Nc6',
    '1. e4 e5\n2. ♘f3 ♞c6',
    '1. e2.e4 e7.e5\n2. g1.f3 b8.c6',
    '1. e4\n1... e5\n2. Nf3\n2... Nc6'
  ])assert.equal(parseMoveText(text).moves.at(-1).after,expected.fen(),text);
  const first=new Chess();first.move('e4');
  assert.equal(parseRows('1... e5\n2. Nf3 Nc6',false,first.fen())[0].moves.at(-1).after,expected.fen());
  const promotion='7k/P7/8/8/8/8/8/7K w - - 0 1';
  assert.equal(parseRows('1. a8=Q+',false,promotion)[0].moves[0].san,'a8=Q+');
});
test('spatial move grid recovers a damaged row number and excludes headers and clocks',()=>{
  const words=[];
  const word=(text,x,y)=>words.push({text,bbox:{x0:x,x1:x+text.length*7,y0:y,y1:y+12}});
  word('23',10,0);word('Opening',45,0);
  for(const [i,pair] of [['e4','e5'],['Nf3','Nc6'],['Bc4','Bc5'],['O-O','Nf6']].entries()){
    const y=50+i*30;
    word(i===1?'z':`${i+1}.`,10,y);
    word(pair[0],110,y);word('(0:02)',190,y);word(pair[1],350,y);
  }
  const text=moveGridText(words,620);
  assert.match(text,/2\. Nf3 Nc6/);
  const game=new Chess();game.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6');
  assert.ok(parseRows(text,true).some(line=>line.moves.at(-1).after===game.fen()));
  assert.equal(moveGridText([],620),null);
});
test('ChessDuels knight icon and replay controls preserve both legal destination matches',()=>{
  const text="Moves 3 &\n23 Queen's Pawn Game\n1. d4 d5\n2. A c3\nI<  <  >  >|\n";
  assert.deepEqual(parseRows(text,true).map(line=>line.moves.at(-1).san),['c3','Nc3']);
  assert.deepEqual(parseRows('1. d4 d5\n2. 4 c3',true).map(line=>line.moves.at(-1).san),['c3','Nc3']);
});
test('a scrolling move list continues from the last confirmed position',()=>{
  const alternatives=parseRows('1. A c3 d5\n2. f3',true);
  const expected=new Chess();expected.loadPgn('1. Nc3 d5 2. f3');
  assert.ok(alternatives.some(line=>line.moves.at(-1).after===expected.fen()));
  const game=new Chess();game.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4');
  const [tail]=parseRows('3. Bc4 Bc5\n4. c3',false,game.fen());
  assert.deepEqual(tail.moves.map(move=>move.san),['Bc5','c3']);
  assert.throws(()=>parseRows('4. c3 Nf6',false,game.fen()),/does not connect/);
});
test('updated ChessDuels rows resolve knight and queen icons against a Black-oriented board',()=>{
  const text="Moves 3 &\n23 Van Geet Opening\n1. A c3 d5\n2. e4 e5\n3. Ww f3\nI< <\n@ lightshot 2 x";
  const game=new Chess();game.loadPgn('1. Nc3 d5 2. e4 e5 3. Qf3');
  const candidates=parseRows(text,true);
  const scores=game.board().flat().map(piece=>piece?0.15:0);
  const fromBlack=[...scores].reverse();
  assert.equal(findVisiblePosition([...fromBlack].reverse(),candidates).match.fen,game.fen());
  assert.throws(()=>parseRows(text,false));
  game.undo();
  const resumed=parseRows(text,true,game.fen());
  assert.ok(resumed.some(line=>line.moves.map(move=>move.san).join(' ')==='Qf3'));
  const start=new Chess();start.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  assert.equal(parseRows('4 c3',true,start.fen())[0].moves[0].san,'c3');
  assert.deepEqual(parseRows('1. e4 e5',true,new Chess().move('e4').after).map(line=>line.moves[0].san),['e5']);
});
test('unclear capture ranks preserve h8 and require a board match',()=>{
  const game=new Chess();game.loadPgn('1. Nf3 d5 2. Nc3 e5 3. Nxe5 d4 4. Nb5 c6 5. Na3 f5 6. e3 Nd7 7. exd4 f4 8. Qh5+ g6 9. Nxg6 hxg6');
  const expected=new Chess(game.fen());expected.move('Qxh8');
  for(const text of ['10. Qxhs','10. Qxhe']){
    const candidates=parseRows(text,true,game.fen());
    assert.ok(candidates.some(line=>line.moves.at(-1).after===expected.fen()),text);
  }
  assert.throws(()=>parseRows('10. Qxhs',false,game.fen()),/read reliably/);
});
test('piece verification checks moves, captures, castling and en passant in both orientations',()=>{
  const shapes='PNBRQKpnbrqk';
  const image=(fen,flipped)=>{
    const squares=new Chess(fen).board().flat().map(piece=>{
      const vector=Array(24).fill(0);
      if(piece){
        const key=piece.color==='w'?piece.type.toUpperCase():piece.type;
        const index=shapes.indexOf(key)*2;vector[index]=.4;vector[index+1]=-.4;
      }
      return vector;
    });
    return flipped?squares.reverse():squares;
  };
  for(const [fen,san] of [
    [new Chess().fen(),'e4'],
    ['4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1','exd5'],
    ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','O-O'],
    ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','exd6']
  ])for(const flipped of [false,true]){
    const game=new Chess(fen);game.move(san);
    assert.equal(verifyBoardPosition(image(fen,flipped),image(game.fen(),flipped),fen,game.fen(),flipped),true,san);
  }
  const before=new Chess().fen(),game=new Chess();game.move('e4');
  const wrong=game.fen().replace('4P3','4N3');
  assert.equal(verifyBoardPosition(image(before),image(wrong),before,game.fen()),false);
  assert.equal(verifyBoardPosition(image(before),image(wrong),before,game.fen(),false,{textConfirmed:true}),false);
  const marked=image(game.fen());marked[21]=Array.from({length:24},(_,i)=>i%2?.08:-.08);
  assert.equal(verifyBoardPosition(image(before),marked,before,game.fen()),false);
  assert.equal(verifyBoardPosition(image(before),marked,before,game.fen(),false,{textConfirmed:true}),true);
  assert.equal(verifyBoardPosition(image(before),image(before),before,game.fen()),false);
});

test('Stockfish approves a viable opening idea and rejects development that misses a hanging queen',async()=>{
  const italian=new Chess();italian.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  const offBook=new Chess();offBook.loadPgn('1. e4 a6');
  const result=await coachPosition(offBook.fen(),italian.history({verbose:true}));
  assert.equal(result?.move.san,'d4');
  assert.match(result.reason,/controls c5 and e5/);
  const dev=new Chess();dev.loadPgn('1. Nf3 Nc6 2. Nc3 Nf6');
  assert.equal(await coachPosition('8/7k/8/8/8/8/r7/QN5K w - - 0 1',dev.history({verbose:true})),null);
});
test('Coach prefers a well-tested common opening move over less played options',async()=>{
  const line=new Chess();line.loadPgn('1. e4 e5 2. Nf3 Nc6');
  const result=await coachPosition(new Chess().fen(),line.history({verbose:true}),{
    online:[{uci:'a2a3',count:900},{uci:'d2d4',count:200},{uci:'e2e4',count:40}]
  });
  assert.equal(result?.move.san,'d4');
  assert.equal(result.basis,'master games');
  assert.equal(result.frequency,200);
});
test('Coach gives legal position plans for the off-book Black position and later moves',async()=>{
  const game=new Chess();game.loadPgn('1. Nc3 d5 2. Nf3 e5 3. Nxe5 d4 4. Nb5 c6 5. Na3 f5 6. e3');
  const result=await coachPosition(game.fen(),[],{fallback:true});
  assert.equal(result.fallback,true);
  assert.equal(result.alternatives.length,3);
  assert.equal(new Set(result.alternatives.map(plan=>plan.move.from+plan.move.to)).size,3);
  for(const plan of result.alternatives){
    assert.equal(plan.move.before,game.fen());
    assert.equal(new Chess(game.fen()).move(plan.move.san).after,plan.move.after);
    assert.ok(plan.reason.length>20);
    assert.ok(plan.depth>=7);
  }
  const later=game.fen().replace(/ 6$/,' 20');
  assert.ok((await coachPosition(later,[],{fallback:true})).move);
  assert.equal(await coachPosition('7k/6Q1/6K1/8/8/8/8/8 b - - 0 24',[],{fallback:true}),null);
});

test('the full catalog parses and indexes searchable, distinct continuations',()=>{
  const book=buildCatalog(path.join(__dirname,'../data/openings'));
  assert.equal(book.size,3815);
  assert.equal(book.positions,7864);
  assert.ok(book.search('D85 Grunfeld').some(r=>r.eco==='D85'));
  const fen=new Chess().fen();
  const continuations=book.at(fen).next;
  assert.ok(continuations.some(r=>r.next==='e4'));
  assert.equal(new Set(continuations.map(r=>r.uci)).size,continuations.length);
  const scores=Array.from({length:64},(_,i)=>i<16 || i>=48 ? .23 : .008);
  assert.equal(book.detect(scores).match.fen,fen);
});

test('online move results keep legal moves and order them by real-game count',()=>{
  const results=explorerMoves(new Chess().fen(),{moves:[
    {uci:'e2e4',white:20,draws:10,black:10},
    {uci:'d2d4',white:50,draws:20,black:30},
    {uci:'a2a5',white:150,draws:0,black:0},
    {uci:'c2c4',white:-1,draws:0,black:0}
  ]});
  assert.deepEqual(results.map(row=>[row.san,row.total]),[['d4',100],['e4',40]]);
});

test('each trap and defense replays legally and the defense avoids the tactic',()=>{
  for(const trap of traps){
    const paths=trap.lines.map(line=>{const c=new Chess();c.loadPgn(line.pgn,{strict:true});return c;});
    assert.ok(paths[0].isCheckmate() || trap.name==='Elephant Trap');
    assert.equal(paths[1].isCheckmate(),false);
    assert.notEqual(paths[0].fen(),paths[1].fen());
  }
});

test('auto-find locates a chessboard and rejects an off-board stripe pattern',()=>{
  const size=40, left=53, top=34;
  const image=(x,y)=>{
    if(x<left || x>=left+size*8 || y<top || y>=top+size*8)return [35,37,40];
    const dx=x-left,dy=y-top;
    if(dy<80 && dx%size>10 && dx%size<30 && dy%size>9 && dy%size<31)return [15,15,15];
    return ((Math.floor(dx/size)+Math.floor(dy/size))%2) ? [105,150,90] : [231,220,203];
  };
  assert.deepEqual(detectBoards(440,410,image),[{x:left,y:top,size:320,height:320}]);
  const highlighted=(x,y)=>x>=left && x<left+size && [2,3].includes(Math.floor((y-top)/size))?[245,228,130]:image(x,y);
  assert.deepEqual(detectBoards(440,410,highlighted),[{x:left,y:top,size:320,height:320}]);
  const stretched=(x,y)=>image(x,Math.floor(y/1.25));
  const detected=detectBoards(440,513,stretched,1.25);
  assert.equal(detected.length,1);
  assert.equal(detected[0].size,320);
  assert.equal(detected[0].height,400);
  assert.deepEqual(detectBoards(440,410,(x,y)=>image(x,top)),[]);
});

test('calibration keeps the preferred shared line and rejects indistinguishable positions',()=>{
  const fen=new Chess().fen();
  const scores=Array.from({length:64},(_,i)=>i<16 || i>=48 ? .23 : .008);
  const line={id:'first',initial:fen,moves:[]};
  assert.equal(findVisiblePosition(scores,[line,{...line,id:'preferred'}],'preferred').match.line.id,'preferred');
  assert.deepEqual(findVisiblePosition(scores,[line,{...line,initial:fen.replace(' w ',' b ')}]),{ambiguous:true});
  assert.deepEqual(findVisiblePosition(scores.map(()=>0),[line]),{ambiguous:false});
});
const { squareToCell, cellToSquare, changedSquares, inferMove, gamePositions } = require('../src/core.cjs');
test('coordinates round trip in both board orientations',()=>{
  for(const flipped of [false,true])for(let y=0;y<8;y++)for(let x=0;x<8;x++)assert.deepEqual(squareToCell(cellToSquare(x,y,flipped),flipped),{x,y});
  assert.deepEqual(squareToCell('a1'),{x:0,y:7});
  assert.deepEqual(squareToCell('a1',true),{x:7,y:0});
});
test('infer ordinary moves and captures from visible changed squares',()=>{
  const c=new Chess();
  for(const san of ['e4','d5','exd5','Qxd5','Nc3']) {
    const before=c.fen();const move=c.move(san);
    assert.equal(inferMove(before,changedSquares(before,c.fen())).san,move.san);
  }
});
test('infer castling and en passant from all affected squares',()=>{
  for(const [fen,san,count] of [
    ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','O-O',4],
    ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','exd6',3]
  ]) {const c=new Chess(fen);c.move(san);const changed=changedSquares(fen,c.fen());assert.equal(changed.length,count);assert.equal(inferMove(fen,changed).san,san);}
});
test('reject promotions with indistinguishable square changes and noise',()=>{
  assert.equal(inferMove('4k3/P7/8/8/8/8/8/4K3 w - - 0 1',['a7','a8']),null);
  assert.equal(inferMove(new Chess().fen(),['e2','e4','a1']),null);
  assert.equal(inferMove(new Chess().fen(),[]),null);
});
test('PGN preserves headers and custom starting position',()=>{
  const game=gamePositions('[Event "Study"]\n[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 *');
  assert.equal(game.headers.Event,'Study');assert.equal(game.moves[0].san,'e4');assert.equal(game.initial.split(' ')[0],'4k3/8/8/8/8/8/4P3/4K3');
});
