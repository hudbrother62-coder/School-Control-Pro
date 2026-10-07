const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** The camera always returns to the whole book before a new sheet turns. */
export function bookFrame(progress:number){
 const p=Number.isFinite(progress)?clamp(progress):0;
 const chapter=Math.min(3,Math.floor(p*4));
 const local=p*4-chapter;
 const zoom=(chapter===0?.65+.35*ease(local/.22):ease((local-.08)/.24))*(1-ease((local-.45)/.33));
 const pan=(-1+2*ease((local-.38)/.23))*zoom;
 const turn=chapter<3?ease((local-.8)/.2):0;
 const copy=ease((.3-zoom)/.3)*(1-ease((local-.78)/.02));
 const outro=chapter===3?ease((local-.81)/.12):0;
 return {chapter,local,zoom,pan,turn,lift:Math.sin(turn*Math.PI),copy,outro};
}
export type BookFrame=ReturnType<typeof bookFrame>;

/** Apply after framing so bounds fitting cannot cancel camera travel. */
export const bookCameraScale=(zoom:number,portrait=false)=>1-clamp(zoom)*(portrait?.16:.34);
