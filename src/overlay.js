const svg = document.querySelector('svg');
const ns = 'http://www.w3.org/2000/svg';
function element(tag, attrs, parent = svg) { const e = document.createElementNS(ns, tag); for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,v); parent.append(e); return e; }
function cell(sq, flipped) { const x = sq.charCodeAt(0)-97, y = Number(sq[1])-1; return flipped ? [7-x,y] : [x,7-y]; }
let previous;
window.lens.onPaint(data => {
  const key=JSON.stringify(data);
  if(key===previous)return;
  previous=key;
  svg.replaceChildren();
  if (!data.visible) return;
  for (const sq of data.highlights || []) {
    const [x,y] = cell(sq, data.flipped);
    element('rect', { x:x*100+3, y:y*100+3, width:94, height:94, rx:12, fill:'#67e8b0', 'fill-opacity':0.27, stroke:'#67e8b0', 'stroke-width':3 });
  }
  for (const [i,arrow] of (data.arrows || []).entries()) {
    const [a,b] = [cell(arrow.from,data.flipped),cell(arrow.to,data.flipped)];
    const x1=a[0]*100+50,y1=a[1]*100+50,x2=b[0]*100+50,y2=b[1]*100+50;
    const angle=Math.atan2(y2-y1,x2-x1), endX=x2-Math.cos(angle)*22,endY=y2-Math.sin(angle)*22;
    const color=arrow.review?'#fb7185':arrow.alternative?(arrow.intent==='attack'?'#fbbf24':'#60a5fa'):arrow.idea?'#f2c879':'#67e8b0';
    const stroke={x1,y1,x2:endX,y2:endY,stroke:color,'stroke-width':i ? 9:15,'stroke-linecap':'round',opacity:0.9};
    if(arrow.review)stroke['stroke-dasharray']='16 9';
    if(arrow.idea)stroke['stroke-dasharray']='9 10';
    stroke['data-kind']=arrow.review?'review':arrow.alternative?'alternative':arrow.idea?'idea':'move';
    element('line',stroke);
    const points=[[x2,y2],[x2-Math.cos(angle-0.5)*40,y2-Math.sin(angle-0.5)*40],[x2-Math.cos(angle+0.5)*40,y2-Math.sin(angle+0.5)*40]];
    element('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:color,opacity:0.95});
  }
  if(data.bubble){
    const font=Math.max(17,12*800/window.innerWidth);
    const foreign=element('foreignObject',{width:320,height:300,'data-kind':'bubble'});
    const box=document.createElementNS('http://www.w3.org/1999/xhtml','div');
    box.className='move-bubble';box.style.fontSize=font+'px';box.textContent=data.bubble.text;
    foreign.append(box);
    let placement;
    for(const width of [320,260,220]){
      foreign.setAttribute('width',width);
      const height=Math.ceil(box.getBoundingClientRect().height*800/window.innerHeight)+4;
      placement=bubblePosition(data.bubble,data.occupied || [],data.flipped,width,height);
      if(placement)break;
    }
    if(!placement){foreign.remove();return;}
    for(const [key,value] of Object.entries(placement))if(key!=='score')foreign.setAttribute(key,value);
  }
});
