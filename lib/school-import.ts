import type {SheetRows} from "./excel";

// Terima nama kolom dari template SekolaPro dan variasi umum administrasi sekolah.
const aliases:Record<string,string[]>={
 NIS:["Nomor Induk Siswa","No Induk Siswa","No NIS"],
 NISN:["Nomor Induk Siswa Nasional","No NISN"],
 Nama:["Nama Lengkap","Nama Siswa","Nama Peserta Didik","Peserta Didik","Nama Guru","Nama Staf","Nama Mapel","Nama Mata Pelajaran"],
 Nama_Panggilan:["Nama Panggilan","Panggilan"],
 Jenis_Kelamin:["Jenis Kelamin","JK","Kelamin","L/P"],
 Tanggal_Lahir:["Tanggal Lahir","Tgl Lahir","Tgl Lhr"],
 Alamat:["Alamat Rumah","Alamat Siswa"],
 HP_Siswa:["HP Siswa","No HP Siswa","Nomor HP Siswa","Telepon Siswa"],
 HP_Orang_Tua:["HP Orang Tua","No HP Orang Tua","Nomor HP Wali","Telepon Wali"],
 Kelas:["Nama Kelas","Rombel","Rombongan Belajar"],
 Nama_Kelas:["Nama Kelas","Rombel","Rombongan Belajar","Kelas"],
 Tahun_Ajaran:["Tahun Ajaran","Tahun Pelajaran","Tahun Akademik","TA"],
 Nama_Wali:["Nama Wali","Nama Orang Tua","Nama Orangtua"],
 WhatsApp_Wali:["WhatsApp Wali","WA Wali","No WA Wali","No WA Orang Tua","Nomor WA Wali"],
 ID_Pegawai:["ID Pegawai","Kode Pegawai","NIP","NUPTK"],
 Email:["Alamat Email","Email Guru"],
 Email_Akun:["Email Akun","Email Guru","Email"],
 Telepon:["No HP","Nomor HP","Telepon","No Telepon"],
 Organisasi:["Organisasi","Bagian","Unit","Departemen"],
 Jabatan:["Jabatan","Posisi"],
 Pangkat:["Pangkat","Golongan"],
 Status_Kerja:["Status Kerja","Status Kepegawaian"],
 Tanggal_Bergabung:["Tanggal Bergabung","Tanggal Masuk","Tanggal Mulai Kerja"],
 Tanggal_Akhir_Kerja:["Tanggal Akhir Kerja","Tanggal Akhir Kontrak"],
 Jam_Masuk:["Jam Masuk","Jam Mulai Kerja"],
 Toleransi_Terlambat_Menit:["Toleransi Terlambat Menit","Toleransi Terlambat"],
 Jenjang:["Jenjang","Tingkat","Grade"],
 Mata_Pelajaran:["Mata Pelajaran","Nama Mata Pelajaran","Mapel","Nama Mapel"],
 Jenis:["Jenis","Mode","Jenis Penugasan"],
 Kode:["Kode","Kode Mapel","Kode Pelajaran"]
};
const norm=(s:string)=>s.normalize("NFKC").toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g,"");
export function normalizeSchoolImportRows(rows:SheetRows):SheetRows{
 return rows.map(row=>{
  const existing=new Map<string,string>();
  for(const [header,raw] of Object.entries(row)){
   const value=String(raw??"").trim();
   if(value&&!existing.has(norm(header)))existing.set(norm(header),value);
  }
  const result:SheetRows[number]={...row};
  for(const [key,names] of Object.entries(aliases)){
   if(String(result[key]??"").trim())continue;
   for(const name of [key,...names]){
    const value=existing.get(norm(name));
    if(value!==undefined){result[key]=value;break}
   }
  }
  return result;
 });
}
