// Server-side price source. Both website and Midtrans checkout import the same values.
const configured=(key:string, fallback:number)=>{const n=Number(process.env[key]);return Number.isSafeInteger(n)&&n>0?n:fallback;};
export const plans={
 monthly:{key:"monthly" as const,label:"Bulanan",price:configured("SCHOOL_CONTROL_MONTHLY_PRICE_IDR",79000),days:30,caption:"Tagihan untuk 30 hari"},
 yearly:{key:"yearly" as const,label:"Tahunan",price:configured("SCHOOL_CONTROL_YEARLY_PRICE_IDR",790000),days:365,caption:"Tagihan untuk 365 hari"}
};
export const rupiah=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
