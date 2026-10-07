'use client';
import {useEffect,useRef,type RefObject} from 'react';
import * as THREE from 'three';
import {schoolCamera} from '@/lib/landing-scroll';

/** One persistent, open-front school miniature. Static geometry is instanced. */
export default function SchoolStage({progress,reduced,dark}:{progress:RefObject<number>;reduced:boolean;dark:boolean}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});if(!context)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});}catch{return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.4));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=dark?1.35:1.2;renderer.setClearColor(0,0);
  const scene=new THREE.Scene(),campus=new THREE.Group();scene.add(campus);
  const camera=new THREE.PerspectiveCamera(38,1,.1,100);
  scene.add(new THREE.HemisphereLight(dark?0xc5c9ff:0xe5f5ff,0x373665,dark?2.3:3));
  const sun=new THREE.DirectionalLight(0xffeed3,3.2);sun.position.set(-5,9,6);scene.add(sun);
  const rim=new THREE.DirectionalLight(0x8780ff,3);rim.position.set(5,4,-6);scene.add(rim);
  const materials:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[],textures:THREE.Texture[]=[];
  const material=(color:number,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.08,emissive,emissiveIntensity:dark?.55:.15});materials.push(m);return m;};
  const wall=material(0xf3e8dc),floor=material(0xd3c2ac),trim=material(0x6154c7),base=material(dark?0x243759:0xaabfce),grass=material(0x4c9380),leaf=material(0x348878),leafLight=material(0x78b58e),wood=material(0xcda477),ink=material(0x303653),glass=material(0x77ccec,0x2d75c3),warm=material(0xffd68b,0xffa44b),purple=material(0x9062e7,0x5628bd),blue=material(0x378de0),coral=material(0xe98e88),skin=material(0xe8b898),hair=material(0x333145),white=material(0xf8faf9),court=material(0x4c92a8);
  const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10);geometries.push(cube,sphere,cylinder);
  const batches=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;matrices:THREE.Matrix4[]}>();
  const transform=new THREE.Object3D();
  const add=(geometry:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,rotation=0)=>{
   transform.position.set(x,y,z);transform.scale.set(sx,sy,sz);transform.rotation.set(0,rotation,0);transform.updateMatrix();
   const key=geometry.uuid+m.uuid;let batch=batches.get(key);if(!batch){batch={geometry,material:m,matrices:[]};batches.set(key,batch);}batch.matrices.push(transform.matrix.clone());
  };
  const box=(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,r=0)=>add(cube,m,x,y,z,w,h,d,r);
  const ball=(m:THREE.Material,x:number,y:number,z:number,r:number)=>add(sphere,m,x,y,z,r,r,r);
  const stem=(m:THREE.Material,x:number,y:number,z:number,r:number,h:number)=>add(cylinder,m,x,y,z,r,h,r);
  const label=(text:string,x:number,y:number,z:number,width=2.5)=>{
   const c=document.createElement('canvas');c.width=512;c.height=112;const ctx=c.getContext('2d');if(!ctx)return;
   ctx.fillStyle=dark?'#25224a':'#fff9ec';ctx.beginPath();ctx.roundRect(2,2,508,108,18);ctx.fill();ctx.fillStyle=dark?'#eee9ff':'#39306b';ctx.font='bold 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,58);
   const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const m=new THREE.SpriteMaterial({map:texture,depthTest:true});materials.push(m);const sprite=new THREE.Sprite(m);sprite.position.set(x,y,z);sprite.scale.set(width,width*112/512,1);campus.add(sprite);
  };
  // Floating campus, paved paths and flower borders.
  box(base,0,-.27,0,12.6,.55,9.8);box(trim,0,-.56,0,12.2,.06,9.4);box(grass,0,.025,0,12,.08,9.2);
  box(floor,0,.09,.65,2.4,.08,7.6);box(floor,0,.09,-1.1,10.8,.08,1.05);
  for(let i=0;i<9;i++)box(wall,0,.15,1.1+i*.37,1.6,.04,.24);
  const tree=(x:number,z:number,size=1)=>{stem(wood,x,.62,z,.09,1.1);ball(leaf,x,1.3,z,.55*size);ball(leafLight,x-.18,1.6,z+.08,.4*size);box(wall,x,.12,z,.9,.2,.9);};
  [[-5.3,-3.7],[5.3,-3.7],[-5.2,-.3],[5.3,.1],[-5.3,3.6],[5.2,3.8],[-1.7,3.7],[1.8,3.7]].forEach(([x,z],i)=>tree(x,z,i%2?.85:1));
  for(let x=-4.8;x<5;x+=.6){if(Math.abs(x)<1.7)continue;ball(purple,x,.26,4.2,.14);ball(coral,x+.15,.23,4.05,.11);}
  // Open-front rooms reveal the people and their work.
  const room=(x:number,tint:THREE.Material,title:string)=>{
   box(floor,x,.22,-2.15,3.45,.24,3.45);box(wall,x,1.32,-3.82,3.45,2.1,.14);
   box(wall,x-1.66,1.25,-2.5,.13,1.95,2.65);box(wall,x+1.66,1.25,-2.5,.13,1.95,2.65);
   box(trim,x,2.4,-3.1,3.6,.17,1.65);box(tint,x,2.34,-1.17,3.4,.1,.14);
   [-1.45,1.45].forEach(dx=>box(wood,x+dx,1.35,-.47,.1,2.1,.1));box(warm,x,2.22,-2.2,1.2,.045,.45);label(title,x,2.85,-2.65,2.4);
   [-.8,.8].forEach(dx=>{box(glass,x+dx,1.46,-3.71,1.05,.85,.035);box(white,x+dx,1.46,-3.67,.045,.9,.05);});
  };
  room(-3.6,blue,'Pembelajaran');room(0,purple,'Pendampingan');room(3.6,coral,'Administrasi');
  const actors:THREE.Group[]=[];
  const person=(x:number,z:number,shirt:THREE.Material,seated=false,turn=0)=>{
   const p=new THREE.Group();p.position.set(x,.35,z);p.rotation.y=turn;
   const part=(g:THREE.BufferGeometry,m:THREE.Material,px:number,py:number,pz:number,sx:number,sy:number,sz:number)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(px,py,pz);mesh.scale.set(sx,sy,sz);p.add(mesh);};
   part(sphere,skin,0,seated?.62:.88,0,.14,.16,.14);part(sphere,hair,0,seated?.7:.96,-.03,.15,.1,.14);part(cube,shirt,0,seated?.35:.54,0,.27,.35,.2);
   [-.08,.08].forEach(dx=>part(cube,ink,dx,seated?.12:.2,seated?.09:0,.075,seated?.22:.39,.08));[-.17,.17].forEach(dx=>part(cube,skin,dx,seated?.38:.5,.04,.065,.22,.065));campus.add(p);actors.push(p);return p;
  };
  // Students, teacher, screens and classroom shelves.
  box(ink,-3.6,1.32,-3.55,1.75,.72,.05);box(white,-3.8,1.33,-3.5,.8,.04,.04);box(white,-3.55,1.12,-3.5,1.2,.035,.04);
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const x=-4.32+col*1.35,z=-2.65+row*1.12;box(wood,x,.78,z,.83,.1,.48);box(ink,x,.54,z,.08,.4,.08);box(white,x-.1,.85,z,.25,.025,.2);box(blue,x,.46,z+.48,.39,.12,.35);person(x,z+.54,col?blue:white,true,Math.PI);
  }
  person(-4.7,-3.1,purple);box(wood,-5.07,.85,-2.1,.32,1.14,.7);for(let i=0;i<5;i++)box(i%2?coral:blue,-5.06,.63+i*.17,-2.07,.26,.09,.55);
  // Counselor and student; administrator working at a laptop.
  box(wood,0,.73,-2.2,1.2,.1,.7);box(purple,-.8,.42,-2.2,.4,.2,.5);box(blue,.8,.42,-2.2,.4,.2,.5);person(-.8,-2.2,purple,true,-Math.PI/2);person(.8,-2.2,white,true,Math.PI/2);box(white,0,.8,-2.1,.4,.04,.28);
  box(wood,3.6,.73,-2.2,1.5,.11,.7);box(ink,3.6,.94,-2.37,.5,.36,.04);box(glass,3.6,.94,-2.34,.43,.28,.02);box(ink,3.6,.81,-2.15,.5,.025,.3);person(3.6,-1.7,coral,true,Math.PI);
  for(let row=0;row<3;row++){box(wood,4.7,.5+row*.35,-3.05,.8,.07,.42);for(let b=0;b<4;b++)box(b%2?purple:blue,4.43+b*.17,.67+row*.35,-3.06,.1,.24,.27);}
  // Playground and garden remain part of the same school.
  box(court,-3.3,.12,1.7,3.25,.06,2.75);[-4.78,-1.82].forEach(x=>box(white,x,.16,1.7,.035,.025,2.48));[.46,2.94].forEach(z=>box(white,-3.3,.16,z,2.96,.025,.035));box(white,-3.3,.16,1.7,2.96,.025,.035);
  const ringGeometry=new THREE.TorusGeometry(.48,.016,6,36);geometries.push(ringGeometry);const centerRing=new THREE.Mesh(ringGeometry,white);centerRing.rotation.x=-Math.PI/2;centerRing.position.set(-3.3,.17,1.7);campus.add(centerRing);
  stem(ink,-4.7,.88,1.7,.035,1.45);box(white,-4.64,1.58,1.7,.04,.46,.7);box(coral,-4.5,1.38,1.7,.29,.04,.32);person(-3.4,1.2,blue);person(-2.5,2.1,coral);ball(coral,-3.1,.32,1.8,.12);
  box(floor,3.4,.13,1.75,2.6,.13,2.2);box(trim,3.4,1.68,1.75,2.85,.12,2.4);[[2.3,.8],[4.5,.8],[2.3,2.7],[4.5,2.7]].forEach(([x,z])=>box(wood,x,.93,z,.09,1.5,.09));box(wood,3.4,.57,1.7,1.4,.12,.65);person(3.1,2.1,white,true,Math.PI);person(3.8,2.1,purple,true,Math.PI);box(white,3.45,.66,1.7,.36,.04,.3);label('Perpustakaan',3.4,2.2,1.1,2.65);
  // Entrance, school sign, bollard lights and national flag.
  box(wall,0,.75,4.15,2.6,1.25,.16);box(trim,0,1.4,4.15,2.72,.12,.23);label('SekolaPro',0,1.04,4.29,2.1);
  stem(white,1.05,1.6,2.9,.025,3);box(coral,1.4,2.85,2.9,.72,.23,.025);box(white,1.4,2.62,2.9,.72,.23,.025);[-5.65,5.65,-1.4,1.4].forEach(x=>{stem(ink,x,.4,3.2,.055,.55);ball(warm,x,.75,3.2,.105);});
  const walker=person(.35,1.3,purple);person(-.55,.4,white);
  // Bake static people into the same batches; only the walking figure animates.
  for(const actor of actors){if(actor===walker)continue;actor.updateWorldMatrix(true,true);for(const child of actor.children){if(!(child instanceof THREE.Mesh))continue;const key=child.geometry.uuid+child.material.uuid;let batch=batches.get(key);if(!batch){batch={geometry:child.geometry,material:child.material,matrices:[]};batches.set(key,batch);}batch.matrices.push(child.matrixWorld.clone());}campus.remove(actor);}
  for(const batch of batches.values()){const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;campus.add(mesh);}
  // Soft contact shadow without a shadow-map pass.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');
  if(sc){const gradient=sc.createRadialGradient(64,64,5,64,64,64);gradient.addColorStop(0,dark?'#02041a99':'#263f6e44');gradient.addColorStop(1,'#00000000');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);const texture=new THREE.CanvasTexture(shadowCanvas);textures.push(texture);const m=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.push(m);const g=new THREE.PlaneGeometry(17,14);geometries.push(g);const shadow=new THREE.Mesh(g,m);shadow.rotation.x=-Math.PI/2;shadow.position.y=-.8;scene.add(shadow);}
  node.appendChild(canvas);node.dataset.ready='true';
  let frame=0,lastFrame=0,inView=true,lastProgress=-1,currentProgress=progress.current;
  const resize=()=>{const rect=node.getBoundingClientRect();if(!rect.width||!rect.height)return;lastProgress=-1;renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(node);resize();const intersection=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;});intersection.observe(node);
  const lost=(event:Event)=>{event.preventDefault();node.dataset.ready='false';inView=false;};canvas.addEventListener('webglcontextlost',lost);
  const draw=(time:number)=>{frame=requestAnimationFrame(draw);if(document.hidden||!inView||time-lastFrame<33)return;const delta=Math.min((time-lastFrame)/1000,.1);lastFrame=time;
   currentProgress=reduced?0:THREE.MathUtils.damp(currentProgress,progress.current,9,delta);if(reduced&&lastProgress===0)return;lastProgress=currentProgress;
   const pose=schoolCamera(currentProgress),idle=reduced?0:Math.sin(time*.00024)*.023;const distance=pose.distance*Math.max(1,.98/Math.max(camera.aspect,.1));
   camera.position.set(Math.sin(pose.azimuth+idle)*distance*Math.cos(pose.elevation),Math.sin(pose.elevation)*distance,Math.cos(pose.azimuth+idle)*distance*Math.cos(pose.elevation));camera.lookAt(0,pose.targetY,0);
   walker.position.z=reduced?1.3:1.3+Math.sin(time*.00045)*.45;walker.position.y=reduced?.35:.35+Math.sin(time*.004)*.013;renderer.render(scene,camera);
  };frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();canvas.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();delete node.dataset.ready;};
 },[progress,reduced,dark]);
 return <div className="sp-school-model" ref={host} aria-hidden="true"><img className="sp-school-fallback" src={dark?'/landing/campus-scene.webp':'/landing/campus-day.webp'} alt="" fetchPriority="high"/></div>;
}
