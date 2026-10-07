/** Translate an image layer without changing its crop/paint on every frame. */
export function storyPanPixels(progress:number,width:number,viewportHeight:number){
 const p=Math.min(1,Math.max(0,progress));
 const distance=Math.max(0,width*1.5-viewportHeight);
 return p===0||distance===0?0:-distance*p;
}
