// Reconstruct a two-column move table from OCR word positions.
// A numbered row grid keeps a damaged row number from shifting all later moves.
function moveGridText(words,width){
  const anchors=words.filter(word=>word.bbox.x0<width*.12 && /^\d{1,3}[.)]?$/.test(word.text.trim()))
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
  if(best.length<3)return null;
  const first=Math.min(...best.map(point=>point.number)),last=Math.max(...best.map(point=>point.number));
  if(last-first>100)return null;
  const rows=[];
  for(let number=first;number<=last;number++){
    const row=words.filter(word=>word.bbox.x0>=width*.12 &&
      Math.abs((word.bbox.y0+word.bbox.y1)/2-(origin+number*pitch))<pitch*.34)
      .sort((a,b)=>a.bbox.x0-b.bbox.x0);
    const white=cellText(row.filter(word=>word.bbox.x0<width*.5));
    const black=cellText(row.filter(word=>word.bbox.x0>=width*.5));
    if(!white || (!black && number!==last))return null;
    rows.push(`${number}. ${white}${black?' '+black:''}`);
  }
  return rows.join('\n');
}

function cellText(words){
  const icon=words[0]?.text || '';
  const piece=/^(?:[A4](?:$|(?=[a-h])))/.test(icon)?'N':
    /^[@2]$/.test(icon)?'B':/^[wW]+/.test(icon)?'Q':'';
  let text=words.filter(word=>!/^\(?\d{1,2}:\d{2}(?:\.\d+)?\)?$/.test(word.text))
    .map(word=>word.text).join('').normalize('NFD').replace(/\p{M}/gu,'')
    .replace(/[♔♚]/g,'K').replace(/[♕♛]/g,'Q').replace(/[♖♜]/g,'R')
    .replace(/[♗♝]/g,'B').replace(/[♘♞]/g,'N').replace(/[!?]/g,'')
    .replace(/[–—]/g,'-').replace(/0/g,'O');
  if(/O-O(?:-O)?/.test(text))return text.match(/O-O(?:-O)?[+#]?/)[0];
  // Preserve unclear rank letters until legal replay can resolve them.
  const notation=text.match(/(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8sSebad](?:=[QRBN])?[+#]?$/);
  if(notation){
    const move=notation[0].replace(/^[1-8](?=[a-h][1-8])/,'');
    if(piece && !/^[KQRBN]/.test(move)){
      const destination=move.match(/x?[a-h][1-8sSebad](?:=[QRBN])?[+#]?$/)[0];
      return piece+destination;
    }
    return move;
  }
  const rank=text.match(/[1-8]([+#]?)$/);
  return rank?'~'+rank[0]:null;
}

module.exports={moveGridText};
