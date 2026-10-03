'use client';
import {browserDb} from '@/lib/supabase';
import {renderSchoolTemplate,type SchoolTemplate} from '@/lib/report-template';
export async function templateBlob(blob:Blob,identity:any,meta:{title:string;subtitle?:string;documentType:string;moduleKey?:string;period?:string;number?:string;status?:string;confidentiality?:string}){
 const settings=identity.report_settings||{},templates=settings.templates||{};
 const selected:SchoolTemplate=templates[meta.documentType]||templates[meta.moduleKey||'']||templates.default;
 if(!selected)return blob;
 if(!identity.school_id||!selected.path.startsWith(identity.school_id+'/'))throw Error('Template bukan milik sekolah ini.');
 const {data,error}=await browserDb().storage.from('sc-report-assets').download(selected.path);if(error||!data)throw error||Error('Template tidak tersedia.');
 const rendered=renderSchoolTemplate(await data.arrayBuffer(),await blob.arrayBuffer(),{
 _body_font:String(settings.body_font||'Times New Roman'),_body_size:String(Number(settings.body_font_size||11)*2),school_name:identity.name||'',npsn:identity.npsn||'',address:identity.address||'',academic_year:identity.academic_year||'',phone:identity.phone||'',email:identity.email||'',website:identity.website||'',province:identity.province||'',education_level:identity.education_level||'',motto:identity.motto||'',semester:identity.semester||'',principal_name:identity.principal_name||'',principal_nip:identity.principal_nip||'',city:identity.city||'',report_title:meta.title,report_subtitle:meta.subtitle||'',document_number:meta.number||'DRAFT / BELUM DITERBITKAN',period:meta.period||'',date:new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),status:meta.status||'draft',confidentiality:meta.confidentiality||'internal'
 });
 return new Blob([rendered as BlobPart],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
export async function resolveReportAssets(identity:any,schoolId:string){
 identity.school_id=schoolId;
 for(const key of ['logo','signature','stamp']){
  const path=identity.report_settings?.asset_paths?.[key];
  if(!path)continue;
  if(!path.startsWith(schoolId+'/'))throw Error('Aset laporan bukan milik sekolah ini.');
  const {data,error}=await browserDb().storage.from('sc-report-assets').createSignedUrl(path,3600);if(error)throw error;
  identity[key+'_url']=data.signedUrl;
 }
 return identity;
}
