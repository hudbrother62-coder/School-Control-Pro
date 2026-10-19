// Paket resmi SekolaPro. Aktivasi selalu melalui konfirmasi pembayaran Super Admin.
export const plans={
 monthly:{key:"monthly" as const,label:"SekolaPro · Bulanan",price:99000,days:30,caption:"Seluruh modul · 200 generator AI/bulan · template sekolah"},
 lifetime:{key:"lifetime" as const,label:"SekolaPro · Sekali Beli",price:299000,days:null,caption:"Sekali bayar · akses seterusnya untuk satu sekolah"}
};
export const rupiah=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
