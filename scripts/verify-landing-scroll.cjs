const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');
const scope={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/landing-scroll.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(scope,scope.exports);
const {bookFrame}=scope.exports;
assert.equal(typeof bookFrame,'function','Scroll must control reversible book camera and sheet motion');
// Catch a page turn while the viewer is still zoomed into feature details.
assert.equal(bookFrame(0).chapter,0);assert.equal(bookFrame(0).zoom,0);assert.equal(bookFrame(0).copy,1);
assert.ok(bookFrame(.1).zoom>.98,'Zoom into the first spread before browsing');
assert.equal(bookFrame(.2).zoom,0,'Return to the full book before the sheet turns');
assert.ok(bookFrame(.225).turn>0&&bookFrame(.225).turn<1,'Scroll controls intermediate paper curvature');
assert.equal(bookFrame(.25).chapter,1);assert.equal(bookFrame(.25).zoom,0);
assert.equal(bookFrame(1).chapter,3);assert.equal(bookFrame(1).local,1);assert.equal(bookFrame(1).outro,1);
assert.deepEqual(bookFrame(-1),bookFrame(0));assert.deepEqual(bookFrame(5),bookFrame(1));assert.deepEqual(bookFrame(NaN),bookFrame(0));
for(const boundary of [.25,.5,.75]){
 const before=bookFrame(boundary-1e-7),after=bookFrame(boundary+1e-7);
 assert.ok(Math.abs(before.zoom-after.zoom)<.001,'No zoom jump at the new spread');
 assert.ok(Math.abs(before.pan-after.pan)<.001,'No camera target jump at the new spread');
 assert.ok(before.lift<.001&&after.lift<.001,'A sheet settles before the next spread');
}
let previous=bookFrame(0);
for(let i=1;i<=10000;i++){
 const p=i/10000,now=bookFrame(p);
 assert.ok(now.zoom>=0&&now.zoom<=1&&now.turn>=0&&now.turn<=1);
 assert.ok(Math.abs(now.zoom-previous.zoom)<.015,'Smooth continuous zoom, no slide jump');
 assert.ok(Math.abs(now.pan-previous.pan)<.015,'Continuous camera travel');
 assert.deepEqual(bookFrame(p),now,'Reverse scroll derives the same frame without stale chapter state');previous=now;
}
console.log('Book scroll: controlled zoom/browse/out/turn, boundaries, reversal, final CTA and invalid progress passed');
