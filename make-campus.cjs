// Original vector artwork. Coordinates form a small imaginary voxel campus.
const fs=require('node:fs');
const path=require('node:path');
let pieces=[];
const point=(x,y,z=0)=>[460+(x-y)*26,170+(x+y)*13-z*26];
const polygon=(points,fill,extra='')=>pieces.push(`<polygon points="${points.map(p=>p.map(n=>+n.toFixed(2)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`);
const plane=(coords,color,extra='')=>polygon(coords.map(p=>point(...p)),color,extra);
function block(x,y,z,w,d,h,top='#a9d17e',left='#79a75c',right='#59854b'){
  plane([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],left);
  plane([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],right);
  plane([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],top);
}
function tree(x,y,size=1){
  block(x+.1,y+.1,0,.25,.25,1.4*size,'#9e8152','#967342','#6d5937');
  block(x-.45*size,y-.45*size,1.1*size,1.4*size,1.4*size,.7*size,'#95bd4c','#739f42','#507d38');
  block(x-.3*size,y-.3*size,1.8*size,1.05*size,1.05*size,.65*size,'#abd461','#80ad48','#608c3b');
  block(x-.13*size,y-.13*size,2.45*size,.7*size,.7*size,.3*size,'#bedb7d','#91b552','#6e9948');
}
function person(x,y,color='#f4e8ca'){
  block(x,y,.04,.12,.15,.32,'#254d43','#315546','#1e3b36');
  block(x+.2,y,.04,.12,.15,.32,'#254d43','#315546','#1e3b36');
  block(x-.04,y-.02,.32,.42,.22,.42,color,color,'#a9b6a0');
  block(x+.05,y-.01,.74,.24,.23,.24,'#edc7a1','#ddb18d','#bc8f6c');
  block(x+.03,y-.03,.96,.28,.27,.11,'#37483b','#293b30','#20342c');
}
function cloud(x,y,s=1){
  pieces.push(`<g transform="translate(${x} ${y}) scale(${s})" fill="#fffef2"><path d="M0 16h15V4h29V-7h29V3h22v15h23v19H0z"/><path d="M0 37h118v6H0z" fill="#dce5cf"/></g>`);
}
pieces.push('<svg xmlns="http://www.w3.org/2000/svg" width="920" height="780" viewBox="0 0 920 780"><title>Sekolah pixel Amanah</title><desc>Ilustrasi sekolah imajinatif isometrik: sekolah hijau, pepohonan, lapangan olahraga, dan siswa.</desc>');
cloud(136,125,.8);cloud(657,96,.65);cloud(710,254,.4);
pieces.push('<g transform="translate(0 35)">');
// Stepped earth island, grass and a tiled pedestrian cross.
block(-.2,-.2,-1.15,16.4,14.4,.55,'#a79163','#9b8053','#806d46');
block(-.2,-.2,-.6,16.4,14.4,.4,'#b8ca82','#91a76a','#718b55');
block(0,0,-.2,16,14,.25,'#accb7c','#7eaa59','#62934f');
for(let x=.5;x<16;x+=1.2)for(let y=.5;y<14;y+=1.2){
  if(((Math.round(x*10)+Math.round(y*10))%7)<2)plane([[x,y,.06],[x+.5,y,.06],[x+.5,y+.45,.06],[x,y+.45,.06]],'#b7d58b');
}
block(7.6,.2,.06,1.5,13.5,.035,'#eadfc1','#d2c6a3','#c3b68e');
block(.4,8.2,.06,15.2,1.4,.035,'#eadfc1','#d2c6a3','#c3b68e');
for(let i=0;i<14;i++)plane([[7.65,i,.101],[9.05,i,.101],[9.05,i+.03,.101],[7.65,i+.03,.101]],'#d4c8aa');
for(let i=1;i<16;i++)plane([[i,8.25,.101],[i+.025,8.25,.101],[i+.025,9.55,.101],[i,9.55,.101]],'#d4c8aa');
// Back trees are drawn before the main school for correct occlusion.
tree(1.2,1.2,1.1);tree(3.3,.6,.9);tree(13.7,1.5,1.15);tree(15,3.8,.9);
// Main academic building: cream facade, green piers and stepped roof.
block(4.5,2,.08,7.1,3.8,.2,'#ddd9bb','#cacbb0','#aeb99c');
block(4.7,2.15,.28,6.7,3.4,3.65,'#fff0cf','#f3e9ca','#d5d9b7');
block(4.65,2.1,2.05,6.8,3.5,.12,'#6b9975','#6c9873','#47785b');
for(let x=5;x<11.3;x+=1.08){
  for(const z of [.7,2.5]){
    plane([[x,5.56,z],[x+.7,5.56,z],[x+.7,5.56,z+.95],[x,5.56,z+.95]],'#3c6960');
    plane([[x+.06,5.565,z+.1],[x+.32,5.565,z+.1],[x+.32,5.565,z+.85],[x+.06,5.565,z+.85]],'#a7d2bf');
    plane([[x+.38,5.565,z+.1],[x+.63,5.565,z+.1],[x+.63,5.565,z+.85],[x+.38,5.565,z+.85]],'#79b5a5');
  }
}
for(let y=2.5;y<5.3;y+=.9){for(const z of [.7,2.5]){
  plane([[11.405,y,z],[11.405,y+.58,z],[11.405,y+.58,z+.9],[11.405,y,z+.9]],'#345e51');
  plane([[11.41,y+.07,z+.1],[11.41,y+.47,z+.1],[11.41,y+.47,z+.78],[11.41,y+.07,z+.78]],'#8db9a1');
}}
block(4.5,2,3.93,7.1,3.8,.24,'#3c7959','#276144','#1c513b');
block(4.85,2.35,4.17,6.4,3.1,.3,'#528c64','#3a754f','#255b41');
block(5.2,2.7,4.47,5.7,2.4,.3,'#629a69','#478257','#326b48');
block(5.55,3.05,4.77,5,1.7,.25,'#78aa76','#58915f','#3e7750');
block(5.9,3.4,5.02,4.3,1,.25,'#89b681','#6ba36c','#4e8959');
// Entrance portico with block steps and pixel lettering.
block(7.15,5.45,.05,2.2,1.5,.18,'#eee8cd','#cbcbb0','#b3b89a');
block(7.3,5.45,.23,1.9,1.12,.18,'#f6edd3','#d5d2b5','#b9bfa0');
block(7.45,5.5,.4,.2,.75,1.65,'#eff0d5','#f2ecd0','#c0d0ae');
block(8.8,5.5,.4,.2,.75,1.65,'#eff0d5','#f2ecd0','#c0d0ae');
block(7.2,5.3,2.05,2.15,1.2,.25,'#589165','#326c4c','#24573e');
plane([[7.75,5.57,.45],[8.6,5.57,.45],[8.6,5.57,1.9],[7.75,5.57,1.9]],'#325b48');
let sign=point(7.95,5.61,3.62);
pieces.push(`<text x="${sign[0]}" y="${sign[1]}" fill="#31583d" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" transform="rotate(26.565 ${sign[0]} ${sign[1]})">AMANAH</text>`);
// Small learning pavilion on the left.
block(1.1,5,.05,3.5,2.35,.18,'#dfdbbd','#c2c6a4','#abb492');
block(1.3,5.2,.23,3.1,1.95,1.8,'#e9eccb','#e8e5bf','#c5d1a5');
for(let x=1.6;x<4.3;x+=.85)plane([[x,7.16,.6],[x+.55,7.16,.6],[x+.55,7.16,1.55],[x,7.16,1.55]],'#639c80');
block(1.1,5,2.03,3.5,2.35,.25,'#779b4a','#5a803e','#406735');
block(1.45,5.35,2.28,2.8,1.65,.3,'#90b05b','#719849','#547d3a');
block(1.8,5.7,2.58,2.1,.95,.25,'#a6c875','#87ac5a','#6a9247');
// Sports court on the right, with court markings drawn on its top plane.
block(10.3,7,.08,4.8,5,.1,'#d4dbc0','#9fb280','#8fa371');
block(10.55,7.25,.18,4.3,4.5,.025,'#558c71','#558c71','#558c71');
const mark=(coords)=>plane(coords.map(p=>[p[0],p[1],.215]),'none','stroke="#dfe9cf" stroke-width="1.5"');
mark([[10.8,7.5],[14.6,7.5],[14.6,11.5],[10.8,11.5]]);
mark([[10.8,9.5],[14.6,9.5]]);
mark([[11.75,7.5],[11.75,8.25],[13.65,8.25],[13.65,7.5]]);
mark([[11.75,11.5],[11.75,10.75],[13.65,10.75],[13.65,11.5]]);
let circle=[];for(let i=0;i<=32;i++){let a=i*Math.PI/16;circle.push([12.7+Math.cos(a)*.6,9.5+Math.sin(a)*.6,.215]);}plane(circle,'none','stroke="#dfe9cf" stroke-width="1.3"');
for(const y of [7.45,11.55]){
 block(11.9,y,.2,.08,.08,.6,'#f4f2dc','#e5e8d0','#c4d2b9');block(13.4,y,.2,.08,.08,.6,'#f4f2dc','#e5e8d0','#c4d2b9');block(11.9,y,.8,1.58,.08,.08,'#f4f2dc','#e5e8d0','#c4d2b9');
}
person(11.8,8.5,'#f0d55c');person(13.3,10.2,'#eee6cb');block(12.4,9.2,.22,.13,.13,.13,'#fff5d4','#ddd4b7','#c6c2ad');
// Garden, benches, schoolyard and flagpole.
block(1.5,10,.1,3.6,2.5,.13,'#94b867','#70924b','#56763e');
block(1.75,10.2,.23,3.1,2.05,.08,'#a8c779','#83a85c','#6f934c');
tree(2.2,10.5,.85);tree(4.1,11.2,.7);
for(let x=1.9;x<5;x+=.45){block(x,12.1,.3,.15,.15,.16,'#f5dc8c','#e4c96e','#bba752');}
block(5.2,10.4,.1,.2,.8,.45,'#8f7348','#795c38','#634c30');block(6.4,10.4,.1,.2,.8,.45,'#8f7348','#795c38','#634c30');block(5.1,10.3,.55,1.6,1,.12,'#c5a06b','#ab8553','#8f6f44');
block(6.3,7.1,.1,.65,.65,.18,'#eee8ce','#ccc9ad','#aeb69a');block(6.56,7.36,.28,.1,.1,4.3,'#f6f3de','#d4dbc5','#b3c4ac');
plane([[6.65,7.36,4.5],[7.85,7.36,4.5],[7.85,7.36,4.1],[6.65,7.36,4.1]],'#d96150');
plane([[6.65,7.36,4.1],[7.85,7.36,4.1],[7.85,7.36,3.7],[6.65,7.36,3.7]],'#fff6dd');
person(7.8,7.2,'#f0e8ce');person(8.4,9.9,'#d8b96b');person(9.1,12,'#dbe6c0');person(6.8,9,'#e0bb8d');
tree(.5,8.5,.8);tree(1,12.6,1);tree(14.8,12.6,1.1);tree(11.5,13.1,.8);
// Short white boundary fence, interrupted at the entry path.
for(let x=.3;x<16;x+=.65){if(x>7.2&&x<9.6)continue;block(x,13.6,.1,.13,.13,.6,'#fff0cf','#e4dfbd','#bdc9a7');}
for(const [x,w] of [[.3,6.8],[9.7,5.6]])block(x,13.61,.4,w,.08,.12,'#e8e8c8','#e8e8c8','#bdc9a7');
// Front entry stepping stones.
block(7.7,14.05,-.3,1.25,.55,.35,'#dfd8b9','#beb594','#a39c7b');
block(7.7,14.6,-.6,1.25,.5,.35,'#dfd8b9','#beb594','#a39c7b');
pieces.push('</g>');
pieces.push('</svg>');
fs.writeFileSync(path.join(__dirname,'assets/campus.svg'),pieces.join('\n'));
console.log('Created original isometric campus SVG.');
