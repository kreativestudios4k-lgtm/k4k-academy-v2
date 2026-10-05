'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {experimental_useRealtime as useRealtime} from '@ai-sdk/react';
import {gateway} from '@ai-sdk/gateway';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {ArrowLeft,ArrowRight,BrainCircuit,Send,Upload,Video,Sparkles,LoaderCircle,CheckCircle2,Mic,MicOff,Globe2,Radio,Play,Pause,Volume2,Languages,TrendingUp,Eye,Clapperboard,BookOpen,Command,ChevronRight} from 'lucide-react';

const marketRadar=[
 {tag:'VIDEO',title:'Seedance 2.5 Draft Mode',meta:'Faster iteration + enhancement',hot:'+ NEW'},
 {tag:'VOICE',title:'Eleven v4 Turbo',meta:'Expressive realtime · 90+ languages',hot:'~100ms'},
 {tag:'AGENT',title:'Gemini 3.8 Live',meta:'Voice + vision + tool execution',hot:'LIVE'},
 {tag:'WORKFLOW',title:'Multi-model creation',meta:'Kling · Runway · Seedance · audio',hot:'RISING'}
];
const lessonSteps=[
 {k:'01',title:'Why identity drifts',body:'Understand why AI changes faces, hair, clothes and proportions between shots.'},
 {k:'02',title:'Lock the identity',body:'Build a reusable identity block that stays unchanged across every prompt.'},
 {k:'03',title:'Reference strategy',body:'Choose the right face, wardrobe and full-body references before generation.'},
 {k:'04',title:'Direct the scene',body:'Change action, camera and environment without rewriting the character identity.'},
 {k:'05',title:'Your challenge',body:'Create two different scenes with one locked character and submit them for review.'}
];
const quick=['Explain this step','Give me an example','Create the prompt','Test my knowledge'];

