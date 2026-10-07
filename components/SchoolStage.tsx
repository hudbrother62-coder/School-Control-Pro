'use client';
import {useEffect,useRef,type RefObject} from 'react';
import * as THREE from 'three';

/** Real WebGL cap; school artwork is an independent cinematic layer. */
export default function SchoolStage({progress,reduced}:{progress:RefObject<number>;reduced:boolean}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!context)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(36,1,.1,60);camera.position.set(0,2.3,6.5);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xe9dcff,0x152153,3));
  const purple=new THREE.PointLight(0xbd56ff,24,20);purple.position.set(-3,3,3);scene.add(purple);
  const blue=new THREE.PointLight(0x38bcff,30,20);blue.position.set(3,2,1);scene.add(blue);
  const white=new THREE.DirectionalLight(0xffffff,2.8);white.position.set(0,4,-1);scene.add(white);
  const cap=new THREE.Group();scene.add(cap);
  const materials=[new THREE.MeshStandardMaterial({color:0x7226b8,metalness:.65,roughness:.25}),new THREE.MeshStandardMaterial({color:0x1165c4,metalness:.65,roughness:.25})];
  const board=new THREE.BoxGeometry(2.7,.09,2.7),vertices=board.getAttribute('position'),colors=[];
  for(let i=0;i<vertices.count;i++){const c=new THREE.Color(0x8428c4).lerp(new THREE.Color(0x0c75d1),(vertices.getX(i)+1.35)/2.7);colors.push(c.r,c.g,c.b);}
  board.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const boardMaterial=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.6,roughness:.27});materials.push(boardMaterial);
  const top=new THREE.Mesh(board,boardMaterial);top.rotation.y=Math.PI/4;top.position.y=.42;cap.add(top);
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(.85,.76,.64,64,1,true),materials[0]);crown.position.y=.04;cap.add(crown);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.78,.025,8,64),materials[1]);rim.rotation.x=Math.PI/2;rim.position.y=-.27;cap.add(rim);
  const knot=new THREE.Mesh(new THREE.SphereGeometry(.08,16,12),materials[1]);knot.position.y=.53;cap.add(knot);
  const cord=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.52,0),new THREE.Vector3(.95,.52,.3),new THREE.Vector3(1.48,.4,.45),new THREE.Vector3(1.48,-.36,.45)]);
  cap.add(new THREE.Mesh(new THREE.TubeGeometry(cord,32,.025,8,false),materials[1]));
  const tassel=new THREE.Mesh(new THREE.ConeGeometry(.1,.43,20),materials[1]);tassel.rotation.z=Math.PI;tassel.position.set(1.48,-.57,.45);cap.add(tassel);
  node.appendChild(renderer.domElement);node.dataset.ready='true';
  const resize=()=>{const {width,height}=node.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  const observer=new ResizeObserver(resize);observer.observe(node);resize();
  let frame=0,visible=!document.hidden,lastFrame=0,lastProgress=-1;
  const change=()=>{visible=!document.hidden;};document.addEventListener('visibilitychange',change);
  const lost=(event:Event)=>{event.preventDefault();node.dataset.ready='false';visible=false;};renderer.domElement.addEventListener('webglcontextlost',lost);
  const draw=(time:number)=>{frame=requestAnimationFrame(draw);const p=progress.current;if(!visible||time-lastFrame<33||(reduced&&p===lastProgress))return;lastFrame=time;lastProgress=p;cap.rotation.y=reduced?-.45:-.45+p*Math.PI*.9;cap.rotation.z=reduced?-.08:-.08+Math.sin(p*Math.PI*2)*.09;cap.position.y=reduced?0:Math.sin(time*.0007)*.055;renderer.render(scene,camera);};frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',change);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();delete node.dataset.ready;};
 },[reduced,progress]);
 return <div className="sp-cap" ref={host} aria-hidden="true"><img className="sp-cap-fallback" src="/landing/graduation-cap.webp" alt=""/></div>;
}
