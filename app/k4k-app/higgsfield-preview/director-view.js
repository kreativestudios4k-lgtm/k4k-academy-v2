'use client';
import {useEffect,useState} from 'react';
const field={width:'100%',boxSizing:'border-box',padding:12,borderRadius:10,border:'1px solid #415b47',background:'#080f0b',color:'#edf7ed'};
export function LocalMedia({file,video=false}){
 const [url,setUrl]=useState(null);
 useEffect(()=>{if(!file){setUrl(null);return;}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
 if(!url)return null;
 return video?<video src={url} controls playsInline style={{width:'100%',maxHeight:420,borderRadius:12,marginTop:16}}/>:<img src={url} alt="Replacement character" style={{width:'100%',height:190,objectFit:'contain',background:'#080f0b',borderRadius:10}}/>;
}
export default function DirectorView({images,targets,main,onChange,disabled}){
 const count=targets.length;
 return <section style={{marginTop:18,padding:22,border:'1px solid #334b37',borderRadius:16,background:'#111b16'}}>
  <p style={{color:'#a1efa5',fontSize:12,letterSpacing:2}}>02 · DIRECTOR VIEW</p>
  <h2>Cast your scene</h2>
  <p style={{color:'#adbdaf',lineHeight:1.6}}>Watch the sample, then choose how many people you want to replace. Four people to replace means four photo slots. Describe each source person by position, action or first appearance.</p>
  <label htmlFor="cast-count">Characters to replace</label>
  <select id="cast-count" disabled={disabled} value={count} style={{...field,maxWidth:180,display:'block',margin:'10px 0 20px'}} onChange={e=>{const n=Number(e.target.value);onChange(Array.from({length:n},(_,i)=>images[i]||null),Array.from({length:n},(_,i)=>targets[i]||''),Math.min(main,n-1));}}>{Array.from({length:8},(_,i)=><option key={i} value={i+1}>{i+1} {i?'characters':'character'}</option>)}</select>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:14}}>
   {targets.map((target,i)=><article key={i} style={{padding:14,borderRadius:14,border:'1px solid '+(main===i?'#a1efa5':'#334b37'),background:'#0b140e',minWidth:0}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:14}}><strong>Slot {i+1}</strong><span style={{fontSize:12,color:'#a1efa5'}}>{main===i?'MAIN CHARACTER':'SUPPORTING'}</span></div>
    {images[i]?<LocalMedia file={images[i]}/>:<div style={{height:190,display:'grid',placeItems:'center',border:'1px dashed #415b47',borderRadius:10,color:'#91a695'}}>Add character photo</div>}
    <label style={{display:'block',margin:'12px 0',fontSize:13}}>Photo for slot {i+1}<input aria-label={'Photo for slot '+(i+1)} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} style={{display:'block',width:'100%',marginTop:8}} onChange={e=>{const next=[...images];next[i]=e.target.files?.[0]||null;onChange(next,targets,main);}}/></label>
    <label style={{fontSize:13}}>Who in the source video?<input disabled={disabled} value={target} maxLength={80} placeholder={i===0?'e.g. person speaking on the left':'e.g. person seated by the stairs'} style={{...field,margin:'8px 0 12px'}} onChange={e=>{const next=[...targets];next[i]=e.target.value;onChange(images,next,main);}}/></label>
    <label style={{fontSize:13}}><input type="radio" name="main-character" checked={main===i} disabled={disabled} onChange={()=>onChange(images,targets,i)}/> Main character</label>
   </article>)}
  </div>
 </section>;
}