export default function Mentor(){
 const [messages,setMessages]=useState([{role:'mentor',text:'System online. I am your K4K AI instructor. We can learn, create and analyse together. Choose a lesson or ask me anything.'}]);
 const [input,setInput]=useState(''); const [loading,setLoading]=useState(false);
 const [listening,setListening]=useState(false); const [speaking,setSpeaking]=useState(false);
 const [autoVoice,setAutoVoice]=useState(true); const [language,setLanguage]=useState('en-US');
 const [voiceIndex,setVoiceIndex]=useState(0); const [voices,setVoices]=useState([]);
 const [step,setStep]=useState(1); const [uploading,setUploading]=useState(false); const [uploadMsg,setUploadMsg]=useState('');
 const recognition=useRef(null); const premiumAudio=useRef(null);
 const realtimeModel=useMemo(()=>gateway.experimental_realtime('google/gemini-3.8-live'),[]);
 const realtime=useRealtime({model:realtimeModel,api:{token:'/api/realtime/token'},sessionConfig:{instructions:'You are K4K Core, the interactive voice instructor inside KreativeStudios4K Academy. Teach AI creation step by step. Be concise, practical, multilingual and allow the student to interrupt naturally. Never imitate an existing fictional or real person. If the student changes language, continue naturally in that language.',turnDetection:{type:'server-vad'}},onError:(error)=>console.error('K4K realtime voice',error)});

 useEffect(()=>{
   const load=()=>setVoices(window.speechSynthesis?.getVoices?.()||[]);
   load(); if(window.speechSynthesis)window.speechSynthesis.onvoiceschanged=load;
   const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(SR){const r=new SR();r.continuous=false;r.interimResults=false;r.lang=language;
     r.onresult=e=>{const t=e.results[0][0].transcript;setInput(t);setListening(false);ask(t)};
     r.onerror=()=>setListening(false);r.onend=()=>setListening(false);recognition.current=r}
   return()=>window.speechSynthesis?.cancel();
 },[language]);

 async function speak(text){
   stopVoice();setSpeaking(true);
   const profiles=['core','mentor','warm'];const profile=profiles[voiceIndex%profiles.length];
   try{
     const res=await fetch('/api/mentor/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:profile,language})});
     if(!res.ok)throw new Error('premium voice unavailable');
     const blob=await res.blob();const audio=new Audio(URL.createObjectURL(blob));premiumAudio.current=audio;
     audio.onended=()=>setSpeaking(false);audio.onerror=()=>setSpeaking(false);await audio.play();
   }catch{
     if(!('speechSynthesis' in window)){setSpeaking(false);return}
     const u=new SpeechSynthesisUtterance(text);u.lang=language;
     const filtered=voices.filter(v=>v.lang?.toLowerCase().startsWith(language.slice(0,2).toLowerCase()));
     const v=filtered[voiceIndex%Math.max(filtered.length,1)]||voices[voiceIndex%Math.max(voices.length,1)];if(v)u.voice=v;
     u.rate=.96;u.pitch=.88;u.onend=()=>setSpeaking(false);u.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(u);
   }
 }
 function stopVoice(){if(premiumAudio.current){premiumAudio.current.pause();premiumAudio.current=null}window.speechSynthesis?.cancel();setSpeaking(false)}
 async function toggleRealtime(){
   try{if(realtime.status==='connected'||realtime.status==='connecting'){await realtime.close();return}
     stopVoice();await realtime.connect();
   }catch(error){console.error(error)}
 }
 function toggleListen(){if(!recognition.current)return; if(listening){recognition.current.stop();setListening(false)}else{recognition.current.lang=language;recognition.current.start();setListening(true)}}

 async function ask(text=input){
   const q=String(text||'').trim();if(!q||loading)return;
   setMessages(m=>[...m,{role:'student',text:q}]);setInput('');setLoading(true);
   try{const res=await fetch('/api/mentor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});
     const data=await res.json();const answer=data.answer||data.error||'I could not answer that yet.';
     setMessages(m=>[...m,{role:'mentor',text:answer}]);if(autoVoice)speak(answer);
   }catch{const t='Connection problem. Please try again.';setMessages(m=>[...m,{role:'mentor',text:t}])}finally{setLoading(false)}
 }
 function teach(n){
   setStep(n);const s=lessonSteps[n-1];const text=`Lesson step ${n}: ${s.title}. ${s.body}`;
   setMessages(m=>[...m,{role:'mentor',text}]);if(autoVoice)speak(text);
 }
 async function uploadVideo(e){
   const file=e.target.files?.[0];if(!file)return;setUploadMsg('');
   if(file.size>100*1024*1024){setUploadMsg('Maximum upload size is 100 MB.');return}
   if(!['video/mp4','video/quicktime','video/webm'].includes(file.type)){setUploadMsg('Upload MP4, MOV or WebM video.');return}
   setUploading(true);
   try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Please sign in again.');
     const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const path=`${user.id}/${Date.now()}-${safe}`;
     const {error:ue}=await supabase.storage.from('academy-student-uploads').upload(path,file,{upsert:false,contentType:file.type});if(ue)throw ue;
     const {error:de}=await supabase.from('academy_ai_submissions').insert({user_id:user.id,storage_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size});if(de)throw de;
     setUploadMsg('Upload complete. Ready for K4K analysis.');
   }catch(err){setUploadMsg(err.message||'Upload failed.')}finally{setUploading(false);e.target.value=''}
 }

 return <main className="commandPage">
   <header className="commandTop">
     <Link href="/academy" className="monoBrand"><span className="mark">K4K</span><b>ACADEMY</b><small>CREATOR INTELLIGENCE</small></Link>
     <div className="system"><i/> K4K CORE ONLINE</div>
     <div className="topActions"><select value={language} onChange={e=>setLanguage(e.target.value)} aria-label="Language"><option value="en-US">EN · English</option><option value="pt-BR">PT · Português</option><option value="es-ES">ES · Español</option><option value="fr-FR">FR · Français</option></select><Link href="/academy"><ArrowLeft/> Academy</Link></div>
   </header>

   <div className="commandShell">
     <aside className="rail">
       <div className="railLabel">COMMAND</div>
       <button className="active"><BrainCircuit/> <span>AI Instructor</span></button>
       <button onClick={()=>teach(step)}><BookOpen/><span>My Class</span></button>
       <button><TrendingUp/><span>Market Radar</span></button>
       <button><Clapperboard/><span>Create</span></button>
       <button><Eye/><span>Analyse</span></button>
       <div className="railFoot"><small>COURSE PROGRESS</small><strong>42%</strong><div><i/></div></div>
     </aside>

     <section className="core">
       <div className="hudTop"><div><small>ACTIVE INTELLIGENCE</small><h1>K4K <span>CORE</span></h1><p>Your interactive AI creator instructor.</p></div><div className="hudStatus"><span><i/>{realtime.status==='connected'?'LIVE VOICE CONNECTED':'VOICE READY'}</span><span><i/>VISION READY</span><span><i/>ACADEMY LINKED</span></div></div>

       <div className="coreVisual">
         <div className="rings r1"/><div className="rings r2"/><div className="rings r3"/>
         <div className={'coreOrb '+(speaking?'speaking':'')}><BrainCircuit/><div className="wave">{[1,2,3,4,5,6,7,8,9,10,11,12].map(x=><i key={x}/>)}</div></div>
         <div className="coreCopy"><small>{speaking?'INSTRUCTOR SPEAKING':'WAITING FOR COMMAND'}</small><b>{speaking?'LISTENING MODE':'HOW CAN I HELP?'}</b></div>
       </div>

       <div className="modeDock">
         <button onClick={()=>ask('Continue my current lesson interactively')}><BookOpen/><span>LEARN</span></button>
         <button onClick={toggleRealtime} className={realtime.status==='connected'?'live':''}>{realtime.status==='connected'?<MicOff/>:<Mic/>}<span>{realtime.status==='connected'?'LIVE':'VOICE'}</span></button>
         <button onClick={()=>ask('Help me create an AI video concept and production prompt')}><Clapperboard/><span>CREATE</span></button>
         <button onClick={()=>ask('Analyse the creative idea I am working on and tell me what to improve')}><Eye/><span>ANALYSE</span></button>
         <button onClick={()=>document.getElementById('radar')?.scrollIntoView({behavior:'smooth'})}><TrendingUp/><span>TRENDS</span></button>
       </div>

       <section className="lessonConsole">
         <div className="lessonHead"><div><small>INTERACTIVE CLASS · MODULE 02</small><h2>Character Consistency</h2><p>The instructor teaches one step at a time. Interrupt, ask, practise, continue.</p></div><button onClick={()=>speaking?stopVoice():teach(step)}>{speaking?<Pause/>:<Play fill="currentColor"/>}{speaking?'Pause instructor':'Start lesson'}</button></div>
         <div className="lessonBody">
           <div className="steps">{lessonSteps.map((s,i)=><button key={s.k} onClick={()=>teach(i+1)} className={step===i+1?'current':step>i+1?'done':''}><span>{step>i+1?<CheckCircle2/>:s.k}</span><div><b>{s.title}</b><small>{s.body}</small></div><ChevronRight/></button>)}</div>
           <div className="lessonAction"><div className="stepNo">0{step}</div><small>NOW LEARNING</small><h3>{lessonSteps[step-1].title}</h3><p>{lessonSteps[step-1].body}</p><div className="quick">{quick.map(q=><button key={q} onClick={()=>ask(`${q}. I am on lesson step ${step}: ${lessonSteps[step-1].title}`)}>{q}</button>)}</div><button className="next" onClick={()=>teach(step===lessonSteps.length?1:step+1)}>Continue <ArrowRight/></button></div>
         </div>
       </section>

       <section className="conversation">
         <div className="conversationHead"><div><Radio/> LIVE INSTRUCTOR</div><div className="voiceSettings"><label><input type="checkbox" checked={autoVoice} onChange={e=>setAutoVoice(e.target.checked)}/> Auto voice</label><button onClick={()=>setVoiceIndex(v=>(v+1)%3)}><Volume2/> Voice: {['Core','Mentor','Warm'][voiceIndex%3]}</button></div></div>
         <div className="messages">{messages.slice(-5).map((m,i)=><div key={i} className={'bubble '+m.role}>{m.text}</div>)}{loading&&<div className="bubble mentor typing"><LoaderCircle/> K4K Core is thinking…</div>}</div>
         <form onSubmit={e=>{e.preventDefault();ask()}} className="commandInput"><button type="button" onClick={toggleListen} className={listening?'live':''}>{listening?<MicOff/>:<Mic/>}</button><input value={input} onChange={e=>setInput(e.target.value)} placeholder={listening?'Listening…':'Speak or type your command…'}/><button disabled={loading||!input.trim()}><Send/></button></form>
       </section>
     </section>

     <aside className="intel" id="radar">
       <div className="intelHead"><div><span>LIVE</span><small>AI MARKET RADAR</small></div><Globe2/></div>
       <p className="intelIntro">Signals shaping AI creation right now.</p>
       <div className="radarList">{marketRadar.map((x,i)=><article key={x.title}><span className="rank">0{i+1}</span><div><small>{x.tag}</small><b>{x.title}</b><p>{x.meta}</p></div><em>{x.hot}</em></article>)}</div>
       <button className="scan" onClick={()=>ask('Based on the latest AI market trends in my Academy radar, what should I learn or create next?')}><Radio/> Ask K4K what matters</button>

       <div className="uploadMini"><Upload/><small>VISION LAB</small><h3>Upload your work.</h3><p>Send your video to the private Academy workspace.</p><label>{uploading?'UPLOADING…':'UPLOAD VIDEO'}<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={uploadVideo} disabled={uploading}/></label>{uploadMsg&&<span>{uploadMsg}</span>}</div>
       <div className="languageCard"><Languages/><div><small>MULTILINGUAL CORE</small><b>Learn in your language.</b><p>English · Português · Español · Français</p></div></div>
     </aside>
   </div>

   <style jsx>{`
    .commandPage{min-height:100vh;background:#030811;color:#eaf6ff;font-family:Arial,sans-serif;background-image:radial-gradient(circle at 52% 18%,#07325b55,transparent 27%),linear-gradient(#06101b55 1px,transparent 1px),linear-gradient(90deg,#06101b55 1px,transparent 1px);background-size:auto,38px 38px,38px 38px}
    .commandTop{height:74px;border-bottom:1px solid #1a6b9c55;background:#02070ee8;backdrop-filter:blur(20px);display:flex;align-items:center;padding:0 24px;position:sticky;top:0;z-index:20}.monoBrand{display:grid;grid-template-columns:auto auto;gap:0 10px;align-items:center;min-width:250px}.mark{grid-row:1/3;font-size:25px;font-weight:1000;letter-spacing:-2px;color:#55c9ff}.monoBrand b{font-size:11px;letter-spacing:5px}.monoBrand small{font-size:7px;color:#4d7c9b;letter-spacing:2px}.system{margin:auto;color:#58d8ff;font:10px monospace;letter-spacing:2px}.system i,.hudStatus i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#28ffc6;box-shadow:0 0 12px #28ffc6;margin-right:8px}.topActions{display:flex;align-items:center;gap:15px}.topActions select{background:#06101b;border:1px solid #17496a;color:#c9eaff;padding:9px;border-radius:6px}.topActions a{font-size:10px;color:#7294a9;display:flex;align-items:center;gap:5px}.topActions svg{width:14px}
    .commandShell{display:grid;grid-template-columns:94px minmax(0,1fr) 330px;min-height:calc(100vh - 74px)}.rail{border-right:1px solid #0e4569;padding:22px 10px;background:#020811cc;position:sticky;top:74px;height:calc(100vh - 74px);display:flex;flex-direction:column;gap:8px}.railLabel{font:8px monospace;color:#35627d;text-align:center;letter-spacing:2px;margin-bottom:8px}.rail button{border:1px solid transparent;background:transparent;color:#58788c;border-radius:8px;padding:12px 5px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:8px;cursor:pointer}.rail button svg{width:19px}.rail button.active,.rail button:hover{border-color:#1b79b3;background:#08243a;color:#69d7ff;box-shadow:inset 0 0 20px #008cff12}.railFoot{margin-top:auto;border-top:1px solid #12384e;padding:16px 5px}.railFoot small{font-size:6px;color:#496779}.railFoot strong{display:block;font-size:19px;color:#58d8ff;margin:6px 0}.railFoot>div{height:3px;background:#102c3e}.railFoot i{display:block;width:42%;height:100%;background:#4bcfff;box-shadow:0 0 8px #4bcfff}
    .core{padding:30px;min-width:0}.hudTop{display:flex;justify-content:space-between;align-items:flex-start}.hudTop small,.lessonHead small,.lessonAction>small,.uploadMini>small,.languageCard small{font:9px monospace;letter-spacing:2px;color:#45bdea}.hudTop h1{font-size:42px;letter-spacing:9px;font-weight:300;margin:7px 0 3px}.hudTop h1 span{color:#42caff}.hudTop p{color:#52768c;margin:0;font-size:12px}.hudStatus{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.hudStatus span{border:1px solid #123f5d;background:#06121e;padding:8px 9px;font:7px monospace;color:#60869c}.coreVisual{height:310px;position:relative;display:grid;place-items:center;overflow:hidden;margin-top:15px;border:1px solid #0f4163;background:radial-gradient(circle,#07325b66 0,#04101d 38%,#020811 72%)}.coreVisual:before{content:'';position:absolute;inset:0;background:linear-gradient(transparent 49.7%,#1b90cf22 50%,transparent 50.3%),linear-gradient(90deg,transparent 49.7%,#1b90cf22 50%,transparent 50.3%)}.rings{position:absolute;border:1px solid #1f9bd1;border-radius:50%;opacity:.35}.r1{width:270px;height:270px}.r2{width:215px;height:215px;border-style:dashed;animation:spin 20s linear infinite}.r3{width:160px;height:160px;box-shadow:0 0 60px #00aaff33,inset 0 0 45px #00aaff22}.coreOrb{width:112px;height:112px;border-radius:50%;background:#041a2d;border:1px solid #4bd3ff;display:grid;place-items:center;z-index:2;box-shadow:0 0 45px #009dff55;transition:.3s}.coreOrb.speaking{box-shadow:0 0 80px #00d9ffcc;transform:scale(1.05)}.coreOrb> :global(svg){width:43px;height:43px;color:#6ee5ff}.wave{position:absolute;bottom:45px;display:flex;align-items:center;gap:3px}.wave i{width:2px;height:8px;background:#52d8ff;animation:wave 1s ease-in-out infinite}.wave i:nth-child(2n){animation-delay:.15s}.wave i:nth-child(3n){animation-delay:.3s}.coreCopy{position:absolute;bottom:18px;text-align:center}.coreCopy small{display:block;color:#3e7898;font:7px monospace;letter-spacing:2px}.coreCopy b{display:block;margin-top:4px;font:11px monospace;letter-spacing:4px;color:#67dcff}.modeDock{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #104363;border-top:0}.modeDock button{background:#040d17;border:0;border-right:1px solid #104363;color:#6890a7;padding:15px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:9px;letter-spacing:1px}.modeDock button:last-child{border:0}.modeDock button:hover,.modeDock button.live{background:#07365a;color:#72e4ff}.modeDock svg{width:17px}
    .lessonConsole,.conversation{margin-top:22px;border:1px solid #104363;background:#030b14dd}.lessonHead{padding:22px;border-bottom:1px solid #103d59;display:flex;justify-content:space-between;align-items:center}.lessonHead h2{margin:6px 0;font-size:27px;font-weight:500}.lessonHead p{margin:0;color:#57788c;font-size:11px}.lessonHead>button{border:1px solid #2b9bd1;background:#07243a;color:#8eeaff;padding:11px 14px;display:flex;gap:7px;align-items:center;cursor:pointer}.lessonHead>button svg{width:14px}.lessonBody{display:grid;grid-template-columns:1.15fr .85fr}.steps{padding:12px;border-right:1px solid #103d59}.steps>button{width:100%;border:0;border-bottom:1px solid #0e3046;background:transparent;color:#7692a3;display:grid;grid-template-columns:34px 1fr 18px;gap:9px;text-align:left;align-items:center;padding:13px;cursor:pointer}.steps>button>span{font:10px monospace;color:#367798}.steps>button b{display:block;color:#b8d2df;font-size:11px;margin-bottom:4px}.steps>button small{display:block;font-size:9px;line-height:1.4}.steps>button svg{width:13px}.steps>button.current{background:#08243b;border-left:2px solid #4dd8ff}.steps>button.current b{color:#70e2ff}.steps>button.done>span{color:#23e6b3}.lessonAction{padding:24px;position:relative}.stepNo{position:absolute;right:20px;top:10px;font-size:55px;color:#0c2c41;font-weight:900}.lessonAction h3{font-size:24px;margin:10px 0}.lessonAction p{color:#648297;font-size:11px;line-height:1.6}.quick{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:18px 0}.quick button{background:#06121e;border:1px solid #154664;color:#7da2b7;padding:9px;font-size:9px;cursor:pointer}.next{background:#42caff;border:0;color:#02101a;padding:11px 15px;font-weight:900;font-size:10px;display:flex;align-items:center;gap:8px}.next svg{width:14px}
    .conversationHead{padding:14px 18px;border-bottom:1px solid #103d59;display:flex;justify-content:space-between;font:9px monospace;color:#5ccff5}.conversationHead>div:first-child{display:flex;gap:7px;align-items:center}.conversationHead svg{width:14px}.voiceSettings{display:flex;gap:8px;align-items:center}.voiceSettings label{color:#68899b}.voiceSettings button{background:none;border:1px solid #164a68;color:#6996ad;padding:6px 8px;font-size:8px;display:flex;gap:5px;align-items:center}.messages{padding:18px;display:flex;flex-direction:column;gap:9px;max-height:300px;overflow:auto}.bubble{max-width:80%;padding:11px 13px;border-radius:5px;white-space:pre-wrap;font-size:11px;line-height:1.6}.bubble.mentor{background:#061726;border:1px solid #10405d;color:#a9c9d9}.bubble.student{align-self:flex-end;background:#0a4f7a;color:#e8faff}.typing{display:flex;gap:7px;align-items:center}.typing svg{width:13px;animation:spin 1s linear infinite}.commandInput{border-top:1px solid #103d59;padding:12px;display:grid;grid-template-columns:40px 1fr 42px;gap:8px}.commandInput input{background:#06121d;border:1px solid #153f59;color:#d9f4ff;padding:11px;outline:none}.commandInput button{border:1px solid #1c6f9d;background:#082238;color:#57d9ff;display:grid;place-items:center}.commandInput button:last-child{background:#44cfff;color:#03101a}.commandInput button.live{background:#7b1834;color:#ff9bb6}.commandInput svg{width:16px}
    .intel{border-left:1px solid #0e4569;background:#020811dd;padding:22px 18px}.intelHead{display:flex;justify-content:space-between;align-items:center}.intelHead>div{display:flex;align-items:center;gap:8px}.intelHead span{font:7px monospace;background:#0aa67b;color:#d8fff5;padding:4px 6px}.intelHead small{font:9px monospace;letter-spacing:2px;color:#79b3d0}.intelHead svg{width:20px;color:#3bbff2}.intelIntro{font-size:10px;color:#4f7084}.radarList{margin-top:16px;border-top:1px solid #12394f}.radarList article{display:grid;grid-template-columns:27px 1fr auto;gap:8px;padding:15px 0;border-bottom:1px solid #12394f;align-items:start}.rank{font:9px monospace;color:#315b72}.radarList small{font:7px monospace;color:#2ec8ff}.radarList b{display:block;font-size:11px;margin:4px 0}.radarList p{margin:0;color:#56758a;font-size:9px}.radarList em{font:8px monospace;color:#28efba;font-style:normal}.scan{width:100%;margin-top:13px;background:#062239;border:1px solid #1c6f9d;color:#63dfff;padding:11px;font-size:9px;display:flex;gap:7px;justify-content:center}.scan svg{width:14px}.uploadMini{margin-top:25px;border:1px solid #174968;padding:20px;background:linear-gradient(145deg,#061725,#030b13)}.uploadMini> :global(svg){color:#45ccff}.uploadMini h3{font-size:20px;margin:8px 0}.uploadMini p{font-size:10px;color:#557589}.uploadMini label{display:block;text-align:center;background:#0a4d76;border:1px solid #269bd1;color:#b9efff;padding:10px;font-size:9px;cursor:pointer}.uploadMini input{display:none}.uploadMini>span{display:block;margin-top:9px;font-size:9px;color:#45d8bd}.languageCard{margin-top:14px;border:1px solid #123e59;padding:16px;display:flex;gap:12px}.languageCard> :global(svg){width:20px;color:#42caff;flex:none}.languageCard b{display:block;font-size:11px;margin:5px 0}.languageCard p{font-size:8px;color:#54778c;margin:0}
    @keyframes spin{to{transform:rotate(360deg)}}@keyframes wave{0%,100%{height:5px}50%{height:20px}}
    @media(max-width:1100px){.commandShell{grid-template-columns:80px 1fr}.intel{grid-column:2;border-left:0;border-top:1px solid #0e4569}.radarList{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}}
    @media(max-width:760px){.commandTop{padding:0 12px}.monoBrand{min-width:0}.monoBrand small,.system,.topActions a{display:none}.commandShell{display:block}.rail{position:static;height:auto;border-right:0;border-bottom:1px solid #0e4569;flex-direction:row;padding:8px;overflow:auto}.railLabel,.railFoot{display:none}.rail button{min-width:68px}.core{padding:16px}.hudTop{display:block}.hudStatus{justify-content:flex-start;margin-top:15px}.coreVisual{height:260px}.modeDock{overflow:auto}.modeDock button{min-width:95px}.lessonBody{grid-template-columns:1fr}.steps{border-right:0;border-bottom:1px solid #103d59}.lessonHead{align-items:flex-start;gap:15px;flex-direction:column}.intel{padding:18px}.radarList{display:block}.quick{grid-template-columns:1fr}.conversationHead{gap:12px;align-items:flex-start;flex-direction:column}.topActions select{max-width:125px}}
   `}</style>
 </main>
}