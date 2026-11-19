const traps=[
  {name:'Légal’s Mate', idea:'Taking the queen lets White mate with the bishop and knights. Black can trade the pinning bishop for the knight earlier to avoid the setup.', lines:[
    {name:'Take the bait',pgn:'1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. h3 Bh5 6. Nxe5 Bxd1 7. Bxf7+ Ke7 8. Nd5#'},
    {name:'Avoid the setup',pgn:'1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. h3 Bxf3 6. Qxf3'}
  ]},
  {name:'Blackburne Shilling Trap', idea:'The grab on e5 allows a queen fork on g5 and a mating net. White can keep developing and castle instead. Black’s trap setup is risky against careful play.',lines:[
    {name:'Take the bait',pgn:'1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#'},
    {name:'Keep developing',pgn:'1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. O-O'}
  ]},
  {name:'Elephant Trap',idea:'The d5 pawn looks free because the knight appears pinned. Black can give up the queen temporarily and win it back with a bishop check. White can develop e3 instead.',lines:[
    {name:'Take the bait',pgn:'1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5 6. Nxd5 Nxd5 7. Bxd8 Bb4+ 8. Qd2 Bxd2+ 9. Kxd2 Kxd8'},
    {name:'Keep developing',pgn:'1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5 6. e3'}
  ]},
  {name:'Scholar’s Mate',idea:'The queen and bishop both target f7. Black can block the queen’s diagonal with g6 after first protecting e5.',lines:[
    {name:'Miss the threat',pgn:'1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#'},
    {name:'Block the threat',pgn:'1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6'}
  ]}
];
if(typeof module!=='undefined')module.exports=traps;
