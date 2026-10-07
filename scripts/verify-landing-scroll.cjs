const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const file = 'lib/landing-scroll.ts';
assert.ok(fs.existsSync(file), 'Landing camera path must support native continuous scrolling');
const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleScope={exports:{}};
new Function('module','exports',source)(moduleScope,moduleScope.exports);
const {storyPanPixels}=moduleScope.exports;
assert.equal(typeof storyPanPixels,'function','Mobile framing must move the composited image instead of repainting object-position');
assert.equal(storyPanPixels(0,390,300),0);
assert.equal(storyPanPixels(1,390,300),-285);
assert.equal(storyPanPixels(.5,390,300),-142.5);
assert.equal(storyPanPixels(1,320,600),0);
assert.equal(storyPanPixels(1,667,170),-830.5);
assert.equal(storyPanPixels(-2,390,300),0);
assert.equal(storyPanPixels(2,390,300),-285);
let previous=storyPanPixels(0,390,300);
for(let i=1;i<=1000;i++){
 const position=storyPanPixels(i/1000,390,300);
 assert.ok(position<=previous&&position>=-285,'Camera moves continuously down the same image');
 assert.ok(Math.abs(position-previous)<1,'Framing does not jump between chapters');previous=position;
}
console.log('Continuous image framing: bounds, short images, small/landscape screens and monotonic movement passed');
