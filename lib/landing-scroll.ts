/** One uninterrupted arc around the school; no per-chapter camera reset. */
export function schoolCamera(progress:number){
 const p=Math.min(1,Math.max(0,progress));
 return {azimuth:-.62+p*1.32,distance:16.8-Math.sin(p*Math.PI)*1.2,elevation:.66+Math.sin(p*Math.PI)*.08,targetY:.55};
}
