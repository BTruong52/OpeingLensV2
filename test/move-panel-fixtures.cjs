const assert=require('node:assert/strict');
const path=require('node:path');
const {Chess}=require('chess.js');
const {readMoveImage}=require('../src/move-ocr.cjs');
const {findVisiblePosition}=require('../src/book.js');
const {changedMoveRows}=require('../src/move-panel-crop.cjs');
const {changedCells,changedPieceCells,verifyBoardPosition}=require('../src/vision.js');

const gamePgn='1. Nc3 d5 2. d4 e5 3. dxe5 Be6 4. Nf3 Nc6 5. e4 Bd6 6. exd6 Rc8 7. exd5 Qe7 8. dxe7 Kxe7 9. dxe6 Kxe6 10. Bc4+ Ke7 11. Qd5 Nf6 12. Qxf7+ Kd6 13. Bf4+ Kc5 14. Na4+ Kb4 15. Nc3 Rhe8+ 16. Be3 Ne5 17. Nxe5 Rxe5 18. O-O-O Ne4 19. Qxg7 Nxc3 20. bxc3+ Kxc3 21. Bb5 Kb4 22. Qxe5 Ka5 23. Bd7+ Ka6 24. Qb5#';

module.exports=async({nativeImage,darkPanelVariant,scoreBoard,fingerprintBoard,matchCapture})=>{
  const game=new Chess();game.loadPgn(gamePgn);
  const history=game.history({verbose:true});
  for(const [file,anchor,end] of [
    ['full-history.png',null,30],
    ['scrolled-history.png',history[17].after,47]
  ]){
    const image=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels',file));
    const result=await readMoveImage(image.resize({width:image.getSize().width*2,quality:'best'}).toPNG(),
      image.toPNG(),anchor,darkPanelVariant(image));
    const expected=history[end-1].after;
    const board=new Chess(expected);
    const scores=board.board().flat().map(piece=>piece?.type?0.15:0);
    const detected=findVisiblePosition(scores,result.candidates || [result]);
    assert.ok(detected.match,`${file} must match the board unambiguously`);
    assert.equal(detected.match.fen,expected,file);
    assert.equal(detected.match.index,detected.match.line.moves.length,file);
    if(end===47)assert.equal(new Chess(detected.match.fen).isCheckmate(),true);
  }
  const captured=new Chess();
  captured.loadPgn('1. Nf3 d5 2. Nc3 e5 3. Nxe5 d4 4. Nb5 c6 5. Na3 f5 6. e3 Nd7 7. exd4 f4 8. Qh5+ g6 9. Nxg6 hxg6 10. Qxh8');
  const panel=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/queen-capture.png'));
  const result=await readMoveImage(panel.resize({width:1240,quality:'best'}).toPNG(),panel.toPNG(),null,darkPanelVariant(panel));
  const board=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/queen-capture-board.png'));
  const scores=await scoreBoard(board.toDataURL());
  const detected=findVisiblePosition([...scores].reverse(),result.candidates);
  assert.ok(detected.match,'Queen capture screenshot must match the actual Black-oriented board');
  assert.equal(detected.match.fen,captured.fen());
  assert.equal(detected.match.line.moves.at(-1).san,'Qxh8');
  const {width,height}=panel.getSize(),pixels=panel.toBitmap();
  for(let y=365;y<393;y++)for(let x=0;x<width;x++){
    const from=(y*width+50)*4,to=(y*width+x)*4;
    for(let channel=0;channel<3;channel++)pixels[to+channel]=pixels[from+channel];
  }
  const previous=nativeImage.createFromBitmap(pixels,{width,height});
  const strip=changedMoveRows(previous,panel);
  assert.ok(strip.getSize().height<height/3,'Normal live OCR should read a short changed-row strip');
  captured.undo();
  const incremental=await readMoveImage(strip.resize({width:1240,quality:'best'}).toPNG(),strip.toPNG(),
    captured.fen(),darkPanelVariant(strip),{quick:true});
  assert.ok(incremental.candidates.some(line=>line.moves.at(-1)?.san==='Qxh8'));
  const position=new Chess();position.loadPgn('1. Nc3 d5 2. d4 Nf6 3. Nf3 e6');
  const beforeFen=position.fen();position.move('e3');
  const beforeImage=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/pawn-highlight-before.png'));
  const afterImage=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/pawn-highlight-after.png'));
  const before=await fingerprintBoard(beforeImage.toDataURL()),after=await fingerprintBoard(afterImage.toDataURL());
  assert.ok(changedCells(before,after).includes(43),'The old pixel check mistakes the e6 highlight for a move');
  assert.deepEqual(changedPieceCells(before,after),[11,19],'Only e2 and e3 changed pieces');
  assert.equal(verifyBoardPosition(before,after,beforeFen,position.fen(),true),true);
  assert.equal(verifyBoardPosition([...before].reverse(),[...after].reverse(),beforeFen,position.fen()),true);
  const wrong=after.map(square=>square.slice());wrong[19]=after[18].slice();
  assert.equal(verifyBoardPosition(before,wrong,beforeFen,position.fen(),true),false,'A knight on e3 must still fail a pawn-move check');
  const movePanel=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/pawn-highlight-panel.png'));
  const read=await readMoveImage(movePanel.resize({width:1240}).toPNG(),movePanel.toPNG(),beforeFen,darkPanelVariant(movePanel));
  assert.ok(read.candidates.some(line=>line.moves.at(-1)?.after===position.fen()));
  const knight=new Chess();knight.loadPgn('1. Nf3 d5 2. Nc3 e5');
  const knightBefore=knight.fen();knight.move('Nxe5');
  const knightPanel=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/knight-capture-panel.png'));
  const knightRead=await readMoveImage(knightPanel.resize({width:1240}).toPNG(),knightPanel.toPNG(),
    knightBefore,darkPanelVariant(knightPanel));
  const knightBoard=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/knight-capture-board.png'));
  const knightScores=await scoreBoard(knightBoard.toDataURL());
  const knightMatch=findVisiblePosition([...knightScores].reverse(),knightRead.candidates);
  assert.equal(knightMatch.match?.fen,knight.fen(),'The newest Nxe5 row must match the latest board');
  const ambiguousGame=new Chess();ambiguousGame.loadPgn('1. Nc3 d5 2. d3 Nf6 3. e4 e5 4. Nxd5 Nxd5 5. exd5');
  const ambiguousPanel=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/live-ambiguity-panel.png'));
  const ambiguousBoard=nativeImage.createFromPath(path.join(__dirname,'fixtures/move-panels/live-ambiguity-board.png'));
  const alternatives=await readMoveImage(ambiguousPanel.resize({width:1240}).toPNG(),ambiguousPanel.toPNG(),null,darkPanelVariant(ambiguousPanel));
  const observed=await fingerprintBoard(ambiguousBoard.toDataURL());
  const expectedCells=ambiguousGame.board().flat();
  const previousGame=new Chess();previousGame.loadPgn('1. Nc3 d5 2. d3');
  const previousCells=previousGame.board().flat();
  const references=previousCells.map((piece,index)=>{
    if(!piece)return Array(observed[0].length).fill(0);
    const same=expectedCells.findIndex(other=>other?.type===piece.type && other.color===piece.color);
    return observed[63-same].slice();
  }).reverse();
  const visible=alternatives.candidates.map(line=>({initial:line.moves.at(-1).after,moves:[]}));
  const observedScores=await scoreBoard(ambiguousBoard.toDataURL());
  assert.equal(findVisiblePosition([...observedScores].reverse(),visible).ambiguous,true);
  const resolved=findVisiblePosition([...observedScores].reverse(),visible,undefined,candidate=>
    verifyBoardPosition(references,observed,previousGame.fen(),candidate.fen,true,{textConfirmed:true}));
  assert.equal(resolved.match?.fen,ambiguousGame.fen(),'The pawn on d5 must resolve histories with identical occupied squares');
  assert.equal(await matchCapture({...alternatives,board:ambiguousBoard.toDataURL()}),ambiguousGame.fen(),
    'Calibration must resolve piece ambiguity using agreed-piece references from the current board');
};
