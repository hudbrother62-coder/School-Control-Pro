import {Play,ArrowUpRight} from 'lucide-react';
function demoSource(raw:string){
 try{
  const u=new URL(raw);if(u.protocol!=='https:')return null;
  const host=u.hostname.replace(/^www\./,'');
  if(host==='youtu.be'||host==='youtube.com'){
   const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();
   return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?{type:'embed',url:`https://www.youtube-nocookie.com/embed/${id}`} :null;
  }
  if(host==='vimeo.com'&&/^\/\d+$/.test(u.pathname))return {type:'embed',url:`https://player.vimeo.com/video${u.pathname}`};
  if(/\.(mp4|webm)$/i.test(u.pathname))return {type:'video',url:u.href};
 }catch{}return null;
}
export default function SekolaDemo(){
 const source=demoSource(process.env.NEXT_PUBLIC_DEMO_VIDEO_URL||'');
 return <section className="sp-demo" aria-labelledby="demo-title" id="demo"><div className="sp-demo-heading"><span className="sp-book-label">LIHAT SEKOLAPRO BEKERJA</span><h2 id="demo-title">Dari fitur ke kegiatan nyata.</h2><p>Kenali alur SekolaPro lewat video demo.</p></div><div className="sp-demo-player">{source?.type==='embed'?<iframe src={source.url} title="Video demo SekolaPro" loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen/>:source?.type==='video'?<video src={source.url} controls playsInline preload="metadata" aria-label="Video demo SekolaPro"/>:<div className="sp-demo-placeholder"><div className="sp-demo-play"><Play size={32}/></div><strong>Video demo SekolaPro</strong><span>Segera hadir di sini</span></div>}</div><a className="sp-button" href="/daftar">Coba SekolaPro <ArrowUpRight size={18}/></a></section>;
}
