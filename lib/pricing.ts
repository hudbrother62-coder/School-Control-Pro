// One package, two billing periods. This is the source for landing, billing and checkout.
export const plans={
 monthly:{key:"monthly" as const,label:"School Control Pro · Bulanan",price:199000,days:30,caption:"Seluruh modul · 200 generator AI/bulan · template sekolah"},
 yearly:{key:"yearly" as const,label:"School Control Pro · Tahunan",price:1990000,days:365,caption:"Seluruh modul · hemat setara 2 bulan"}
};
export const rupiah=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
