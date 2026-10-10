"use client";
import {useSchoolRevision} from "@/lib/school-realtime";
import {errorMessage} from "@/lib/error-message";

import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type {User} from "@supabase/supabase-js";
import {LayoutDashboard,Users,Clock3,Activity,Sparkles,MessageSquare,BookOpen,ShieldAlert,HeartHandshake,School as SchoolIcon,ListChecks,Wallet,CreditCard,Settings,Moon,Sun,LogOut,Menu,X,ChevronRight,Plus,RefreshCw,ReceiptText,CalendarDays,KeyRound,CircleHelp,Warehouse,StickyNote} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import WorkspaceNavigation from "@/components/WorkspaceNavigation";

import {taskHelp} from "@/lib/workspace-help";
import {resolveWorkspaceRoute,readRouteHash,routeHash,guideFor} from "@/lib/workspace-navigation";
import LiveClock from "@/components/LiveClock";
import {modules,canAccess,visibleFeatures,navigationFeatures,isAdmin,ROLE_LABELS,type School,type Role,type ModuleKey,type Membership,type Staff} from "@/lib/modules";

const SupportChat=dynamic(()=>import("@/components/SupportChat"),{ssr:false});
const PanelLoading=()=> <div className="panel" role="status" aria-live="polite">Memuat fitur…</div>;
const PrincipalWorkspaceHub=dynamic(()=>import("@/components/PrincipalWorkspaceHub"),{loading:PanelLoading});
const UniversalOrchestrator=dynamic(()=>import("@/components/UniversalOrchestrator"),{loading:PanelLoading});
const StaffWorkflows=dynamic(()=>import("@/components/StaffWorkflows"),{loading:PanelLoading});
const SchoolData=dynamic(()=>import("@/components/SchoolData"),{loading:PanelLoading});
const MasterHubV2=dynamic(()=>import("@/components/MasterHubV2"),{loading:PanelLoading});
const AIWorkbench=dynamic(()=>import("@/components/AIWorkbench"),{loading:PanelLoading});
const DocumentCenter=dynamic(()=>import("@/components/DocumentCenter"),{loading:PanelLoading});
const Supervision=dynamic(()=>import("@/components/Supervision"),{loading:PanelLoading});
const SchoolProfile=dynamic(()=>import("@/components/SchoolProfile"),{loading:PanelLoading});
const CommandBoard=dynamic(()=>import("@/components/CommandBoard"),{loading:PanelLoading});
const FinancePanel=dynamic(()=>import("@/components/FinancePanel"),{loading:PanelLoading});
const PayrollPanel=dynamic(()=>import("@/components/PayrollPanel"),{loading:PanelLoading});
const BKPanel=dynamic(()=>import("@/components/BKPanel"),{loading:PanelLoading});
const LibraryPanel=dynamic(()=>import("@/components/LibraryPanel"),{loading:PanelLoading});
const SarprasPanel=dynamic(()=>import("@/components/SarprasPanel"),{loading:PanelLoading});
const AcademicAdvanced=dynamic(()=>import("@/components/AcademicAdvanced"),{loading:PanelLoading});
const WorkJournal=dynamic(()=>import("@/components/WorkJournal"),{loading:PanelLoading});
const SchoolNotes=dynamic(()=>import("@/components/SchoolNotes"),{loading:PanelLoading});
const WorkHub=dynamic(()=>import("@/components/WorkHub"),{loading:PanelLoading});
const TeachingJournal=dynamic(()=>import("@/components/TeachingJournal"),{loading:PanelLoading});
const GradeBook=dynamic(()=>import("@/components/GradeBook"),{loading:PanelLoading});
const DisciplinePanel=dynamic(()=>import("@/components/DisciplinePanel"),{loading:PanelLoading});
const DisciplineReportTemplate=dynamic(()=>import("@/components/DisciplineReportTemplate"),{loading:PanelLoading});
const DisciplineFollowupCenter=dynamic(()=>import("@/components/DisciplineFollowupCenter"),{loading:PanelLoading});
const DashboardOverview=dynamic(()=>import("@/components/DashboardOverview"),{loading:PanelLoading});
const PaymentWall=dynamic(()=>import("@/components/PaymentWall"),{loading:PanelLoading});
const BillingPanel=dynamic(()=>import("@/components/BillingPanel"),{loading:PanelLoading});
const PerformanceReviews=dynamic(()=>import("@/components/PerformanceReviews"),{loading:PanelLoading});
const SchoolCalendar=dynamic(()=>import("@/components/SchoolCalendar"),{loading:PanelLoading});
const AccessPanel=dynamic(()=>import("@/components/AccessPanel"),{loading:PanelLoading});
const GuideCenter=dynamic(()=>import("@/components/GuideCenter"),{loading:PanelLoading});
const AIProjectManager=dynamic(()=>import("@/components/AIProjectManager"),{loading:PanelLoading});
const AcademicLegacyParity=dynamic(()=>import("@/components/AcademicLegacyParity"),{loading:PanelLoading});
const DisciplineLegacyParity=dynamic(()=>import("@/components/DisciplineLegacyParity"),{loading:PanelLoading});
const ManagementLegacyParity=dynamic(()=>import("@/components/ManagementLegacyParity"),{loading:PanelLoading});
const HRLegacyParity=dynamic(()=>import("@/components/HRLegacyParity"),{loading:PanelLoading});
const FinanceLegacyParity=dynamic(()=>import("@/components/FinanceLegacyParity"),{loading:PanelLoading});
const CommandLegacyParity=dynamic(()=>import("@/components/CommandLegacyParity"),{loading:PanelLoading});
const WorkspaceTools=dynamic(()=>import("@/components/WorkspaceTools"),{loading:PanelLoading});
const SupervisorLegacyParity=dynamic(()=>import("@/components/SupervisorLegacyParity"),{loading:PanelLoading});
const ReportArchive=dynamic(()=>import("@/components/ReportArchive"),{loading:PanelLoading});
const ReportTemplateManager=dynamic(()=>import("@/components/ReportTemplateManager"),{loading:PanelLoading});
const ReportCenter=dynamic(()=>import("@/components/ReportCenter"),{loading:PanelLoading});

