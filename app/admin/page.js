import LogoutButton from '../components/LogoutButton';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '../../lib/supabase/server';

export const dynamic='force-dynamic';
export default async function AdminPage(){
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)redirect('/login');
 const {data:role,error:roleError}=await supabase.from('k4k_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError||!role)return <main style={{background:'#0d100d',color:'#fff',minHeight:'100vh',padding:'50px 6%'}}><h1>Access restricted</h1><p>This dashboard is only for K4K Academy administrators.</p><Link href="/academy" style={{color:'#caff39'}}>Return to Academy</Link></main>;
 const {data:summary,error}=await supabase.rpc('k4k_admin_summary');
 const metrics=[['Registered users',summary?.registered_users],['Academy students',summary?.academy_students],['Membership records',summary?.memberships],['Active memberships',summary?.active_memberships],['Academy orders',summary?.orders],['Paid Academy orders',summary?.paid_orders]];
 return <main style={{background:'#0d100d',color:'#f8fff0',minHeight:'100vh',padding:'32px max(5%,20px)',fontFamily:'Arial,sans-serif'}}>
 <nav style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><Link href="/" style={{color:'#caff39',fontWeight:900,textDecoration:'none'}}>K4K ACADEMY</Link><div style={{display:"flex",alignItems:"center",gap:16}}><Link href="/academy" style={{color:"#fff"}}>View student experience →</Link><LogoutButton/></div></nav>
 <div style={{marginTop:60,marginBottom:32}}><p style={{color:'#caff39',fontWeight:800,letterSpacing:3}}>OWNER CONTROL CENTER</p><h1 style={{fontSize:'clamp(36px,6vw,72px)',lineHeight:1,margin:'12px 0'}}>ADMIN DASHBOARD.</h1><p style={{color:'#b4bcae'}}>Signed in as {user.email}. Private access — student accounts cannot open this page.</p></div>
 {error?<p style={{color:'#ffb0a0'}}>Metrics are temporarily unavailable. Please try again later.</p>:<section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14}}>{metrics.map(([name,value])=><article key={name} style={{background:'#1a2017',border:'1px solid #34402b',borderRadius:16,padding:24}}><div style={{fontSize:34,color:'#caff39',fontWeight:900}}>{value??'—'}</div><div style={{color:'#cbd5c4',marginTop:8}}>{name}</div></article>)}</section>}
 <h2 style={{marginTop:48}}>Explore the Academy</h2><section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:14}}>{[['Student dashboard','/academy'],['Full featured lesson','/academy/workflows/viral-character-swap'],['AI Mentor & voice','/mentor'],['Prompt Vault','/prompts']].map(([label,href])=><Link key={href} href={href} style={{display:'block',background:'#1a2017',border:'1px solid #34402b',padding:22,borderRadius:14,color:'#caff39',textDecoration:'none',fontWeight:700}}>{label} ↗</Link>)}</section>
 <p style={{color:'#a7b19f',marginTop:40}}>Payment totals in Stripe and Academy database records may differ. For verified transactions use the Stripe Dashboard. These counters are not a revenue report.</p>
 </main>;
}