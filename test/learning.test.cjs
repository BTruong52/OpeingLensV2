const {test}=require('node:test'),assert=require('node:assert/strict');
const {OpeningLesson,quickExplanation}=require('../src/learning.js');
const {bubblePosition}=require('../src/bubble-layout.js');
test('lesson offers exactly one transition, independent of later catalog lines',()=>{
 const l=new OpeningLesson();l.reset(Array(9),true);
 assert.equal(l.update('8/8/8/8/8/8/8/8 w - - 0 5'),'opening');
 assert.equal(l.update('8/8/8/8/8/8/8/8 b - - 0 5'),'transition');
 l.offer('8/8/8/8/8/8/8/8 w - - 0 6');
 assert.equal(l.update('8/8/8/8/8/8/8/8 w - - 0 6'),'transition');
 assert.equal(l.update('8/8/8/8/8/8/8/8 b - - 0 6'),'complete');
 assert.equal(l.update('8/8/8/8/8/8/8/8 w - - 0 30'),'complete');
 l.reset(Array(1),false);assert.equal(l.endPly,12);
});
test('bubble stays on the board and avoids pieces in either orientation',()=>{
 const occupied=['a1','b1','c1','d1','e1','f1','g1','h1','a2','b2','c2','d2','e2','f2','g2','h2','a7','b7','c7','d7','e7','f7','g7','h7','a8','b8','c8','d8','e8','f8','g8','h8'];
 for(const flip of [false,true]){const p=bubblePosition({from:'e2',to:'e4'},occupied,flip,300,100);assert.ok(p);assert.ok(p.x>=0 && p.y>=0 && p.x+p.width<=800 && p.y+p.height<=800);}
 assert.equal(bubblePosition({from:'e2',to:'e4'},Array.from({length:64},(_,i)=>String.fromCharCode(97+i%8)+(1+Math.floor(i/8))),false,300,100),null);
 assert.match(quickExplanation({san:'c3'},'Blocks the check.',{san:'Nf3',reason:'Nf3 leaves your king in check.'}),/Nf3 would leave your king in check/);
});
