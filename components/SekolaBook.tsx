'use client';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {PerspectiveCamera,Vector3} from 'three';
import {bookFrame} from '@/lib/landing-scroll';

const W=4.05,H=5.4;
const spreads=['overview','learning','students','management'].map(name=>`/landing/book-${name}.webp`);
type Point={x:number;y:number;z:number};
type Vertex=Point&{u:number;v:number};

/** Project textured paper meshes in 3D, including devices without WebGL. */
export default function SekolaBook({progress,dark,reduced}:{progress:MutableRefObject<number>;dark:boolean;reduced:boolean}){
 const host=useRef<HTMLDivElement>(null),canvasRef=useRef<HTMLCanvasElement>(null),theme=useRef(dark);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 theme.current=dark;
 useEffect(()=>{
  const container=host.current;if(!container||reduced)return;
  const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx){setFailed(true);return;}
  
  const images:HTMLImageElement[]=[];
  const camera=new PerspectiveCamera(36,1,.1,100),vector=new Vector3();
  let disposed=false,loaded=false,width=0,height=0,ratio=1,rotation=0,lastProgress=-1,lastTheme=!theme.current,animation=0;
  const project=(p:Point):Point=>{
   const cos=Math.cos(rotation),sin=Math.sin(rotation);
   vector.set(p.x*cos-p.y*sin,p.x*sin+p.y*cos,p.z).project(camera);
   return {x:(vector.x+1)*width/2,y:(1-vector.y)*height/2,z:vector.z};
  };
  const outline=(points:Point[],fill:string,stroke?:string)=>{
   ctx.beginPath();points.forEach((point,index)=>{const p=project(point);if(index)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  };
  const curve=(x:number)=>.05+.13*Math.exp(-Math.abs(x)*4)+.045*(x/W)**2;
  const vertex=(x:number,y:number,u:number,v:number,z=curve(x)):Vertex=>({x,y,z,u,v});
  const triangle=(image:HTMLImageElement,vertices:Vertex[])=>{
   const dest=vertices.map(project),sx=vertices.map(p=>p.u*image.naturalWidth),sy=vertices.map(p=>p.v*image.naturalHeight);
   const det=sx[0]*(sy[1]-sy[2])+sx[1]*(sy[2]-sy[0])+sx[2]*(sy[0]-sy[1]);if(Math.abs(det)<.0001)return;
   const affine=(values:number[])=>[
    (values[0]*(sy[1]-sy[2])+values[1]*(sy[2]-sy[0])+values[2]*(sy[0]-sy[1]))/det,
    (values[0]*(sx[2]-sx[1])+values[1]*(sx[0]-sx[2])+values[2]*(sx[1]-sx[0]))/det,
    (values[0]*(sx[1]*sy[2]-sx[2]*sy[1])+values[1]*(sx[2]*sy[0]-sx[0]*sy[2])+values[2]*(sx[0]*sy[1]-sx[1]*sy[0]))/det
   ];
   const [a,c,e]=affine(dest.map(p=>p.x)),[b,d,f]=affine(dest.map(p=>p.y));
   // Expand each clipping edge by one device-independent pixel; thin projected strips
   // otherwise leave antialiased seams between adjacent textured triangles.
   const winding=Math.sign((dest[1].x-dest[0].x)*(dest[2].y-dest[0].y)-(dest[1].y-dest[0].y)*(dest[2].x-dest[0].x));
   if(!winding)return;
   const edges=dest.map((p,i)=>{const q=dest[(i+1)%3],dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1;const nx=winding*dy/len,ny=-winding*dx/len;return {nx,ny,c:nx*p.x+ny*p.y+1};});
   const expanded=edges.map((edge,i)=>{const prev=edges[(i+2)%3],det=prev.nx*edge.ny-edge.nx*prev.ny;if(Math.abs(det)<.00001)return dest[i];return {x:(prev.c*edge.ny-edge.c*prev.ny)/det,y:(prev.nx*edge.c-edge.nx*prev.c)/det};});
   ctx.save();ctx.beginPath();expanded.forEach((p,index)=>{if(index)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);const sx0=Math.max(0,Math.min(...sx)-16),sy0=Math.max(0,Math.min(...sy)-16),sx1=Math.min(image.naturalWidth,Math.max(...sx)+16),sy1=Math.min(image.naturalHeight,Math.max(...sy)+16);ctx.drawImage(image,sx0,sy0,sx1-sx0,sy1-sy0,sx0,sy0,sx1-sx0,sy1-sy0);ctx.restore();
  };
  const page=(image:HTMLImageElement,side:'left'|'right'|'turn',turn=0)=>{
   const strips=24,triangles:Vertex[][]=[];
   const make=(t:number,y:number,v:number)=>{
    if(side==='left')return vertex((t-1)*W,y,t*.5,v);
    if(side==='right')return vertex(t*W,y,.5+t*.5,v);
    const angle=turn*Math.PI,r=t*W;
    return vertex(r*Math.cos(angle),y,turn<.5?.5+t*.5:(1-t)*.5,v,curve(r)+r*Math.sin(angle)+Math.sin(angle)*Math.sin(t*Math.PI)*.55);
   };
   for(let i=0;i<strips;i++){
    const a=make(i/strips,H/2,0),b=make((i+1)/strips,H/2,0),c=make((i+1)/strips,-H/2,1),d=make(i/strips,-H/2,1);
    triangles.push([a,b,c],[a,c,d]);
   }
   triangles.sort((a,b)=>b.reduce((n,v)=>n+project(v).z,0)-a.reduce((n,v)=>n+project(v).z,0));
   triangles.forEach(points=>triangle(image,points));
  };
  const draw=()=>{
   const p=progress.current;if(!loaded||!width||!height||document.hidden)return;
   if(Math.abs(p-lastProgress)<.000001&&theme.current===lastTheme)return;
   const frame=bookFrame(p),next=Math.min(3,frame.chapter+1);
   camera.aspect=width/height;camera.updateProjectionMatrix();
   const fit=Math.max(H/2/Math.tan(Math.PI/10),W/camera.aspect/Math.tan(Math.PI/10))*1.12;
   const distance=fit*(1-frame.zoom*.38),target=frame.pan*1.4;
   camera.position.set(target+.2*frame.zoom,-distance*.43,distance*.9);camera.lookAt(target,frame.zoom*.1,.08);camera.updateMatrixWorld();rotation=-.045+.04*frame.zoom;
   ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   const cover=[{x:-W-.14,y:H/2+.13,z:-.48},{x:W+.14,y:H/2+.13,z:-.48},{x:W+.14,y:-H/2-.13,z:-.48},{x:-W-.14,y:-H/2-.13,z:-.48}];
   ctx.save();ctx.shadowColor=theme.current?'#000000c0':'#233d6745';ctx.shadowBlur=34;ctx.shadowOffsetY=22;outline(cover,'#101831');ctx.restore();
   outline(cover,'#131c3d','#8460ec');
   const frontY=-H/2;
   for(const side of [-1,1]){
    const x0=side<0?-W:0,x1=side<0?0:W;
    outline([{x:x0,y:frontY,z:-.38},{x:x1,y:frontY,z:-.38},{x:x1,y:frontY,z:curve(x1)},{x:x0,y:frontY,z:curve(x0)}],'#d9cbb0');
    outline([{x:side*W,y:frontY,z:-.38},{x:side*W,y:H/2,z:-.38},{x:side*W,y:H/2,z:curve(W)},{x:side*W,y:frontY,z:curve(W)}],'#e6d9c0');
    for(let layer=0;layer<15;layer++){
     ctx.beginPath();for(let i=0;i<=24;i++){const x=x0+(x1-x0)*i/24,q=project({x,y:frontY,z:curve(x)-.03-layer*.025});if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);}ctx.strokeStyle=layer%2?'#b7a88b':'#f4e9d4';ctx.lineWidth=.65;ctx.stroke();
    }
   }
   page(images[frame.chapter],'left');page(images[frame.turn>0?next:frame.chapter],'right');
   if(frame.turn>0){
    // The back of the turning right leaf becomes the next spread's left page.
    page(images[frame.turn<.5?frame.chapter:next],'turn',frame.turn);
   }
   lastProgress=p;lastTheme=theme.current;
  };
  const resize=()=>{width=container.clientWidth;height=container.clientHeight;ratio=Math.min(devicePixelRatio,width<760?1.5:2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);lastProgress=-1;draw();};
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  Promise.all(spreads.map(async(src,index)=>{const image=new Image();image.src=src;await image.decode();images[index]=image;})).then(()=>{if(!disposed){loaded=true;draw();setReady(true);}}).catch(()=>{if(!disposed)setFailed(true);});
  const tick=()=>{if(disposed)return;draw();animation=requestAnimationFrame(tick);};animation=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(animation);observer.disconnect();ctx.clearRect(0,0,canvas.width,canvas.height);};
 },[progress,reduced]);
 return <div ref={host} className="sp-book-canvas" data-ready={ready&&!failed&&!reduced} aria-hidden="true">
 {!reduced&&!failed&&<canvas ref={canvasRef}/>}
 {(failed||reduced)&&<img className="sp-book-fallback" src="/landing/book-overview.webp" width={1536} height={1024} alt=""/>}
 {!ready&&!failed&&!reduced&&<div className="sp-book-loading"><img src="/sekola-pro-mark.svg" width={42} height={42} alt=""/><span>Menyiapkan buku…</span></div>}
 </div>;
}
