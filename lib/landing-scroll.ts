export function tourPosition(offset:number, distance:number, count:number){
 const progress=distance>0?Math.min(1,Math.max(0,offset/distance)):0;
 return {progress,index:Math.round(progress*Math.max(0,count-1))};
}
export function tourScrollTarget(index:number,top:number,distance:number,count:number){
 return top+Math.min(Math.max(index,0),Math.max(count-1,0))/Math.max(count-1,1)*Math.max(distance,0);
}
/** A reversible dissolve around each scene boundary, with no blank interval. */
export function tourBlend(progress:number,count:number){
 const position=Math.min(1,Math.max(0,progress))*Math.max(0,count-1);
 const from=Math.floor(position),fraction=position-from;
 const t=Math.min(1,Math.max(0,(fraction-.28)/.44));
 const blend=t*t*(3-2*t);
 return Array.from({length:count},(_,i)=>i===from?1-blend:i===from+1?blend:0);
}

/** A zoom-through lens movement at each boundary; poses stay reversible. */
export function tourCamera(progress:number,count:number){
 const position=Math.min(1,Math.max(0,progress))*Math.max(0,count-1);
 const pulse=Math.sin((position%1)*Math.PI)**2;
 return {scale:1.04+pulse*.12,x:Math.sin(position*Math.PI)*1.1,yaw:Math.sin(position*Math.PI)*1.5};
}
