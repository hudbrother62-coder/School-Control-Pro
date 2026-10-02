function nameValue(value:string){const name=value.trim();if(name.length<2||name.length>120)throw Error('Nama harus 2–120 karakter.');return name;}
export function nonnegativeAmount(value:string|number){if(String(value).trim()==='')throw Error('Nominal wajib diisi.');const amount=Number(value);if(!Number.isFinite(amount)||amount<0)throw Error('Nominal harus angka nol atau lebih.');return amount;}
export function scheduleValues(name:string,start:string,end:string,tolerance:string|number){
 const pattern=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!pattern.test(start)||!pattern.test(end)||start>=end)throw Error('Jam selesai harus setelah jam mulai dengan format HH:MM.');
 const minutes=Number(tolerance);if(String(tolerance).trim()===''||!Number.isInteger(minutes)||minutes<0||minutes>180)throw Error('Toleransi harus bilangan bulat 0–180 menit.');
 return {name:nameValue(name),start_time:start,end_time:end,late_tolerance_minutes:minutes};
}
export function locationValues(name:string,latitude:string|number,longitude:string|number,radius:string|number){
 const lat=Number(latitude),lng=Number(longitude),meters=Number(radius);
 if(String(latitude).trim()===''||String(longitude).trim()===''||!Number.isFinite(lat)||!Number.isFinite(lng)||lat< -90||lat>90||lng< -180||lng>180)throw Error('Isi latitude dan longitude GPS yang valid.');
 if(!Number.isInteger(meters)||meters<20||meters>5000)throw Error('Radius harus bilangan bulat 20–5.000 meter.');
 return {name:nameValue(name),latitude:lat,longitude:lng,radius_meters:meters};
}
