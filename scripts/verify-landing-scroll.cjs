const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const file = 'lib/landing-scroll.ts';
assert.ok(fs.existsSync(file), 'Landing scroll must safely map native scrolling to the pinned tour');
const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleScope={exports:{}};
new Function('module','exports',source)(moduleScope,moduleScope.exports);
const {tourPosition,tourScrollTarget}=moduleScope.exports;
assert.deepEqual(tourPosition(-100,6000,6),{progress:0,index:0});
assert.deepEqual(tourPosition(9000,6000,6),{progress:1,index:5});
assert.deepEqual(tourPosition(3000,6000,6),{progress:.5,index:3});
assert.deepEqual(tourPosition(3000,0,6),{progress:0,index:0});
assert.equal(tourScrollTarget(5,100,6000,6),6100);
assert.equal(tourScrollTarget(-1,100,6000,6),100);
assert.equal(tourScrollTarget(2,100,3000,6),1300);
console.log('Landing scroll bounds and resized navigation: passed');
const {tourBlend}=moduleScope.exports;
for(let i=0;i<=100;i++){
 const weights=tourBlend(i/100,6);
 assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-8,'Every transition must retain a visible scene');
 assert.ok(weights.every(w=>w>=0&&w<=1));
}
assert.deepEqual(tourBlend(0,6),[1,0,0,0,0,0]);
assert.deepEqual(tourBlend(1,6),[0,0,0,0,0,1]);
assert.ok(Math.abs(tourBlend(.1,6)[0]-.5)<1e-8);
console.log('Reversible scene blends: passed');
const {tourCamera}=moduleScope.exports;
assert.deepEqual(tourCamera(-1,6),tourCamera(0,6));
assert.deepEqual(tourCamera(2,6),tourCamera(1,6));
assert.ok(tourCamera(.1,6).scale>tourCamera(0,6).scale+.1,'Scene boundary must create a visible lens zoom');
for(let i=0;i<=1000;i++){
 const pose=tourCamera(i/1000,6);
 assert.ok(pose.scale>=1.04&&pose.scale<=1.16+1e-12,'Lens zoom stays within safe overscan');
 assert.ok(Math.abs(pose.x)<=1.1&&Math.abs(pose.yaw)<=1.5,'Camera orbit stays restrained');
 if(i){const previous=tourCamera((i-1)/1000,6);assert.ok(Math.abs(pose.scale-previous.scale)<.003,'Lens pose has no discontinuity at scene boundaries');}
}
assert.equal(tourCamera(.4,1).scale,1.04);
console.log('Camera zoom boundaries and continuous reversible poses: passed');
const {tourTextPose}=moduleScope.exports;
for(let scene=0;scene<6;scene++){
 assert.equal(tourTextPose(scene/5,scene,6).opacity,1,'Every resting scene has fully readable text');
 for(let step=0;step<=100;step++){
  const pose=tourTextPose(step/100,scene,6,7);
  assert.ok(pose.opacity>=0&&pose.opacity<=1);
  assert.ok(pose.y>=-16&&pose.y<=20);
 }
}
assert.equal(tourTextPose(.1,0,6).opacity,0,'Outgoing copy finishes before the next scene');
assert.equal(tourTextPose(.1,1,6).opacity,0,'Incoming copy begins at the same boundary');
assert.ok(tourTextPose(.08,0,6).opacity>0&&tourTextPose(.08,0,6).y<0,'Copy animates upward on exit');
assert.ok(tourTextPose(.12,1,6).opacity>0&&tourTextPose(.12,1,6).y>0,'Copy animates upward on entrance');
assert.ok(tourTextPose(.14,1,6,7).opacity<tourTextPose(.14,1,6,0).opacity,'Text elements enter with a stagger');
assert.deepEqual(tourTextPose(.4,0,1),{opacity:1,y:0});
console.log('Scene text entrance, exit, stagger and resting visibility: passed');
