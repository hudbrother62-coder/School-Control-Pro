const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const file = 'lib/landing-scroll.ts';
assert.ok(fs.existsSync(file), 'Landing camera path must support native continuous scrolling');
const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleScope={exports:{}};
new Function('module','exports',source)(moduleScope,moduleScope.exports);
const {storyCamera}=moduleScope.exports;
assert.equal(typeof storyCamera,'function','The connected school needs one continuous image-camera path');
assert.deepEqual(storyCamera(-1),storyCamera(0));assert.deepEqual(storyCamera(2),storyCamera(1));
assert.equal(storyCamera(0).pan,0);assert.equal(storyCamera(1).pan,100);
let previous=storyCamera(0);
for(let i=1;i<=1000;i++){
 const pose=storyCamera(i/1000);
 assert.ok(pose.pan>=previous.pan&&pose.pan<=100,'Camera moves down the same architecture without resets');
 assert.ok(pose.zoom>=1&&pose.zoom<=1.035);
 assert.ok(Math.abs(pose.zoom-previous.zoom)<.001,'Zoom never jumps');previous=pose;
}
console.log('Continuous story camera: safe framing, bounds and reversible movement passed');
