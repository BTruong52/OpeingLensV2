// Reconstruct a two-column move table from OCR word positions.
// A numbered row grid keeps a damaged row number from shifting all later moves.
function moveGridText(words,width,fromNumber=0){
  const anchors=words.filter(word=>word.bbox.x0<width*.09 && /^\d{1,3}[.)]?$/.test(word.text.trim()))
    .map(word=>({number:parseInt(word.text,10),y:(word.bbox.y0+word.bbox.y1)/2}))
    .sort((a,b)=>a.y-b.y);
  let best=[];
  let pitch=0,origin=0;
  for(let i=1;i<anchors.length;i++){
    const a=anchors[i-1],b=anchors[i],distance=b.number-a.number;
    if(distance<1 || distance>4)continue;
    const step=(b.y-a.y)/distance;
    if(step<12)continue;
    const offset=a.y-a.number*step;
    const matching=anchors.filter(point=>Math.abs(point.y-(offset+point.number*step))<step*.2);
    if(matching.length>best.length){best=matching;pitch=step;origin=offset;}
  }
  // Sparse panels still have useful spatial information. Two rows establish
  // a grid; a single row can be read without inventing any missing rows.
  if(best.length<2 && anchors.length===1){best=anchors;pitch=24;origin=anchors[0].y-anchors[0].number*pitch;}
  if(!best.length)return null;
  const first=Math.max(fromNumber,Math.min(...best.map(point=>point.number)));
  let last=Math.max(...best.map(point=>point.number));
  // Infer a damaged final row number from the established pitch, never from
  // a guessed move number alone. This matters for highlighted newest rows.
  const limit=last+3;
  for(let n=last+1;n<=limit;n++){
    const present=words.some(word=>word.bbox.x0>=width*.09 && word.bbox.x0<width*.8 &&
      Math.abs((word.bbox.y0+word.bbox.y1)/2-origin-n*pitch)<pitch*.34);
    if(!present)break;
    last=n;
  }
  if(last-first>100)return null;
  const rows=[];
  const moveWords=words.filter(word=>word.bbox.x0>=width*.09 && /^(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8][+#]?$|^[O0]-[O0]/.test(word.text.trim()));
  const positions=moveWords.map(word=>word.bbox.x0).sort((a,b)=>a-b);
  let split=width*.5,gap=0;
  for(let i=1;i<positions.length;i++){
    const distance=positions[i]-positions[i-1];
    if(distance>width*.16 && distance>gap){gap=distance;split=(positions[i]+positions[i-1])/2;}
  }
  for(let number=first;number<=last;number++){
    const row=words.filter(word=>word.bbox.x0>=width*.09 &&
      Math.abs((word.bbox.y0+word.bbox.y1)/2-(origin+number*pitch))<pitch*.34)
      .sort((a,b)=>a.bbox.x0-b.bbox.x0);
    const white=cellText(row.filter(word=>word.bbox.x0<split));
    const black=cellText(row.filter(word=>word.bbox.x0>=split));
    if(!white || (!black && number!==last))return null;
    rows.push(`${number}. ${white}${black?' '+black:''}`);
  }
  return rows.join('\n');
}

function cellText(words){
  words=words.filter(word=>!/^\(?\d+(?:[.,]\d+)?\s*s\)?$|^\(?\d{1,2}:\d{2}(?:\.\d+)?\)?$|^[!?]+$/i.test(word.text.trim()));
  const icon=words[0]?.text || '';
  const piece=/^(?:[A4](?:$|(?=[a-h])))/.test(icon)?'N':
    /^[@2]$/.test(icon)?'B':/^[wW]+/.test(icon)?'Q':'';
  let text=words.slice(0,3).filter(word=>!/^\(?\d{1,2}:\d{2}(?:\.\d+)?\)?$/.test(word.text))
    .map(word=>word.text).join('').normalize('NFD').replace(/\p{M}/gu,'')
    .replace(/[♔♚]/g,'K').replace(/[♕♛]/g,'Q').replace(/[♖♜]/g,'R')
    .replace(/[♗♝]/g,'B').replace(/[♘♞]/g,'N').replace(/([a-h])\?(?=[+#]?(?:\s|$))/g,'$1Z').replace(/[!?]/g,'')
    .replace(/[–—]/g,'-').replace(/0/g,'O')
    .replace(/([1-8])[eEsS&]+(?=[+#]?$)/,'$1');
  if(/O-O(?:-O)?/.test(text))return text.match(/O-O(?:-O)?[+#]?/)[0];
  // Preserve unclear rank letters until legal replay can resolve them.
  const notation=text.match(/(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8sSebadAiIlTZ&](?:=[QRBN])?[+#]?/);
  if(notation){
    const move=notation[0].replace(/^[1-8](?=[a-h][1-8])/,'').replace(/&(?=[+#]?$)/,'8');
    if(piece && !/^[KQRBN]/.test(move)){
      const destination=move.match(/x?[a-h][1-8sSebadAiIlTZ](?:=[QRBN])?[+#]?$/)[0];
      return piece+destination;
    }
    return move;
  }
  const rank=text.match(/[1-8]([+#]?)$/);
  return rank?'~'+rank[0]:null;
}

module.exports={moveGridText};
