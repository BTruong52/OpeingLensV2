const path=require('node:path');
const {Chess}=require('chess.js');
const {moveGridText}=require('./move-layout.cjs');
let worker;

function splitRows(text,flexible){
  // Read sequentially numbered rows. Do not silently skip missing plies.
  let cleaned=text.normalize('NFD').replace(/\p{M}/gu,'').replace(/[♔♚]/g,'K').replace(/[♕♛]/g,'Q').replace(/[♖♜]/g,'R')
    .replace(/[♗♝]/g,'B').replace(/[♘♞]/g,'N').replace(/[!?]/g,'')
    .replace(/[–—]/g,'-').replace(/\b[0O]-[0O](?:-[0O])?\b/g,m=>m.replaceAll('0','O')).replace(/[|]/g,' ')
    .replace(/\b([a-h][1-8])\.([a-h][1-8])/g,'$1$2');
  if(flexible){
    // ChessDuels knight and queen icons can become A, 4, w or W.
    // Keep the destination so legal replay and the board can resolve the piece.
    cleaned=cleaned.replace(/^([ \t]*\d{1,3}[.)]?[ \t]+)([^\r\n]*)/gm,(_,number,cells)=>
      number+cells.replace(/(^|[ \t])(?:[A4wW]{1,3}|[@‘’'&])[ \t]*(x?[a-h][1-8sSebad][+#]?)(?=\s|$)/g,'$1$2'));
    cleaned=cleaned.replace(/([a-h][1-8])e(?=[+#]?(?:\s|$))/g,'$1');
  }
  cleaned=cleaned.replace(/^[ \t]*(\d{1,3})\.?[ \t]+([1-8])(?=[ \t]+[a-h])/gm,'$1. ~$2');
  // Compact PGN lists can put several numbered moves on one visual line.
  cleaned=cleaned.replace(/(\S)[ \t]+(?=\d{1,3}\.[ \t]*[a-hKQRBNO])/g,'$1\n');
  // OCR sometimes drops the file in a pawn move, leaving only a digit.
  const rows=[...cleaned.matchAll(/^[ \t]*(\d{1,3})(?:[.)]{1,3}[ \t]*(?=[a-hxKQRBNO~])|[ \t]+(?=(?:[KQRBN]?[a-h][a-h1-8]?x?[a-h]?[1-8][a-h1-8qrbn=+#]*|x[a-h][1-8][+#]?|O-O(?:-O)?|~[1-8])(?:\s|$)))([^\r\n]*)/gm)];
  if(!rows.length)throw Error('No numbered move rows found. Select just the move area.');
  const first=Number(rows[0][1]);
  const firstBlack=/^[ \t]*\d+\.{3}/.test(rows[0][0]);
  const moves=[];
  for(const [rowIndex,row] of rows.entries()){
    const blackOnly=/^[ \t]*\d+\.{3}/.test(row[0]);
    const ply=moves.length+(firstBlack?1:0);
    if(Number(row[1])!==first+Math.floor(ply/2) || (blackOnly && ply%2!==1) ||
      (!blackOnly && ply%2!==0))throw Error('A move number or reply was skipped. Show the full move list.');
    const tokens=row[2].trim().split(/\s+/).filter(Boolean);
    const san=tokens.filter(t=>!['1-0','0-1','1/2-1/2','*'].includes(t));
    if(san.length===1 && Number(rows[rowIndex+1]?.[1])===Number(row[1])+1){
      const joined=san[0].match(/^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8][+#]?)([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8][+#]?)$/);
      if(joined)san.splice(0,1,joined[1],joined[2]);
    }
    if(!san.length || san.length>(blackOnly?1:2) || san.some(t=>!t || t.length>10)){
      throw Error('The move text could not be read reliably. Enlarge it and select only the numbered move rows.');
    }
    moves.push(...san);
  }
  return {first,firstBlack,moves};
}
const properSan=/^(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;
const coordinates=/^[a-h][1-8][a-h][1-8][qrbn]?$/;
function parseMoveText(text){
  return parseRows(text,false)[0];
}
function parseRows(text,flexible,anchor){
  const {first,firstBlack,moves}=splitRows(text,flexible);
  if(first===1 && !anchor && !firstBlack)return replay(moves,flexible);
  if(!anchor)throw Error('The move list must show move 1 for initial calibration.');
  const board=new Chess(anchor);
  const skip=(board.moveNumber()-first)*2+(board.turn()==='b'?1:0)-(firstBlack?1:0);
  if(skip<0 || skip>moves.length)throw Error('The latest row does not connect to the last confirmed position. Show the missing rows or correct the FEN.');
  return replay(moves.slice(skip),flexible,board.fen());
}
function replay(tokens,allowUnclearRank,initial=new Chess().fen()){
  let candidates=[{initial,moves:[]}], corrected=0;
  for(const token of tokens){
    const valid=properSan.test(token)||coordinates.test(token) || (allowUnclearRank && /^x[a-h][1-8][+#]?$/.test(token));
    const fuzzy=token.match(/^([KQRBN]?)([a-h]?[1-8]?)(x?)([a-h])([A-Za-z])([+#]?)$/);
    const rankOnly=token.match(/^~([1-8])([+#]?)$/);
    const unclear=!valid && Boolean(fuzzy || rankOnly);
    if(!valid && (!allowUnclearRank || !unclear || corrected>=8)){
      throw Error('The move text could not be read reliably. Enlarge it and select only the numbered move rows.');
    }
    if(unclear)corrected++;
    candidates=candidates.flatMap(line=>{
      const board=new Chess(line.moves.at(-1)?.after || initial);
      if(unclear){
        const ranks=rankOnly?rankOnly[1]:({s:'58',S:'58',e:'68',b:'68',a:'4',d:'5'}[fuzzy[5]] || '12345678');
        const legal=board.moves({verbose:true}).filter(move=>!move.promotion && ranks.includes(move.to[1]) &&
          (rankOnly?!move.captured:move.to[0]===fuzzy[4] && Boolean(move.captured)===Boolean(fuzzy[3])) &&
          (!(rankOnly?.[2] || fuzzy?.[6]) || move.san.endsWith(rankOnly?.[2] || fuzzy[6])));
        const specified=legal.filter(move=>!fuzzy || (!fuzzy[1] || move.piece===fuzzy[1].toLowerCase()) &&
          (!fuzzy[2] || move.from.includes(fuzzy[2])));
        return (specified.length?specified:legal).map(move=>({initial,moves:[...line.moves,move]}));
      }
      try {
        const move=coordinates.test(token)?board.move({from:token.slice(0,2),to:token.slice(2,4),promotion:token[4]}):board.move(token,{strict:true});
        const choices=[move];
        // A hidden piece icon can make a legal knight move look like a
        // legal pawn move. Earlier icon moves also need alternatives when
        // calibrating after more moves have been played.
        if(allowUnclearRank && /^[a-h][1-8][+#]?$/.test(token)){
          const before=new Chess(move.before);
          choices.push(...before.moves({verbose:true}).filter(other=>other.to===token.slice(0,2) && other.piece!=='p' && !other.captured &&
            other.san!==move.san && (!/[+#]$/.test(token) || other.san.endsWith(token.at(-1)))));
        }
        return choices.map(choice=>({initial,moves:[...line.moves,choice]}));
      }catch {
        // Some panels draw the piece as an icon. A destination without its
        // icon may still be identifiable, but the board must confirm it.
        if(!allowUnclearRank)return [];
        const hint=token.replace(/^[KQRBN]/,'').match(/^([a-h]?[1-8]?)(x?)([a-h][1-8])([+#]?)$/);
        if(!hint)return [];
        const legal=board.moves({verbose:true}).filter(move=>move.to===hint[3] && Boolean(move.captured)===Boolean(hint[2]) &&
          !move.promotion && (!hint[4] || move.san.endsWith(hint[4])));
        const specified=legal.filter(move=>!hint[1] || move.from.includes(hint[1]));
        return (specified.length?specified:legal).map(move=>({initial,moves:[...line.moves,move]}));
      }
    });
    if(candidates.length>128)throw Error('Too many interpretations of the move text. Enlarge the panel or use a confirmed position.');
    if(!candidates.length)throw Error('The captured text does not form a legal move list. Enlarge the moves or check the crop.');
  }
  return candidates.map(line=>({...line,correctedRank:corrected>0}));
}

async function getWorker(){
  if(!worker){
    const {createWorker,PSM}=require('tesseract.js');
    worker=createWorker('eng',1,{langPath:path.join(__dirname,'..','data','ocr'),gzip:false,cacheMethod:'none'})
      .then(async engine=>{
        await engine.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,preserve_interword_spaces:'1'});
        return engine;
      }).catch(error=>{worker=null;throw error;});
  }
  return worker;
}
async function findMovesHeading(png){
  const {PSM}=require('tesseract.js');
  const engine=await getWorker();
  try {
    await engine.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
    const {data}=await engine.recognize(png,{}, {blocks:true});
    return (data.blocks||[]).flatMap(block=>block.paragraphs.flatMap(p=>p.lines.flatMap(line=>line.words)))
      .filter(word=>/^moves:?$/i.test(word.text.trim())).map(word=>word.bbox);
  } finally {
    await engine.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK});
  }
}
async function readMoveImage(png,original,anchor,contrast,{quick=false,onPass}={}){
  const engine=await getWorker();
  const candidates=new Map();
  let failed;
  let sawEmptyPanel=false, sawText=false, sawNumberedRow=false;
  for(const [variant,image] of [['contrast',contrast],['scaled',png],['original',original]].filter(([,image])=>image)){
    const started=performance.now();
    const {data}=await engine.recognize(image,{}, {blocks:true});
    const words=(data.blocks || []).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines.flatMap(line=>line.words)));
    const bytes=Buffer.from(image);
    const width=bytes.length>24 && bytes.toString('ascii',1,4)==='PNG'?bytes.readUInt32BE(16):0;
    const grid=width?moveGridText(words,width):null;
    const trace=onPass?{variant,text:data.text,grid,confidence:data.confidence,width,
      height:width?bytes.readUInt32BE(20):0,words:words.map(word=>({text:word.text,confidence:word.confidence,bbox:word.bbox})),parses:[]}:null;
    sawText ||= /[A-Za-z0-9]/.test(data.text);
    sawEmptyPanel ||= /\bMoves\b|\bStarting Position\b/i.test(data.text);
    sawNumberedRow ||= /^\s*\d{1,3}[.)]?\s+\S/m.test(data.text);
    // Retain a full-history interpretation when move 1 is visible. A stale
    // tracking anchor must not prevent the board from confirming that history.
    for(const text of [grid,data.text].filter(Boolean))for(const start of anchor?[anchor,null]:[null]){
      try{
        const lines=parseRows(text,true,start);
        trace?.parses.push({source:text===grid?'spatial grid':'raw text',anchor:start || 'starting position',
          candidates:lines.length,lines:lines.slice(0,12).map(line=>({moves:line.moves.map(move=>move.san).join(' '),fen:line.moves.at(-1)?.after || line.initial}))});
        for(const line of lines)candidates.set(line.initial+'|'+line.moves.map(move=>move.san).join(' '),line);
        if(!anchor && !original && !contrast && lines.length===1 && !lines[0].correctedRank){
          if(trace)onPass({...trace,elapsedMs:performance.now()-started});
          return lines[0];
        }
      }catch(error){
        failed=error;
        trace?.parses.push({source:text===grid?'spatial grid':'raw text',anchor:start || 'starting position',error:error.message});
      }
    }
    if(trace)onPass({...trace,elapsedMs:performance.now()-started});
    if(quick && [...candidates.values()].some(line=>line.moves.length))break;
  }
  if(!candidates.size){
    // The renderer separately checks the chessboard before trusting this.
    if(!sawNumberedRow && (sawEmptyPanel || !sawText))return {waiting:true};
    throw failed || Error('No move text was found.');
  }
  const lines=[...candidates.values()];
  return {...lines[0],candidates:lines};
}
module.exports={parseMoveText,parseRows,readMoveImage,findMovesHeading};
