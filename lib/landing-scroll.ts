export function tourPosition(offset:number, distance:number, count:number){
 const progress=distance>0?Math.min(1,Math.max(0,offset/distance)):0;
 return {progress,index:Math.round(progress*Math.max(0,count-1))};
}
export function tourScrollTarget(index:number,top:number,distance:number,count:number){
 return top+Math.min(Math.max(index,0),Math.max(count-1,0))/Math.max(count-1,1)*Math.max(distance,0);
}
