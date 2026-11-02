'use client';
import {reviewPrompt} from '../../../lib/k4k-prompt-coach.mjs';
export default function PromptCoach({prompt,mapping,locks,imageCount,videoSelected}){
 const report=reviewPrompt({prompt,mapping,locks,imageCount,videoSelected});
 return <section aria-labelledby="prompt-coach-heading" style={{marginTop:18,padding:16,border:'1px solid #475569',borderRadius:12,background:'#111827'}}>
  <h3 id="prompt-coach-heading" style={{margin:'0 0 8px'}}>Interactive Prompt Coach</h3>
  <p style={{fontSize:13,color:'#c5ccda'}}>Live guidance based on your current instructions and selections. No AI request or credit charge.</p>
  <p role="status" aria-live="polite" style={{fontSize:13,color:report.ready?'#a5e6bb':'#ffcf8b'}}>{report.passed}/{report.total} planning checks complete. {report.ready?'Your prompt covers these planning checks; output quality is not guaranteed.':'Review the suggestions below before copying your prompt.'}</p>
  {report.notes.length>0&&<ul style={{paddingLeft:20,fontSize:13,lineHeight:1.6}}>{report.notes.map(item=><li key={item.id}><strong>{item.title}:</strong> {item.tip}</li>)}</ul>}
  <p style={{fontSize:12,color:'#aeb6c6'}}>Heuristic feedback only. It does not inspect frames or verify the generated result.</p>
 </section>;
}
