/* Browser-only QA data. Never submitted to production. */
module.exports=({schoolId,userId,staffId,studentId,date,role})=>{
 const stamp=date+'T08:00:00Z';
 const id=(table,i)=>table.toString(16).padStart(8,'0')+'-aaaa-4aaa-8aaa-'+String(i).padStart(12,'0');
 const rows=(table,fn)=>[1,2,3].map(i=>({id:id(table,i),school_id:schoolId,created_at:stamp,updated_at:stamp,notes:'Data QA untuk pengujian',...fn(i)}));
 const tables={
 sc_notes:()=>rows(10,i=>({author_id:userId,scope:i===1?'personal':'role',target_role:i===1?null:role(),title:'QA Catatan '+i,body:'Catatan QA dengan teks panjang untuk memastikan tampilan dapat dibaca pada layar HP.',is_pinned:i===1,archived_at:null})),
 sc_library_titles:()=>rows(11,i=>({title:'QA Buku Referensi Pembelajaran '+i,author:'Tim Guru QA',publisher:'Penerbit QA',publication_year:2026,isbn:'978000000000'+i,classification:'370',category:'Buku Referensi',shelf_location:'Rak A',source:'BOSP',purchase_price:150000,active:true})),
 sc_library_copies:()=>rows(12,i=>({title_id:id(11,i),inventory_code:'QA-PERP-'+i,barcode:null,condition:'Baik',status:'available',acquired_at:date})),
 sc_library_loans:()=>rows(13,i=>({copy_id:id(12,i),borrower_type:'student',borrower_id:studentId,borrower_name:'Siswa QA '+i,borrowed_at:stamp,due_at:date,returned_at:null,status:'active'})),
 sc_library_visits:()=>rows(14,i=>({visitor_type:'student',visitor_id:studentId,visitor_name:'Siswa QA '+i,purpose:'Literasi',visited_at:stamp})),
 sc_library_acquisitions:()=>rows(15,i=>({title_id:id(11,i),item_title:'QA Pengadaan Buku '+i,supplier:'Vendor QA',source_fund:'BOSP',quantity:3,unit_price:150000,ordered_at:date,received_at:null,status:'ordered'})),
 sc_sarpras_rooms:()=>rows(20,i=>({code:'QA-R-'+i,name:'QA Ruangan Pembelajaran '+i,building:'Gedung A',floor:'1',capacity:30,condition:'Baik',status:'active'})),
 sc_sarpras_items:()=>rows(21,i=>({item_type:i===3?'consumable':'asset',name:'QA Perangkat Pembelajaran '+i,brand:'Merek QA',model:'Model QA',category:'Elektronik',inventory_code:'QA-SPR-'+i,room_id:id(20,i),unit:'unit',quantity:3,min_stock:4,condition:'Baik',status:'available',acquired_at:date,acquisition_source:'BOSP',acquisition_price:12500000,custodian_staff_id:staffId})),
 sc_sarpras_requests:()=>rows(22,i=>({kind:'item_loan',item_id:id(21,i),room_id:id(20,i),requester_user_id:userId,requester_name:'Guru QA '+i,quantity:1,purpose:'Penggunaan perangkat untuk kegiatan pembelajaran '+i,start_at:stamp,end_at:stamp,priority:'normal',status:'submitted'})),
 sc_sarpras_maintenance:()=>rows(23,i=>({item_id:id(21,i),issue:'QA Pemeriksaan perangkat '+i,action:null,vendor:'Teknisi QA',cost:125000,priority:'normal',status:'open',due_at:date})),
 sc_sarpras_procurements:()=>rows(24,i=>({item_type:'asset',item_name:'QA Pengadaan perangkat '+i,brand:'Merek QA',quantity:3,unit:'unit',unit_price:1200000,fund_source:'BOSP',status:'requested',ordered_at:date})),
 sc_sarpras_stocktakes:()=>rows(25,i=>({title:'QA Opname inventaris '+i,room_id:id(20,i),status:'active',started_at:stamp})),
 sc_sarpras_stocktake_items:()=>rows(26,i=>({stocktake_id:id(25,i),item_id:id(21,i),expected_quantity:3,counted_quantity:null,expected_condition:'Baik',observed_condition:null,result:'unchecked'})),
 sc_programs:()=>rows(30,i=>({title:'QA Program kegiatan sekolah '+i,status:'todo',deadline:date,pic_id:userId,owner_id:userId,archived_at:null})),
 sc_program_tasks:()=>rows(31,i=>({program_id:id(30,i),title:'QA Tindak lanjut kegiatan '+i,status:'todo',pic_id:userId,due_at:date,problem:null,result:null,archived_at:null})),
 sc_finance_transactions:()=>rows(40,i=>({occurred_at:date,kind:i===3?'expense':'income',category:'Kegiatan Sekolah',amount:123456789,account_id:'88888888-8888-4888-8888-888888888888',description:'QA Transaksi kegiatan sekolah '+i,number:'QA-TX-'+i,activity_name:'Kegiatan QA',proof_path:null,status:'posted'})),
 sc_budget_lines:()=>rows(41,i=>({fiscal_year:2026,category:'QA Anggaran '+i,amount:123456789,source_fund:'BOSP',activity_name:'Kegiatan QA'})),
 };
 return tables;
};
