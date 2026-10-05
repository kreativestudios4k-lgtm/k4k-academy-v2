'use client';
import {useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {ArrowLeft,BrainCircuit,Send,Upload,Video,Sparkles,LoaderCircle,CheckCircle2} from 'lucide-react';

const starters=[
  'Help me make my character consistent',
  'Improve my AI video prompt',
  'Give me a viral 15-second structure',
  'How should I price my first client video?'
];

export default function Mentor(){
  const [messages,setMessages]=useState([{role:'mentor',text:"I'm your K4K AI Mentor. Ask me about your lessons, prompts, character consistency, AI video workflows, viral content or monetisation."}]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [uploadMsg,setUploadMsg]=useState('');

  async function ask(text=input){
    const q=String(text||'').trim();
    if(!q||loading)return;
    setMessages(m=>[...m,{role:'student',text:q}]);setInput('');setLoading(true);
    try{
      const res=await fetch('/api/mentor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});
      const data=await res.json();
      setMessages(m=>[...m,{role:'mentor',text:data.answer||data.error||'I could not answer that yet.'}]);
    }catch{setMessages(m=>[...m,{role:'mentor',text:'Connection problem. Please try again.'}])}
    finally{setLoading(false)}
  }

  async function uploadVideo(e){
    const file=e.target.files?.[0]; if(!file)return;
    setUploadMsg('');
    if(file.size>100*1024*1024){setUploadMsg('Maximum upload size is 100 MB.');return}
    if(!['video/mp4','video/quicktime','video/webm'].includes(file.type)){setUploadMsg('Upload MP4, MOV or WebM video.');return}
    setUploading(true);
    try{
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error('Please sign in again.');
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
      const path=`${user.id}/${Date.now()}-${safe}`;
      const {error:uploadError}=await supabase.storage.from('academy-student-uploads').upload(path,file,{upsert:false,contentType:file.type});
      if(uploadError)throw uploadError;
      const {error:dbError}=await supabase.from('academy_ai_submissions').insert({user_id:user.id,storage_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size});
      if(dbError)throw dbError;
      setUploadMsg('Video uploaded securely. It is ready for the K4K review workflow.');
    }catch(err){setUploadMsg(err.message||'Upload failed. Please try again.')}
    finally{setUploading(false);e.target.value=''}
  }

  return <main className="mentorPage">
    <header className="mentorTop"><Link href="/academy"><ArrowLeft/> Academy</Link><div><span>K4K</span> AI MENTOR</div><small>PRIVATE CREATOR COACH</small></header>
    <section className="mentorHero"><div className="orb"><BrainCircuit/></div><div><small>TRAINED ON THE K4K METHOD</small><h1>CREATE WITH<br/><i>AN AI COACH.</i></h1><p>Ask questions while you learn. Turn ideas into prompts, fix consistency problems and get practical creator guidance.</p></div></section>
    <section className="mentorGrid">
      <div className="chatCard">
        <div className="chatHead"><div><Sparkles/> K4K AI Mentor</div><span><b/> ONLINE</span></div>
        <div className="messages">{messages.map((m,i)=><div key={i} className={'bubble '+m.role}>{m.text}</div>)}{loading&&<div className="bubble mentor typing"><LoaderCircle/> Thinking with the K4K method…</div>}</div>
        {messages.length===1&&<div className="starters">{starters.map(s=><button key={s} onClick={()=>ask(s)}>{s}</button>)}</div>}
        <form onSubmit={e=>{e.preventDefault();ask()}} className="askBox"><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about your lesson, prompt or content…" maxLength={4000}/><button disabled={loading||!input.trim()}><Send/></button></form>
      </div>
      <aside className="mentorSide">
        <div className="uploadCard"><Video/><small>UPLOAD YOUR WORK</small><h2>Let K4K see<br/>what you're building.</h2><p>Upload an MP4, MOV or WebM from your current project. Files stay private to your account.</p><label className={uploading?'disabled':''}><Upload/>{uploading?'Uploading…':'Upload video'}<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={uploadVideo} disabled={uploading}/></label>{uploadMsg&&<div className="uploadMsg"><CheckCircle2/>{uploadMsg}</div>}</div>
        <div className="mentorTip"><small>MENTOR MODE</small><b>Ask in English, Português or Español.</b><p>The mentor automatically answers in your language.</p></div>
      </aside>
    </section>
    <style jsx>{`
      .mentorPage{min-height:100vh;background:#050505;color:#f7f7f2;padding:0 5vw 70px;font-family:Arial,sans-serif}.mentorTop{height:78px;border-bottom:1px solid #202020;display:flex;align-items:center;gap:28px}.mentorTop>a{color:#aaa;text-decoration:none;display:flex;gap:8px;align-items:center;font-size:13px}.mentorTop>a :global(svg){width:16px}.mentorTop>div{font-weight:900;letter-spacing:2px;margin-left:auto}.mentorTop>div span{color:#d6ff00}.mentorTop small{color:#777;font-size:9px;letter-spacing:2px}.mentorHero{display:flex;gap:30px;align-items:center;padding:55px 0 38px;max-width:950px}.orb{width:92px;height:92px;border:1px solid #d6ff00;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 60px #d6ff0022}.orb :global(svg){width:42px;height:42px;color:#d6ff00}.mentorHero small,.uploadCard small,.mentorTip small{color:#d6ff00;letter-spacing:2px;font-size:10px;font-weight:800}.mentorHero h1{font-size:clamp(42px,6vw,78px);line-height:.86;margin:8px 0 16px;letter-spacing:-4px}.mentorHero h1 i{color:#d6ff00;font-style:normal}.mentorHero p{color:#999;max-width:640px;line-height:1.6}.mentorGrid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.7fr);gap:18px;max-width:1200px}.chatCard,.uploadCard,.mentorTip{background:#0b0b0b;border:1px solid #202020;border-radius:18px}.chatCard{min-height:590px;display:flex;flex-direction:column;overflow:hidden}.chatHead{padding:18px 20px;border-bottom:1px solid #202020;display:flex;justify-content:space-between;font-weight:800}.chatHead>div{display:flex;gap:8px;align-items:center}.chatHead :global(svg){color:#d6ff00;width:18px}.chatHead span{font-size:10px;color:#888;display:flex;gap:7px;align-items:center}.chatHead span b{width:7px;height:7px;border-radius:50%;background:#d6ff00;box-shadow:0 0 12px #d6ff00}.messages{padding:24px;display:flex;flex-direction:column;gap:14px;flex:1;max-height:420px;overflow:auto}.bubble{white-space:pre-wrap;line-height:1.55;max-width:82%;padding:14px 16px;border-radius:14px;font-size:14px}.bubble.mentor{background:#151515;border:1px solid #252525;align-self:flex-start}.bubble.student{background:#d6ff00;color:#070707;align-self:flex-end;font-weight:700}.typing{color:#aaa;display:flex;align-items:center;gap:8px}.typing :global(svg){width:16px;animation:spin 1s linear infinite}.starters{padding:0 24px 14px;display:flex;gap:8px;flex-wrap:wrap}.starters button{background:#111;color:#bbb;border:1px solid #292929;border-radius:999px;padding:9px 12px;cursor:pointer}.askBox{border-top:1px solid #202020;padding:14px;display:flex;gap:10px}.askBox textarea{flex:1;background:#111;border:1px solid #292929;border-radius:12px;color:white;padding:13px;resize:none;min-height:48px;outline:none}.askBox button{width:50px;border:0;border-radius:12px;background:#d6ff00;color:#050505;display:grid;place-items:center;cursor:pointer}.askBox button:disabled{opacity:.35}.mentorSide{display:flex;flex-direction:column;gap:18px}.uploadCard,.mentorTip{padding:24px}.uploadCard>:global(svg){color:#d6ff00;width:34px;height:34px;margin-bottom:28px}.uploadCard h2{font-size:29px;line-height:1;margin:8px 0 14px}.uploadCard p,.mentorTip p{color:#888;line-height:1.55;font-size:13px}.uploadCard label{margin-top:18px;background:#f4f4ee;color:#090909;padding:13px;border-radius:10px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.uploadCard label :global(svg){width:17px}.uploadCard input{display:none}.uploadCard label.disabled{opacity:.5}.uploadMsg{margin-top:12px;color:#bbb;font-size:12px;display:flex;gap:7px;align-items:flex-start}.uploadMsg :global(svg){width:15px;color:#d6ff00;flex:none}.mentorTip b{display:block;font-size:20px;margin-top:10px}.mentorTip{background:linear-gradient(145deg,#101010,#0a0a0a)}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:800px){.mentorPage{padding:0 18px 40px}.mentorTop small{display:none}.mentorHero{padding-top:35px;align-items:flex-start}.orb{width:58px;height:58px;flex:none}.orb :global(svg){width:27px}.mentorHero h1{letter-spacing:-2px}.mentorGrid{grid-template-columns:1fr}.chatCard{min-height:560px}.bubble{max-width:90%}}
    `}</style>
  </main>
}
