/** Crisp, legible feature previews composited onto the illustrated paper. */
const content=[
 {label:'SEKOLAPRO',title:'Sekolah dalam genggaman.',subtitle:'Satu tempat untuk pekerjaan seluruh tim.',rows:[['Pembelajaran','Presensi · nilai · perangkat ajar'],['Kesiswaan','Data siswa · konseling · pembinaan'],['Administrasi','Program · keuangan · laporan'],['Fasilitas','Inventaris · peminjaman · perawatan']],footer:'Rp100.000 / bulan'},
 {label:'01 / PEMBELAJARAN',title:'Mengajar lebih fokus.',subtitle:'Dari kehadiran hingga perkembangan belajar.',rows:[['Presensi harian','Hadir, izin, sakit, dan alpa'],['Nilai & perkembangan','Rekap belajar dalam satu tempat'],['Perangkat ajar','Modul, LKPD, dan asesmen'],['Jadwal & jurnal','Rencana dan catatan mengajar']],footer:'Untuk guru dan wali kelas'},
 {label:'02 / KESISWAAN',title:'Dampingi setiap siswa.',subtitle:'Catatan yang terhubung, tindak lanjut yang jelas.',rows:[['Profil siswa','Data dan riwayat pembinaan'],['Konseling','Layanan dan catatan pendampingan'],['Disiplin & prestasi','Pantau perkembangan siswa'],['Tindak lanjut','Pembinaan, surat, dan laporan']],footer:'Akses mengikuti peran dan izin'},
 {label:'03 / PENGELOLAAN',title:'Sekolah lebih terarah.',subtitle:'Kelola kegiatan, anggaran, dan fasilitas.',rows:[['Program & agenda','Tugas, penanggung jawab, tenggat'],['Keuangan','Kas, tagihan, dan laporan'],['Fasilitas','Inventaris, pinjam, dan perawatan'],['Laporan sekolah','Template dan ekspor dokumen']],footer:'Seluruh tim, satu ruang kerja'}
];
export function makeBookSpread(image:HTMLImageElement,index:number){
 const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1600;
 const c=canvas.getContext('2d');if(!c)return image;
 c.drawImage(image,0,0,2400,1600);
 const data=content[index];
 // The left page retains the school illustration; the right page is typeset at
 // full resolution instead of enlarging lettering embedded in generated art.
 c.fillStyle='#f7f4ed';c.fillRect(1200,0,1200,1600);
 const wash=c.createLinearGradient(1200,0,2400,1600);wash.addColorStop(0,'#e9e1ff');wash.addColorStop(.6,'#f7f4ed');wash.addColorStop(1,'#e2efff');c.fillStyle=wash;c.fillRect(1200,0,1200,1600);
 const text=(value:string,x:number,y:number,size:number,color:string,weight=500)=>{c.fillStyle=color;c.font=`${weight} ${size}px "Plus Jakarta Sans", sans-serif`;c.fillText(value,x,y);};
 text(data.label,1310,160,27,'#7151ad',750);
 text(data.title,1310,267,49,'#202545',800);
 text(data.subtitle,1310,328,25,'#676b83');
 data.rows.forEach(([title,detail],i)=>{
  const y=405+i*230;
  c.fillStyle='#ffffff';c.beginPath();c.roundRect(1290,y,1015,194,24);c.fill();
  c.fillStyle=i%2?'#e6eeff':'#efe6ff';c.beginPath();c.roundRect(1323,y+33,87,87,21);c.fill();
  text(String(i+1).padStart(2,'0'),1340,y+91,33,i%2?'#366ccb':'#7842b9',750);
  text(title,1443,y+73,35,'#272c49',750);text(detail,1443,y+126,25,'#70758b');
 });
 text(data.footer,1310,1435,28,'#7151ad',700);text('SekolaPro',1310,1510,25,'#777c91');text(`${String(index+1).padStart(2,'0')} / 04`,2130,1510,25,'#777c91');
 return canvas;
}
