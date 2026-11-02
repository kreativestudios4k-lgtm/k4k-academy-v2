'use client';
import {useState} from 'react';
import {checkGenjutsuPreflight,GENJUTSU_DESTINATIONS} from '../../../lib/k4k-genjutsu-preflight.mjs';

export default function GenjutsuPreflight({imageCount,videoSelected}){
 const [destination,setDestination]=useState('website');
 const [duration,setDuration]=useState('');
 const seconds=duration.trim()===''?null:Number(duration);
 const report=checkGenjutsuPreflight({destination,imageCount,videoSelected,durationSeconds:seconds});
 const field={width:'100%',padding:10,borderRadius:8,border:'1px solid #515c70',background:'#0d111a',color:'#fff'};
 return <div aria-labelledby="genjutsu-preflight-heading" style={{marginTop:18,padding:16,border:'1px solid #475569',borderRadius:12,background:'#111827'}}>
  <h3 id="genjutsu-preflight-heading" style={{margin:'0 0 8px'}}>Genjutsu compatibility check</h3>
  <p style={{fontSize:13,color:'#c5ccda'}}>Check your plan before uploading to Higgsfield. The website and API have different documented image limits.</p>
  <label htmlFor="genjutsu-destination" style={{display:'block',fontSize:13,marginBottom:6}}>Where will you generate?</label>
  <select id="genjutsu-destination" value={destination} onChange={e=>setDestination(e.target.value)} style={field}>
   {Object.entries(GENJUTSU_DESTINATIONS).map(([value,details])=><option key={value} value={value}>{details.label}</option>)}
  </select>
  <label htmlFor="genjutsu-duration" style={{display:'block',fontSize:13,margin:'12px 0 6px'}}>Source video length (seconds)</label>
  <input id="genjutsu-duration" type="number" min="0" step="0.1" inputMode="decimal" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="e.g. 12.5" style={field}/>
  <p style={{fontSize:13,color:'#c5ccda',margin:'12px 0'}}>Selected: {imageCount} reference image(s) · {videoSelected?'video selected':'no video selected'} · limit {report.limits.maxImages} images and {report.limits.minSeconds}–{report.limits.maxSeconds}s.</p>
  <div role="status" aria-live="polite" style={{fontSize:13,color:report.ok?'#a5e6bb':'#ffcf8b'}}>
   {report.ok?<strong>Compatible with the documented input limits. This does not guarantee generation quality.</strong>:<><strong>Check before generating:</strong><ul style={{margin:'6px 0 0',paddingLeft:20}}>{report.issues.map(item=><li key={item}>{item}</li>)}</ul></>}
  </div>
  <p style={{fontSize:12,color:'#aeb6c6',marginTop:12}}>Planning only: no upload, API request, generation or credit charge. Limits may change. <a href="https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-genjutsu" target="_blank" rel="noopener noreferrer" style={{color:'#b6caff'}}>Website guide</a> · <a href="https://open.higgsfield.ai/models/higgsfield/genjutsu/object-swap/v1.0/api-reference" target="_blank" rel="noopener noreferrer" style={{color:'#b6caff'}}>API reference</a>.</p>
 </div>;
}