type SchoolAccess={school:School & {is_paused?:boolean};role:Role};
type Attendance={id:string;duty_date:string;check_in_at:string|null;check_out_at:string|null;status:string;source:string;user_id:string;notes:string|null};
type Summary={present_days:number;late_days:number;programs:number;trainings:number;verified_events:number};
const icons={journals:BookOpen,notes:StickyNote,overview:LayoutDashboard,master:Users,calendar:CalendarDays,reports:ReceiptText,attendance:Clock3,performance:Activity,guru_ai:Sparkles,assistant:MessageSquare,kepsek_ai:SchoolIcon,buku_kerja:BookOpen,disiplin:ShieldAlert,bk:HeartHandshake,library:BookOpen,sarpras:Warehouse,command:ListChecks,sikas:Wallet,gajian:CreditCard,payslip:ReceiptText,access:KeyRound,settings:Settings,help:CircleHelp};
const formatDate=(s:string|null|undefined)=>s?new Date(s).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}):"—";
const schoolDay=(tz:string)=>{const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=(k:string)=>p.find(x=>x.type===k)?.value||"";return get("year")+"-"+get("month")+"-"+get("day")};
function feedback(error:unknown){return errorMessage(error)}

export default function Home(){
 const db=useMemo(()=>browserDb(),[]);
 const [mounted,setMounted]=useState(false),[authReady,setAuthReady]=useState(false),[user,setUser]=useState<User|null>(null);
 const contentRef=useRef<HTMLDivElement>(null),drawerRef=useRef<HTMLDivElement>(null),navReady=useRef(false);
 const [schools,setSchools]=useState<SchoolAccess[]>([]),[schoolId,setSchoolId]=useState(""),[module,setModule]=useState<ModuleKey>("overview");
 const [loading,setLoading]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [refreshing,setRefreshing]=useState(false),[refreshNonce,setRefreshNonce]=useState(0),[signingOut,setSigningOut]=useState(false);
 const [accessSuspended,setAccessSuspended]=useState(false);
 const [theme,setTheme]=useState("light"),[openMenu,setOpenMenu]=useState(false),[expandedNav,setExpandedNav]=useState<ModuleKey|null>(null),[featureFocus,setFeatureFocus]=useState("Ringkasan Operasional");
 const [staff,setStaff]=useState<Staff[]>([]),[attendance,setAttendance]=useState<Attendance[]>([]);
 const [summary,setSummary]=useState<Summary|null>(null),[performanceUser,setPerformanceUser]=useState("");const [ownAttendance,setOwnAttendance]=useState<Attendance|null>(null);const [historyDate,setHistoryDate]=useState("");
 const [subscription,setSubscription]=useState<{status:string;trial_ends_at:string;current_period_end:string|null}|null>(null),[subscriptionSchoolId,setSubscriptionSchoolId]=useState("");
 const [entitlement,setEntitlement]=useState<boolean|null>(null),[entitlementSchool,setEntitlementSchool]=useState("");
 const revision=useSchoolRevision(user?"*":"");
 useEffect(()=>{if(!db||!user||!schoolId){setEntitlement(null);setEntitlementSchool("");return;}let alive=true;
 const check=async()=>{const {data,error:e}=await db.rpc("sc_member",{p_school:schoolId});if(alive){setEntitlement(!e&&data===true);setEntitlementSchool(schoolId);}};
 void check();const timer=setInterval(()=>void check(),30000);return()=>{alive=false;clearInterval(timer);};
 },[db,user,schoolId,revision]);
 const [clockTick,setClockTick]=useState(0);
 useEffect(()=>{const t=setInterval(()=>setClockTick(n=>n+1),30000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if(!db||!user)return;void db.rpc("sc_is_platform_admin").then(({data})=>{if(data===true&&window.location.pathname==="/app")window.location.replace("/admin")})},[db,user,revision]);
 const access=schools.find(s=>s.school.id===schoolId); const role=access?.role||"viewer";
 const selected=modules.find(m=>m.key===module)||modules[0]; const selectedFeatures=visibleFeatures(selected,role); const instructions=taskHelp(module,featureFocus); const visible=modules.filter(m=>canAccess(m,role)&&navigationFeatures(m,role).length>0);
 const isManager=isAdmin(role)||role==="hr";
 useEffect(()=>{setMounted(true);const saved=localStorage.getItem("sekolapro-theme")||localStorage.getItem("school-control-theme");const t=saved==="dark"?"dark":"light";setTheme(t);document.body.dataset.theme=t},[]);
 useEffect(()=>{if(!db)return;let active=true;void db.auth.getUser().then(({data})=>{if(!active)return;setUser(data.user);setAuthReady(true)}).catch(()=>{if(active)setAuthReady(true)}); const {data:{subscription:sub}}=db.auth.onAuthStateChange((_event,session)=>{if(!active)return;setUser(session?.user||null);setAuthReady(true)});return ()=>{active=false;sub.unsubscribe()};},[db]);
 useEffect(()=>{if(mounted&&authReady&&db&&!user)window.location.replace("/masuk")},[mounted,authReady,db,user]);
 useEffect(()=>{if(!db||!user){setSchools([]);setSchoolId("");return;}let active=true;(async()=>{
 const {data:m,error:e}=await db.from("sc_members").select("school_id,role,is_active").eq("user_id",user.id);
 if(e){if(active)setError(e.message);return;} if(active)setAccessSuspended((m||[]).length>0&&(m||[]).every(x=>x.is_active===false)); const memberships=((m||[]).filter(x=>x.is_active!==false)) as Membership[];
 const {data:s,error:se}=memberships.length?await db.from("sc_schools").select("id,name,timezone,is_paused").in("id",memberships.map(x=>x.school_id)): {data:[],error:null};
 if(se){if(active)setError(se.message);return;}
 const found=memberships.flatMap(x=>{const sch=(s||[]).find(y=>y.id===x.school_id);return sch?[{school:sch as School,role:x.role}]:[];});
 if(active){setSchools(found);setSchoolId(prev=>found.some(x=>x.school.id===prev)?prev:(found[0]?.school.id||""));}
 })();return ()=>{active=false};},[db,user,revision]);
 useEffect(()=>{if(!db||!schoolId||!user)return;let alive=true;(async()=>{
 let personalQuery=db.from("sc_attendance").select("id,duty_date,check_in_at,check_out_at,status,source,user_id,notes").eq("school_id",schoolId).eq("user_id",user.id).order("duty_date",{ascending:false}).limit(120);
 if(historyDate)personalQuery=personalQuery.eq("duty_date",historyDate);
 const [{data:a},{data:st},{data:sub}]=await Promise.all([
 personalQuery,
 db.from("sc_staff").select("id,school_id,user_id,name,position,shift_start,late_tolerance_minutes").eq("school_id",schoolId).order("name"),
 db.from("sc_subscriptions").select("status,trial_ends_at,current_period_end").eq("school_id",schoolId).maybeSingle()
 ]);if(alive){setAttendance((a||[]) as Attendance[]);setStaff((st||[]) as Staff[]);setSubscription(sub||null);setSubscriptionSchoolId(schoolId);}
 })();return ()=>{alive=false};},[db,schoolId,user,historyDate,revision]);
 useEffect(()=>{if(!db||!schoolId||!user)return;let alive=true;(async()=>{const {data}=await db.from("sc_attendance").select("*").eq("school_id",schoolId).eq("user_id",user.id).eq("duty_date",schoolDay(access?.school.timezone||"Asia/Jakarta")).maybeSingle();if(alive)setOwnAttendance((data||null) as Attendance|null);})();return ()=>{alive=false}},[db,schoolId,user,access?.school.timezone,revision]);
 useEffect(()=>{if(!db||!schoolId)return;let alive=true;(async()=>{
 if(module==="performance"){const {data,error:e}=await db.rpc("sc_performance_summary",{p_school:schoolId,p_user:performanceUser||user?.id});if(alive){setSummary((data||null) as Summary|null);if(e)setError(e.message);}}
 })();return ()=>{alive=false};},[db,schoolId,module,user,performanceUser,revision]);
 async function refresh(){if(!db||!schoolId||!user)return;let personalQuery=db.from("sc_attendance").select("*").eq("school_id",schoolId).eq("user_id",user.id).order("duty_date",{ascending:false}).limit(120);if(historyDate)personalQuery=personalQuery.eq("duty_date",historyDate);const [{data:a},{data:s}]=await Promise.all([personalQuery,db.from("sc_staff").select("id,school_id,user_id,name,position,shift_start,late_tolerance_minutes").eq("school_id",schoolId).order("name")]);setAttendance((a||[]) as Attendance[]);setStaff((s||[]) as Staff[]);const day=schoolDay(access?.school.timezone||"Asia/Jakarta");const {data:own}=await db.from("sc_attendance").select("*").eq("school_id",schoolId).eq("user_id",user!.id).eq("duty_date",day).maybeSingle();setOwnAttendance((own||null) as Attendance|null);if(module==="performance"){const {data}=await db.rpc("sc_performance_summary",{p_school:schoolId,p_user:performanceUser||user!.id});setSummary((data||null) as Summary|null)}}
 async function refreshWorkspace(){
  if(!db||!schoolId||!user||refreshing)return;
  setRefreshing(true);setError("");setMessage("");
  try{
   const day=schoolDay(access?.school.timezone||"Asia/Jakarta");
   let personalQuery=db.from("sc_attendance").select("id,duty_date,check_in_at,check_out_at,status,source,user_id,notes").eq("school_id",schoolId).eq("user_id",user.id).order("duty_date",{ascending:false}).limit(120);
    if(historyDate)personalQuery=personalQuery.eq("duty_date",historyDate);
    const [attendanceResult,staffResult,ownResult,subscriptionResult,membersResult]=await Promise.all([
    personalQuery,
    db.from("sc_staff").select("id,school_id,user_id,name,position,shift_start,late_tolerance_minutes").eq("school_id",schoolId).order("name"),
    db.from("sc_attendance").select("*").eq("school_id",schoolId).eq("user_id",user.id).eq("duty_date",day).maybeSingle(),
    db.from("sc_subscriptions").select("status,trial_ends_at,current_period_end").eq("school_id",schoolId).maybeSingle(),
    db.from("sc_members").select("school_id,role,is_active").eq("user_id",user.id)
   ]);
   for(const response of [attendanceResult,staffResult,ownResult,subscriptionResult,membersResult])if(response.error)throw response.error;
   const memberships=((membersResult.data||[]).filter(x=>x.is_active!==false)) as Membership[];
   const schoolResult=memberships.length?await db.from("sc_schools").select("id,name,timezone,is_paused").in("id",memberships.map(x=>x.school_id)):null;
   if(schoolResult?.error)throw schoolResult.error;
   const available=memberships.flatMap(x=>{const school=(schoolResult?.data||[]).find(s=>s.id===x.school_id);return school?[{school:school as School,role:x.role}]:[];});
   setAccessSuspended((membersResult.data||[]).length>0&&memberships.length===0);
   setSchools(available);
   setSchoolId(current=>available.some(x=>x.school.id===current)?current:(available[0]?.school.id||""));
   setAttendance((attendanceResult.data||[]) as Attendance[]);
   setStaff((staffResult.data||[]) as Staff[]);
   setOwnAttendance((ownResult.data||null) as Attendance|null);
   setSubscription(subscriptionResult.data||null);setSubscriptionSchoolId(schoolId);
   if(module==="performance"){
    const performance=await db.rpc("sc_performance_summary",{p_school:schoolId,p_user:performanceUser||user.id});
    if(performance.error)throw performance.error;
    setSummary((performance.data||null) as Summary|null);
   }
   // Remount the active module so every feature reloads its own data, not just staff attendance.
   setRefreshNonce(n=>n+1);
   setMessage("Data terbaru berhasil dimuat dari server.");
  }catch(e){setError("Gagal menyegarkan data: "+feedback(e))}finally{setRefreshing(false)}
 }
 async function signOut(){if(!db||signingOut)return;setSigningOut(true);setError("");try{const {error:e}=await db.auth.signOut();if(e)throw e;window.location.replace("/masuk")}catch(e){setError("Gagal keluar dari akun: "+feedback(e));setSigningOut(false)}}
 async function run(job:()=>Promise<void>){setLoading(true);setError("");setMessage("");try{await job()}catch(e){setError(feedback(e))}finally{setLoading(false)}}
 async function selfStaff(){if(!db)return;await run(async()=>{const {error:e}=await db.rpc("sc_ensure_own_staff",{p_school:schoolId});if(e)throw e;await refresh();setMessage("Profil SDM Anda telah diaktifkan.");});}
 async function clock(action:"sc_check_in_geo"|"sc_check_out_geo"){if(!db)return;await run(async()=>{const pos=await new Promise<{lat:number|null;lng:number|null;accuracy:number|null}>(resolve=>{if(!navigator.geolocation){resolve({lat:null,lng:null,accuracy:null});return}navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),()=>resolve({lat:null,lng:null,accuracy:null}),{enableHighAccuracy:true,timeout:7000,maximumAge:30000})});const {error:e}=await db.rpc(action,{p_school:schoolId,p_lat:pos.lat,p_lng:pos.lng,p_accuracy:pos.accuracy});if(e)throw e;await refresh();setMessage(action==="sc_check_in_geo"?"Presensi masuk tercatat dengan waktu server dan lokasi perangkat bila diizinkan.":"Presensi pulang tercatat.");});}
 async function checkout(plan:"monthly"="monthly"){if(!db)return;await run(async()=>{const {data:{session}}=await db.auth.getSession();if(!session)throw Error("Masuk kembali untuk melanjutkan.");const response=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({school_id:schoolId,plan})});const result=await response.json();if(!response.ok||!result.redirect_url)throw Error(result.error||"Checkout belum tersedia.");window.location.assign(result.redirect_url);});}
 async function checkSubscription(){if(!db||!schoolId)return;const {data,error:e}=await db.from("sc_subscriptions").select("status,trial_ends_at,current_period_end").eq("school_id",schoolId).maybeSingle();if(e)setError(e.message);else{setSubscription(data||null);setSubscriptionSchoolId(schoolId);if(data?.status==="active"&&data.current_period_end&&Date.parse(data.current_period_end)>Date.now())setMessage("Langganan aktif. Selamat kembali!")}}
 function changeTheme(){const next=theme==="light"?"dark":"light";setTheme(next);document.body.dataset.theme=next;localStorage.setItem("sekolapro-theme",next);}
 function choose(m:ModuleKey,feature=""){const target=resolveWorkspaceRoute(m,feature,role);if(!target){setError("Fitur ini tidak tersedia untuk peran Anda.");return}setModule(target.module);setFeatureFocus(target.feature);setExpandedNav(target.module);setOpenMenu(false);setError("");setMessage("");const hash=routeHash(target);if(window.location.hash!==hash)window.history.pushState(null,"",hash);window.scrollTo({top:0,behavior:"instant"});}
 useEffect(()=>{if(!schoolId)return;function restore(){const target=readRouteHash(window.location.hash,role)||resolveWorkspaceRoute("overview","",role)!;setModule(target.module);setFeatureFocus(target.feature);setExpandedNav(target.module);setOpenMenu(false);setError("");setMessage("");window.history.replaceState(null,"",routeHash(target));window.scrollTo({top:0,behavior:"instant"});}restore();navReady.current=true;window.addEventListener("popstate",restore);window.addEventListener("hashchange",restore);return()=>{window.removeEventListener("popstate",restore);window.removeEventListener("hashchange",restore)}},[schoolId,role]);
 useEffect(()=>{if(!navReady.current)return;contentRef.current?.focus({preventScroll:true});},[module,featureFocus]);
 useEffect(()=>{if(!openMenu)return;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";drawerRef.current?.querySelector<HTMLElement>("button")?.focus();function keys(e:KeyboardEvent){if(e.key==="Escape"){setOpenMenu(false);return}if(e.key!=="Tab")return;const nodes=drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}document.addEventListener("keydown",keys);return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",keys);previous?.focus({preventScroll:true})}},[openMenu]);
 if(!mounted)return <div className="authwrap"><div className="panel">Memuat SekolaPro…</div></div>;
 if(!db)return <div className="authwrap"><div className="authbox panel"><img width="48" src="/sekola-pro-mark.svg" alt="SekolaPro"/><h1>SekolaPro</h1><p>Fondasi aplikasi siap. Hubungkan proyek Supabase khusus melalui environment Vercel untuk mengaktifkan login dan penyimpanan nyata.</p><p className="hint">NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum terisi. Mode data palsu sengaja tidak disediakan.</p></div></div>;
 if(!authReady)return <div className="authwrap"><div className="panel">Memeriksa sesi akun…</div></div>;
 if(!user)return <div className="authwrap"><div className="panel">Kembali ke beranda…</div></div>;
 if(!schoolId&&accessSuspended)return <div className="authwrap"><div className="authbox panel"><img width="45" src="/sekola-pro-mark.svg" alt="SekolaPro"/><h1>Akun sementara dinonaktifkan</h1><p>Akses sekolah sedang ditangguhkan oleh pengelola. Akun ini tidak dapat membuka modul maupun melakukan presensi sampai diaktifkan kembali.</p><p className="muted">Hubungi kepala sekolah atau Super Admin untuk informasi lebih lanjut.</p><button className="button secondary" onClick={()=>void db.auth.signOut()}>Keluar</button></div></div>;
 if(!schoolId)return <div className="authwrap"><div className="authbox panel"><img width="46" src="/sekola-pro-mark.svg" alt=""/><h1>Akses sekolah belum tersedia</h1><p>Pengelola SekolaPro akan menghubungkan akun Anda ke sekolah. Akun dan langganan baru hanya dibuat oleh Super Admin.</p><button className="button secondary" onClick={()=>void db.auth.signOut()}>Keluar</button>{error&&<p className="banner error">{error}</p>}</div></div>;
