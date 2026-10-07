/** Continuous framing of the same connected school, without chapter resets. */
export function storyCamera(progress:number){
 const p=Math.min(1,Math.max(0,progress));
 return {pan:p*100,zoom:1+Math.sin(p*Math.PI)*.035};
}
