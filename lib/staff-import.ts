import type {Staff} from './modules';
export type StaffImportKind='staff'|'attendance'|'performance'|'leave';
const value=(row:Record<string,unknown>,key:string)=>String(row[key]??'').trim();
export function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Tanggal harus benar dalam format YYYY-MM-DD.');return value;}
function text(value:string,min:number,max:number){if(value.length<min||value.length>max)throw Error(`Teks harus ${min}–${max} karakter.`);return value;}
export function parseStaffRow(kind:StaffImportKind,row:Record<string,unknown>,staff:Staff[]){
 if(kind==='leave'){const type=value(row,'Jenis');if(!['permission','sick','annual','other'].includes(type))throw Error('Jenis izin/cuti tidak valid.');const from=validDate(value(row,'Tanggal_Mulai')),to=validDate(value(row,'Tanggal_Selesai'));if(to<from)throw Error('Tanggal selesai sebelum tanggal mulai.');return {kind,leaveKind:type,from,to,reason:text(value(row,'Alasan'),3,2000)} as const;}
 const id=value(row,'Pegawai_ID'),name=value(row,'Pegawai');const matches=staff.filter(s=>id?s.id===id:s.name.trim().toLowerCase()===name.toLowerCase());if(matches.length!==1)throw Error('Pegawai tidak ditemukan atau nama ganda. Gunakan Pegawai_ID dari export.');const person=matches[0];
 if(kind==='staff'){const shift=value(row,'Jam_Mulai'),tolerance=Number(value(row,'Toleransi_Menit'));if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(shift)||!value(row,'Toleransi_Menit')||!Number.isInteger(tolerance)||tolerance<0||tolerance>120)throw Error('Jam/toleransi shift tidak valid (0–120 menit).');return {kind,staffId:person.id,name:text(value(row,'Nama')||person.name,2,160),position:value(row,'Jabatan'),shift,tolerance} as const;}
 if(!person.user_id)throw Error('Pegawai belum terhubung dengan akun.');const day=validDate(value(row,'Tanggal'));
 if(kind==='attendance')return {kind,userId:person.user_id,day,reason:text(value(row,'Alasan'),10,2000)} as const;
 const type=value(row,'Kategori');if(!['program','training','supervision','achievement','feedback'].includes(type))throw Error('Kategori bukti tidak valid.');return {kind,userId:person.user_id,day,type,title:text(value(row,'Kegiatan'),3,200)} as const;
}
