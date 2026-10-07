const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** The camera always returns to the whole book before a new sheet turns. */
export function bookFrame(progress:number){
 const p=Number.isFinite(progress)?clamp(progress):0;
 const chapter=Math.min(3,Math.floor(p*4));
 const local=p*4-chapter;
 const zoom=ease((local-.12)/.24)*(1-ease((local-.59)/.19));
 const pan=(-1+2*ease((local-.38)/.23))*zoom;
 const turn=chapter<3?ease((local-.8)/.2):0;
 const copy=(chapter===0?1:ease(local/.12))*(1-ease((local-.69)/.11));
 const outro=chapter===3?ease((local-.81)/.12):0;
 return {chapter,local,zoom,pan,turn,lift:Math.sin(turn*Math.PI),copy,outro};
}
export type BookFrame=ReturnType<typeof bookFrame>;
