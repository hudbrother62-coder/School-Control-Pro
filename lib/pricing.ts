// One monthly package. This is the source for landing, billing and checkout.
export const plans={
 monthly:{key:"monthly" as const,label:"SekolaPro · Bulanan",price:100000,days:30,caption:"Seluruh modul · 200 generator AI/bulan · template sekolah"}
};
export const rupiah=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
