'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';

const greetings={
 en:{name:'English',text:'Welcome to K4K Academy. Your creator journey starts here. K4K Core is online and ready to learn with you.'},
 'pt-BR':{name:'Português',text:'Bem-vindo à K4K Academy. A sua jornada como criador começa aqui. O K4K Core está online e pronto para aprender com você.'},
 'pt-PT':{name:'Português',text:'Bem-vindo à K4K Academy. A tua jornada como criador começa aqui. O K4K Core está online e pronto para aprender contigo.'},
 es:{name:'Español',text:'Bienvenido a K4K Academy. Tu camino como creador empieza aquí. K4K Core está en línea y listo para aprender contigo.'},
 fr:{name:'Français',text:'Bienvenue à la K4K Academy. Ton parcours de créateur commence ici. K4K Core est en ligne et prêt à apprendre avec toi.'},
 de:{name:'Deutsch',text:'Willkommen bei der K4K Academy. Deine Creator-Reise beginnt hier. K4K Core ist online und bereit, mit dir zu lernen.'},
 it:{name:'Italiano',text:'Benvenuto alla K4K Academy. Il tuo percorso da creator inizia qui. K4K Core è online e pronto a imparare con te.'},
 nl:{name:'Nederlands',text:'Welkom bij K4K Academy. Jouw reis als creator begint hier. K4K Core is online en klaar om met je te leren.'},
 sv:{name:'Svenska',text:'Välkommen till K4K Academy. Din resa som kreatör börjar här. K4K Core är online och redo att lära tillsammans med dig.'},
 pl:{name:'Polski',text:'Witamy w K4K Academy. Twoja droga twórcy zaczyna się tutaj. K4K Core jest online i gotowy do nauki razem z Tobą.'},
 tr:{name:'Türkçe',text:'K4K Academy’ye hoş geldin. İçerik üreticisi yolculuğun burada başlıyor. K4K Core çevrimiçi ve seninle öğrenmeye hazır.'},
 ar:{name:'العربية',text:'مرحباً بك في أكاديمية K4K. رحلتك كصانع محتوى تبدأ من هنا. K4K Core متصل وجاهز للتعلم معك.'},
 hi:{name:'हिन्दी',text:'K4K Academy में आपका स्वागत है। एक क्रिएटर के रूप में आपकी यात्रा यहाँ से शुरू होती है। K4K Core ऑनलाइन है और आपके साथ सीखने के लिए तैयार है।'},
 ur:{name:'اردو',text:'K4K Academy میں خوش آمدید۔ ایک کریئیٹر کے طور پر آپ کا سفر یہاں سے شروع ہوتا ہے۔ K4K Core آن لائن ہے اور آپ کے ساتھ سیکھنے کے لیے تیار ہے۔'},
 ja:{name:'日本語',text:'K4K Academyへようこそ。クリエイターとしての旅はここから始まります。K4K Coreはオンラインで、あなたと一緒に学ぶ準備ができています。'},
 ko:{name:'한국어',text:'K4K Academy에 오신 것을 환영합니다. 크리에이터로서의 여정이 여기서 시작됩니다. K4K Core가 온라인 상태이며 함께 배울 준비가 되어 있습니다.'},
 zh:{name:'中文',text:'欢迎来到 K4K Academy。你的创作者之旅从这里开始。K4K Core 已上线，准备与你一起学习。'},
 ru:{name:'Русский',text:'Добро пожаловать в K4K Academy. Ваш путь создателя начинается здесь. K4K Core в сети и готов учиться вместе с вами.'}
};

function resolveGreeting(locale){
 const raw=String(locale||'en').replace('_','-');
 if(greetings[raw])return [raw,greetings[raw]];
 const base=raw.split('-')[0];
 if(base==='pt')return ['pt-PT',greetings['pt-PT']];
 return [base,greetings[base]||greetings.en];
}

export default function WelcomeVoice(){
 const [locale,setLocale]=useState('en');const [label,setLabel]=useState('English');
 const [playing,setPlaying]=useState(false);const [loading,setLoading]=useState(false);const [unavailable,setUnavailable]=useState(false);
 const audioRef=useRef(null);const urlRef=useRef(null);
 useEffect(()=>{const [resolved,greeting]=resolveGreeting(navigator.languages?.[0]||navigator.language||'en');setLocale(resolved);setLabel(greeting.name);return()=>{audioRef.current?.pause();if(urlRef.current)URL.revokeObjectURL(urlRef.current)}},[]);
 async function play(){
  if(playing){audioRef.current?.pause();setPlaying(false);return}
  if(loading||unavailable)return;
  setLoading(true);
  try{
   const [,greeting]=resolveGreeting(locale);
   const res=await fetch('/api/mentor/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:greeting.text,voice:'core',language:locale})});
   if(!res.ok)throw Error('Voice currently unavailable');
   const blob=await res.blob();
   if(urlRef.current)URL.revokeObjectURL(urlRef.current);
   urlRef.current=URL.createObjectURL(blob);
   const audio=new Audio(urlRef.current);audioRef.current=audio;
   audio.onplay=()=>setPlaying(true);audio.onended=()=>setPlaying(false);audio.onerror=()=>{setPlaying(false);setUnavailable(true)};
   await audio.play();
  }catch{setUnavailable(true);setPlaying(false)}
  finally{setLoading(false)}
 }
 return <div className="welcomeVoice" style={{borderColor:unavailable?'#6c5337':'#174c6b'}}>
  <button type="button" onClick={play} disabled={loading||unavailable} style={{display:'flex',alignItems:'center',gap:12,width:'100%',background:'transparent',border:0,color:'inherit',cursor:unavailable?'not-allowed':'pointer',textAlign:'left',padding:0}}>
   <span className="voicePulse">{playing?<VolumeX/>:<Volume2/>}</span>
   <span><small>K4K CORE · {label.toUpperCase()}</small><b>{unavailable?'VOICE TEMPORARILY UNAVAILABLE':loading?'PREPARING WELCOME…':playing?'STOP WELCOME MESSAGE':'PLAY OPTIONAL VOICE WELCOME'}</b></span>
  </button>
  {unavailable&&<span style={{display:'block',fontSize:11,color:'#d7bda0',marginTop:9}}>Your lessons are available as normal. Voice playback will return when the service is restored.</span>}
 </div>;
}
