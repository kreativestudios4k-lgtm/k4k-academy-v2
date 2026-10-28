'use client';
import {useState} from 'react';
const videos=[
 {id:'ig1',platform:'Instagram',title:'Viral Reel 01',url:'https://www.instagram.com/reel/DeaMw0uISlg/',embed:'https://www.instagram.com/reel/DeaMw0uISlg/embed/'},
 {id:'ig2',platform:'Instagram',title:'Viral Reel 02',url:'https://www.instagram.com/reel/DeWvN7KI7pN/',embed:'https://www.instagram.com/reel/DeWvN7KI7pN/embed/'},
 {id:'tt1',platform:'TikTok',title:'Viral TikTok 01',url:'https://vm.tiktok.com/ZN8UYU3Mn/'},
 {id:'tt2',platform:'TikTok',title:'Viral TikTok 02',url:'https://vm.tiktok.com/ZN8UYUA5L/'}
];
export default function ViralGallery(){
 const [active,setActive]=useState({});
 return <section aria-labelledby="viral-gallery-heading" style={{margin:'28px 0 42px',color:'#f6f7fb'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:12,flexWrap:'wrap',marginBottom:18}}><div><p style={{color:'#aabefb',fontSize:12,letterSpacing:2}}>K4K / CREATOR SHOWCASE</p><h2 id="viral-gallery-heading" style={{fontSize:'clamp(26px,4vw,40px)',margin:'8px 0'}}>VIRAL VIDEO GALLERY.</h2><p style={{color:'#c5ccda'}}>Watch original K4K videos, then build your own remix.</p></div><span style={{color:'#c5ccda',fontSize:12}}>4 featured videos</span></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16}}>
   {videos.map(v=><article key={v.id} style={{background:'#151a26',border:'1px solid #343b4b',borderRadius:18,overflow:'hidden'}}>
    <div style={{aspectRatio:'9 / 12',background:'linear-gradient(155deg,#212d46,#10141d)',display:'grid',placeItems:'center',position:'relative'}}>
    {active[v.id]&&v.embed?<iframe title={v.title} src={v.embed} loading="lazy" allow="encrypted-media;picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" style={{width:'100%',height:'100%',border:0}}/>:<div style={{textAlign:'center',padding:20}}><div style={{fontSize:42,marginBottom:12}}>▶</div><strong>{v.platform}</strong><p style={{color:'#c5ccda',fontSize:13}}>Open this creator video</p>{v.embed&&<button onClick={()=>setActive(s=>({...s,[v.id]:true}))} style={{border:0,borderRadius:10,padding:'10px 16px',background:'#b9c8ff',color:'#111827',fontWeight:700,cursor:'pointer'}}>Play embed</button>}</div>}
    </div>
    <div style={{padding:16}}><small style={{color:'#b9c8ff'}}>{v.platform}</small><h3 style={{margin:'8px 0'}}>{v.title}</h3><div style={{display:'flex',flexWrap:'wrap',gap:12}}><a href={v.url} target="_blank" rel="noopener noreferrer" style={{color:'#c9d5ff'}}>Watch original ↗</a><a href="/academy/generator" style={{color:'#c9d5ff'}}>Remake this style ↗</a></div></div>
   </article>)}
  </div><p style={{fontSize:12,color:'#c5ccda',marginTop:12}}>Instagram embeds may require consent or login. TikTok short links open the original video until their canonical embed IDs are confirmed. Remixing does not automatically import the source video.</p>
 </section>;
}