const myStaff=staff.find(s=>s.user_id===user.id);const myAttendance=ownAttendance;const today=new Date().toLocaleDateString("id-ID",{timeZone:access?.school.timezone||"Asia/Jakarta",day:"numeric",month:"long",year:"numeric"});
 const myAttendanceLabel=myAttendance?.check_out_at?"Hari kerja selesai":myAttendance?.check_in_at?(myAttendance.status==="late"?"Hadir · terlambat":"Sudah hadir"):"Belum hadir";
 const navProps={items:visible,role,module,feature:featureFocus,expanded:expandedNav,icons,onChoose:choose,onExpand:setExpandedNav};
 if(subscriptionSchoolId!==schoolId||entitlementSchool!==schoolId)return <div className="authwrap"><div className="panel">Memeriksa izin dan masa aktif sekolah…</div></div>;
 const subscriptionOpen=entitlement===true&&!!subscription&&subscription.status==="active"&&!access?.school.is_paused&&!!subscription.current_period_end&&Date.parse(subscription.current_period_end)>Date.now();
 if(!subscriptionOpen)return <div><div className="flow" style={{justifyContent:"space-between",padding:"16px 22px"}}><Link href="/" className="lp-brand"><img src="/sekola-pro-mark.svg" alt="" width={35} height={35}/><strong>SekolaPro</strong></Link><div className="flow"><button className="button secondary" onClick={()=>void db.auth.signOut()}>Keluar</button></div></div><SupportChat key={schoolId} schoolId={schoolId} schoolName={access?.school.name||"Sekolah"} userId={user.id}/>{error&&<div className="banner error" role="alert">{error}</div>}<PaymentWall schoolName={access?.school.name||"Sekolah"} trialEnd={subscription?.trial_ends_at||new Date().toISOString()} status={subscription?.status||"unknown"} owner={role==="owner"} paused={!!access?.school.is_paused} busy={loading} onCheckout={plan=>void checkout(plan)} onRefresh={()=>void checkSubscription()}/></div>;
 return <div className="shell">
  <aside className="side"><div className="brand"><img src="/sekola-pro-mark.svg" alt=""/><div><strong>SekolaPro</strong><small>Satu Sistem, Semua Urusan Sekolah</small></div></div><WorkspaceNavigation {...navProps}/></aside>
  <main className="main" aria-hidden={openMenu?true:undefined}><header className="top"><div className="top-title">{schools.length>1?<label className="school-switch"><select aria-label="Pilih sekolah" value={schoolId} onChange={e=>setSchoolId(e.target.value)}>{schools.map(x=><option key={x.school.id} value={x.school.id}>{x.school.name}</option>)}</select><small>{ROLE_LABELS[role]}</small></label>:<small>{access?.school.name} · {ROLE_LABELS[role]}</small>}<h1>{featureFocus||selected.label}</h1></div><div className="actions" role="group" aria-label="Aksi cepat SekolaPro"><button type="button" className="iconbutton mobile-menu-trigger" aria-label="Buka menu" onClick={()=>setOpenMenu(true)}><Menu size={18}/></button><button type="button" className="iconbutton" title="Petunjuk fitur" aria-label="Petunjuk menu ini" onClick={()=>choose("help",guideFor(module))}><CircleHelp size={18}/></button><WorkspaceTools schoolId={schoolId} role={role} refreshSignal={refreshNonce} onRoute={(m,f)=>choose(m,f||"")}/><button type="button" className="iconbutton" aria-label={theme==="light"?"Aktifkan tema gelap":"Aktifkan tema terang"} title={theme==="light"?"Mode gelap":"Mode terang"} onClick={changeTheme}>{theme==="light"?<Moon size={17}/>:<Sun size={17}/>}</button><button type="button" className={"iconbutton "+(refreshing?"refreshing":"")} aria-label={refreshing?"Sedang menyegarkan data":"Segarkan data halaman ini"} title={refreshing?"Memperbarui data…":"Segarkan data"} aria-busy={refreshing} disabled={refreshing} onClick={()=>void refreshWorkspace()}><RefreshCw size={17}/></button><button type="button" className="iconbutton" aria-label="Keluar" title="Keluar dari akun" disabled={signingOut} onClick={()=>void signOut()}><LogOut size={17}/></button></div></header>

  <div className="content" key={schoolId+":"+module+":"+featureFocus+":"+refreshNonce} ref={contentRef} tabIndex={-1} aria-label={featureFocus||selected.label}>{error&&<div role="alert" className="banner error">{error}</div>}{message&&<div role="status" className="banner success">{message}</div>}
  {module!=="help"&&<details className="task-help"><summary>Petunjuk {featureFocus||selected.label}</summary><p>{instructions.purpose}</p><p><b>Sebelum mulai:</b> {instructions.before}</p><ol>{instructions.steps.map(s=><li key={s}>{s}</li>)}</ol><p><b>Hasil:</b> {instructions.result}</p><button className="button secondary" onClick={()=>choose("help",guideFor(module))}>Buka panduan lengkap</button></details>}
  {module==="journals"&&<WorkJournal schoolId={schoolId} userId={user.id} role={role} focus={featureFocus} onRoute={(m,f)=>choose(m,f||"")}/>}
   {module==="notes"&&<SchoolNotes schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>}
  {module==="overview"&&<>{featureFocus==="Ruang Kerja"&&<WorkHub role={role} onRoute={(m,f)=>choose(m,f||"")}/>}<DashboardOverview schoolId={schoolId} userId={user.id} role={role} focus={featureFocus} onRoute={(m,f)=>choose(m,f||"")}/>{(!featureFocus||featureFocus==="Agenda & Deadline")&&<SchoolCalendar timezone={access?.school.timezone||"Asia/Jakarta"} schoolId={schoolId} userId={user.id} role={role} compact/>}</>}
  {module==="master"&&<MasterHubV2 schoolId={schoolId} role={role} focus={featureFocus}/>}
  {module==="calendar"&&<SchoolCalendar timezone={access?.school.timezone||"Asia/Jakarta"} schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>}
  {module==="attendance"&&<>
  {(!featureFocus||["Presensi Saya","Check-in/check-out"].includes(featureFocus))&&<section className="panel attendance-workspace">
   <div className="attendance-heading">
    <div><span className="attendance-eyebrow">KEHADIRAN PEGAWAI · BUKAN PRESENSI SISWA</span><h2>Presensi kerja hari ini</h2><p>Untuk tugas di <strong>{access?.school.name||"sekolah Anda"}</strong>. Kehadiran dicatat atas nama akun Anda sendiri.</p></div>
    <span className="pill">{myAttendanceLabel}</span>
   </div>
   <div className="attendance-context-grid">
    <div><small>Tanggal kehadiran</small><strong>{today}</strong></div>
    <div><small>Nama & jabatan</small><strong>{myStaff?.name||"Profil SDM belum aktif"}</strong><span>{myStaff?.position||ROLE_LABELS[role]}</span></div>
    <div><small>Jadwal mulai</small><strong>{myStaff?.shift_start?.slice(0,5)||"Belum diatur"}</strong><span>Waktu sekolah · <LiveClock timezone={access?.school.timezone||"Asia/Jakarta"}/></span></div>
   </div>
   {myStaff&&<div className="attendance-time-grid">
    <div className="attendance-time-card"><small>Jam masuk tercatat</small><strong>{myAttendance?.check_in_at?formatDate(myAttendance.check_in_at):"—"}</strong></div>
    <div className="attendance-time-card"><small>Jam pulang tercatat</small><strong>{myAttendance?.check_out_at?formatDate(myAttendance.check_out_at):"—"}</strong></div>
   </div>}
   {!myStaff?<div className="banner"><span>Hubungkan profil SDM sebelum mencatat kehadiran.</span> <button className="button secondary" disabled={loading} onClick={()=>void selfStaff()}>Aktifkan Profil SDM</button></div>:!myAttendance?.check_in_at?
    <button type="button" className="button attendance-primary-action" disabled={loading} onClick={()=>void clock("sc_check_in_geo")}>{loading?"Memproses…":"Catat Kehadiran Hari Ini"}</button>
    :!myAttendance.check_out_at?
    <div className="attendance-followup"><p>Kehadiran hari ini <strong>sudah tercatat</strong>. Jika selesai bekerja, tambahkan jam pulang pada catatan yang sama.</p><button type="button" className="button secondary" disabled={loading} onClick={()=>void clock("sc_check_out_geo")}>{loading?"Memproses…":"Catat Jam Pulang"}</button></div>
    :<p className="attendance-complete">Kehadiran dan jam pulang hari ini sudah tercatat.</p>}
   <p className="attendance-note">Satu pegawai hanya memiliki satu catatan kehadiran per tanggal. Pencatatan pulang tidak membuat absensi kedua. Lokasi GPS mengikuti pengaturan sekolah bila diwajibkan.</p>
  </section>}
  {(!featureFocus||["Presensi Saya","Check-in/check-out","Riwayat Kehadiran","Riwayat kehadiran"].includes(featureFocus))&&<section className="panel attendance-history">
   <div className="attendance-history-heading"><div><h2>Riwayat kehadiran saya</h2><p>Hanya catatan akun Anda. Rekap pegawai lain ada di menu Kehadiran Tim.</p></div>
    <div className="attendance-date-filter"><label htmlFor="personal-attendance-date">Cari tanggal</label><input id="personal-attendance-date" type="date" value={historyDate} onChange={e=>setHistoryDate(e.target.value)}/>{historyDate&&<button type="button" className="button secondary" onClick={()=>setHistoryDate("")}>Semua tanggal</button>}</div>
   </div>
   <div className="tablewrap"><table className="data-table"><thead><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr></thead><tbody>{attendance.filter(a=>a.user_id===user.id).map(a=><tr key={a.id}><td>{a.duty_date}</td><td>{formatDate(a.check_in_at)}</td><td>{formatDate(a.check_out_at)}</td><td><span className="pill">{a.status==="late"?"Terlambat":a.status==="present"?"Hadir":a.status}</span></td></tr>)}</tbody></table>{!attendance.length&&<div className="empty">Tidak ada catatan pada tanggal yang dipilih.</div>}</div>
   {!historyDate&&<p className="attendance-note">Menampilkan hingga 120 catatan terbaru. Pilih tanggal untuk mencari arsip lebih lama.</p>}
  </section>}
 {(!featureFocus||["Jadwal & Shift","Jadwal/shift"].includes(featureFocus))&&(isManager?<HRLegacyParity schoolId={schoolId} userId={user.id} role={role} staff={staff} focus="Jadwal Kerja"/>:<StaffWorkflows focus="Jadwal & Shift" kind="staff" schoolId={schoolId} userId={user.id} role={role} staff={staff} onChanged={refresh}/>)}
 {(!featureFocus||["Koreksi Presensi","Koreksi beralasan"].includes(featureFocus))&&<StaffWorkflows focus="Koreksi Presensi" kind="attendance" schoolId={schoolId} userId={user.id} role={role} staff={staff} onChanged={refresh}/>}
 {featureFocus==="Lokasi Presensi"&&<HRLegacyParity schoolId={schoolId} userId={user.id} role={role} staff={staff} focus="Lokasi Presensi"/>}
 {featureFocus==="Kehadiran Tim"&&<SupervisorLegacyParity schoolId={schoolId} userId={user.id} role={role} staff={staff} focus="Kehadiran Tim"/>}
 {(!featureFocus||["Izin & Cuti","Izin","Cuti"].includes(featureFocus))&&<StaffWorkflows focus={featureFocus==="Izin"||featureFocus==="Cuti"?featureFocus:"Izin & Cuti"} kind="leave" schoolId={schoolId} userId={user.id} role={role} staff={staff} onChanged={refresh}/>}
 </>}
 {module==="performance"&&<>
 {(!featureFocus||featureFocus==="Kehadiran")&&<><div className="banner">Rekap faktual untuk pembinaan dan evaluasi. Tidak ada skor otomatis yang menentukan baik/buruknya seorang guru.</div>{isManager&&<div className="panel"><label className="field">Lihat rekap SDM<select value={performanceUser} onChange={e=>setPerformanceUser(e.target.value)}><option value="">Diri sendiri</option>{staff.filter(x=>x.user_id&&x.user_id!==user.id).map(x=><option key={x.id} value={x.user_id!}>{x.name}</option>)}</select></label></div>}<div className="grid"><div className="card"><label>Hari hadir tercatat</label><strong>{summary?.present_days??"—"}</strong></div><div className="card"><label>Hari terlambat pribadi</label><strong>{summary?.late_days??"—"}</strong></div><div className="card"><label>Partisipasi program</label><strong>{summary?.programs??"—"}</strong></div><div className="card"><label>Pelatihan</label><strong>{summary?.trainings??"—"}</strong></div></div></>}
 {(!featureFocus||["Bukti Kinerja & Pengembangan","Partisipasi program","Pelatihan","Bukti capaian"].includes(featureFocus))&&<StaffWorkflows focus={featureFocus} kind="performance" schoolId={schoolId} userId={user.id} role={role} staff={staff} onChanged={refresh}/>}
 {(!featureFocus||["Evaluasi","Tanggapan guru"].includes(featureFocus))&&<PerformanceReviews schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus}/>}
 </>}
 {module==="reports"&&<>{featureFocus==="Template Laporan Sekolah"?<ReportTemplateManager schoolId={schoolId} role={role}/>:featureFocus==="Arsip Laporan"?<ReportArchive schoolId={schoolId} role={role}/>:<ReportCenter schoolId={schoolId} role={role} focus={featureFocus} onRoute={(m,f)=>choose(m,f||"")}/>}</>}
 {module==="access"&&<AccessPanel schoolId={schoolId} role={role} focus={featureFocus}/>}
 {module==="help"&&<GuideCenter role={role} focus={featureFocus} onRoute={(m,f)=>choose(m,f||"")}/>}
 {module==="settings"&&<>
 {(!featureFocus||!["Langganan","Undang anggota"].includes(featureFocus))&&<SchoolProfile schoolId={schoolId} role={role} focus={featureFocus}/>}
 {(!featureFocus||featureFocus==="Langganan")&&<BillingPanel schoolId={schoolId} isOwner={role==="owner"}/> }
 </>}
 {module==="assistant"&&<>
 {featureFocus==="Asisten Guru"&&<AIProjectManager schoolId={schoolId} module="guru_ai" mode="chat"/>}
 {featureFocus==="Asisten Kepala Sekolah"&&<AIProjectManager schoolId={schoolId} module="kepsek_ai" mode="chat"/>}
 {featureFocus==="Asisten Kelas"&&<AcademicLegacyParity schoolId={schoolId} userId={user.id} role={role} focus="Asisten Kelas"/>}
 {featureFocus==="Universal AI Orchestrator"&&<UniversalOrchestrator schoolId={schoolId} role={role} onRoute={(m,f)=>choose(m,f||"")}/>}
 </>}
 {module==="guru_ai"&&<>
 {featureFocus==="Proyek Pembelajaran"&&<><AIProjectManager schoolId={schoolId} module="guru_ai" mode="projects"/><AIWorkbench schoolId={schoolId} module="guru_ai" focus="Proyek Pembelajaran"/></>}
 {featureFocus==="Riwayat draf"&&<AIProjectManager schoolId={schoolId} module="guru_ai" mode="outputs"/>}
 {(!featureFocus||!["Proyek Pembelajaran","Riwayat draf","Dokumen Pembelajaran"].includes(featureFocus))&&<AIWorkbench module="guru_ai" schoolId={schoolId} focus={featureFocus}/>}
 {featureFocus==="Dokumen Pembelajaran"&&<DocumentCenter schoolId={schoolId} userId={user.id} role={role} teacherOnly focus={featureFocus}/>}
 </>}
  {module==="kepsek_ai"&&<>
  <PrincipalWorkspaceHub focus={featureFocus} onChoose={f=>choose("kepsek_ai",f)}/>
 {(!featureFocus||["PBD/EDS","KSP/KOSP","RKJM","RKT","RKAS","SOP"].includes(featureFocus))&&<AIWorkbench module="kepsek_ai" schoolId={schoolId} focus={featureFocus}/>}
 {(!featureFocus||["Pusat dokumen","Persetujuan dokumen"].includes(featureFocus))&&<DocumentCenter schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>}
 {featureFocus==="Asisten Kepsek"&&<AIProjectManager schoolId={schoolId} module="kepsek_ai" mode="chat"/>}
 {["Kinerja Kepala Sekolah","Workflow Dokumen","Sumber Dokumen","Pustaka Format"].includes(featureFocus)&&<ManagementLegacyParity schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus}/>}
 {featureFocus==="Arsip Laporan"&&<ReportArchive schoolId={schoolId} role={role}/>}
 {(!featureFocus||featureFocus==="Supervisi guru")&&<Supervision schoolId={schoolId} role={role} staff={staff} userId={user.id}/>}
 {!featureFocus&&<SchoolProfile schoolId={schoolId} role={role}/>}
 </>}
 {module==="buku_kerja"&&<>
 {["Mode Kerja Guru","Jadwal Mingguan","Asisten Kelas","Laporan Lengkap"].includes(featureFocus)&&<AcademicLegacyParity schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>}
 {["Agenda Mengajar","Import/Export Excel"].includes(featureFocus)&&<SchoolData mode="academic" schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>}
 {featureFocus==="Lembar Nilai"&&<GradeBook schoolId={schoolId} userId={user.id} role={role}/>}
 {featureFocus==="Jurnal Mengajar"&&<TeachingJournal schoolId={schoolId} userId={user.id} role={role}/>}
 {["Presensi Siswa","Rekap Bulanan","Laporan Kelas","Laporan Kehadiran"].includes(featureFocus)&&<AcademicAdvanced schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>}
 </>}
  {module==="disiplin"&&(["Rekap & Laporan","Pengingat Disiplin"].includes(featureFocus)?<DisciplineFollowupCenter schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>:["Analitik Disiplin","Arsip Siswa","Import Riwayat","Surat & Dokumen"].includes(featureFocus)?<DisciplineLegacyParity schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>:featureFocus.toLowerCase().includes("template")?<DisciplineReportTemplate schoolId={schoolId} role={role}/>:<DisciplinePanel schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>)}
  {module==="command"&&(["Verifikasi Bukti","Tindak Lanjut Rapat","Laporan Program"].includes(featureFocus)?<CommandLegacyParity schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus}/>:<CommandBoard schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus}/>)}
  {module==="sikas"&&(["WhatsApp Tagihan","Tim Keuangan"].includes(featureFocus)?<FinanceLegacyParity schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>:<FinancePanel schoolId={schoolId} userId={user.id} focus={featureFocus}/>)}
  {module==="gajian"&&(featureFocus==="Slip Gaji Saya"?<PayrollPanel schoolId={schoolId} role={role} staff={staff} selfOnly focus="Riwayat Slip"/>:["Tim SDM","Tim Saya","Kehadiran Tim","Approval Tim","Rekap Tim"].includes(featureFocus)?<SupervisorLegacyParity schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus}/>:["Pengajuan SDM","Lembur","Kasbon","Reimburse","Jadwal Kerja","Lokasi Presensi","Komponen Dinamis","Rekrutmen"].includes(featureFocus)?<HRLegacyParity schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus}/>:<PayrollPanel schoolId={schoolId} role={role} staff={staff} focus={featureFocus}/>)}
  {module==="payslip"&&<PayrollPanel schoolId={schoolId} role={role} staff={staff} selfOnly focus={featureFocus}/>}
  {module==="bk"&&<BKPanel schoolId={schoolId} userId={user.id} role={role} focus={featureFocus}/>} 
  {module==="library"&&<LibraryPanel schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus} onRoute={(m,f)=>choose(m,f||"")}/>}
  {module==="sarpras"&&<SarprasPanel schoolId={schoolId} userId={user.id} role={role} staff={staff} focus={featureFocus} onRoute={(m,f)=>choose(m,f||"")}/>}
  </div></main>
  {openMenu&&<div className="mobiledrawer" onClick={e=>{if(e.target===e.currentTarget)setOpenMenu(false)}}><div className="drawer-panel" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div className="drawer-head"><strong id="drawer-title">Menu sekolah</strong><button className="iconbutton" aria-label="Tutup menu" onClick={()=>setOpenMenu(false)}><X size={20}/></button></div><WorkspaceNavigation {...navProps}/></div></div>}
  <SupportChat key={schoolId} schoolId={schoolId} schoolName={access?.school.name||"Sekolah"} userId={user.id}/>
  <nav className="bottomnav" aria-label="Navigasi utama">{(["overview","calendar","attendance",visible.some(m=>m.key==="assistant")?"assistant":"help"] as ModuleKey[]).filter((k,i,a)=>visible.some(m=>m.key===k)&&a.indexOf(k)===i).map(k=>{const Icon=icons[k];return <button key={k} className={module===k?"active":""} onClick={()=>choose(k)}><Icon size={20}/>{k==="attendance"?"Kehadiran":k==="assistant"?"Asisten AI":modules.find(x=>x.key===k)?.label}</button>})}<button onClick={()=>setOpenMenu(true)}><Menu size={20}/>Menu</button></nav>
 </div>;
}
