const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const file = 'lib/landing-scroll.ts';
assert.ok(fs.existsSync(file), 'Landing camera path must support native continuous scrolling');
const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleScope={exports:{}};
new Function('module','exports',source)(moduleScope,moduleScope.exports);
const {schoolCamera}=moduleScope.exports;
assert.equal(typeof schoolCamera,'function','One persistent school needs a continuous camera path');
assert.deepEqual(schoolCamera(-1),schoolCamera(0));
assert.deepEqual(schoolCamera(2),schoolCamera(1));
let previous=schoolCamera(0);
for(let i=1;i<=1000;i++){
 const pose=schoolCamera(i/1000);
 assert.ok(pose.azimuth>=previous.azimuth,'Camera must travel continuously rather than reset at chapter boundaries');
 assert.ok(Math.abs(pose.azimuth-previous.azimuth)<.01);
 assert.ok(Math.abs(pose.distance-previous.distance)<.02);
 assert.ok(pose.distance>=12&&pose.distance<=18,'Whole school stays framed');
 previous=pose;
}
assert.ok(schoolCamera(1).azimuth-schoolCamera(0).azimuth>1,'Scroll visibly travels around the same school');
console.log('Persistent school camera: clamped, continuous, reversible and safely framed');
