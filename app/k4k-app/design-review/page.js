import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'K4K desktop & mobile preview',robots:{index:false,follow:false}};
export default async function DesignReview({searchParams}){
 if(process.env.VERCEL_ENV==='production')notFound();
 const {view,screen}=await searchParams;
 const target=screen==='studio'?'/k4k-app/creator':screen==='library'?'/k4k-app/videos':'/k4k-app';
 const mobile=view!=='desktop';
 return <main style={{minHeight:'100vh',background:'#20231e',color:'#dbe5d0',fontFamily:'Arial,sans-serif',padding:'20px',display:'flex',alignItems:'center',flexDirection:'column',gap:18}}><header style={{display:'flex',alignItems:'center',gap:25,fontSize:13}}><strong>K4K · {mobile?'Mobile · 390 × 844':'Desktop · 1280 × 900'}</strong><a href={'?view='+(mobile?'desktop':'mobile')+'&screen='+(screen||'feed')} style={{color:'#c7ff36'}}>View {mobile?'desktop':'mobile'} version ↗</a></header><iframe title={mobile?'K4K mobile preview':'K4K desktop preview'} src={target} width={mobile?390:1280} height={mobile?844:900} style={{boxSizing:'content-box',border:'1px solid #62724f',borderRadius:mobile?24:12,display:'block',flexShrink:0}} allow="autoplay"/></main>;
}
