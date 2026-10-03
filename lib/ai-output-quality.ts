import {teacherToolConfig} from './teacher-ai-config';
import {principalToolConfig} from './principal-ai-config';
export function generatorStandard(module:string,key:string){return (module==='guru_ai'?teacherToolConfig:principalToolConfig)[key];}
export function evaluateAiOutput(module:string,key:string,content:string){
 const config=generatorStandard(module,key),issues:string[]=[];
 if(content.trim().length<100)issues.push('Isi terlalu singkat untuk dokumen operasional.');
 if(/\[(?:isi|masukkan|nama siswa|nama sekolah)\]/i.test(content))issues.push('Masih ada placeholder yang perlu dilengkapi.');
 const normalize=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const headings=content.split('\n').filter(x=>/^\s*(?:#{1,6}\s|\d+[.)]\s|[A-Z][.)]\s)/.test(x)).map(normalize);
 const missing=(config?.standard||[]).filter(s=>!headings.some(h=>h.includes(normalize(s))));
 if(missing.length)issues.push('Bagian standar belum terdeteksi: '+missing.join('; '));
 return {structuralPass:issues.length===0,issues,requiredSections:config?.standard||[],reviewRequired:true};
}
