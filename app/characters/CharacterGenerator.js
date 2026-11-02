'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';

const presets=[
 {id:'tico',name:'Tico Torto',role:'The unpredictable gentleman',age:'adult man in his 30s',face:'long angular face, asymmetrical raised eyebrow, curled narrow moustache, slightly oversized ears',hair:'gravity-defying sculpted pompadour, dark hair',body:'very tall and lanky, slightly hunched shoulders, oversized hands',outfit:'mustard-yellow vintage tracksuit, shiny red loafers, thin gold rings',vibe:'supremely confident, eccentric, awkwardly elegant',accent:'#f3bf63',mark:'T'},
 {id:'faisca',name:'Dona Faísca',role:'The queen of sudden chaos',age:'older woman in her 60s',face:'sharp cheekbones, expressive smile, dramatic thin eyebrows, bold magenta lipstick',hair:'towering lightning-bolt-shaped silver-white coiffure',body:'petite frame with extravagant upright posture and animated hands',outfit:'emerald-green oversized suit, pink bow blouse, black-and-white patterned leggings, ruby ankle boots',vibe:'fierce, theatrical, mischievous and magnetic',accent:'#bdffc3',mark:'F'},
 {id:'beto',name:'Beto Bolha',role:'The unbothered main character',age:'adult man in his 40s',face:'perfectly round face, wide-set eyes, very serious deadpan expression, soft cheeks',hair:'precise ginger bowl haircut with a straight fringe',body:'stocky round silhouette, short legs, remarkably straight posture',outfit:'cobalt-blue tailored shorts suit, small lilac crossbody handbag, comically oversized white trainers',vibe:'calm and mysterious, unintentionally hilarious',accent:'#c6b3ff',mark:'B'}
];
const blank={id:'custom',name:'',role:'Your original character',age:'adult human',face:'distinctive believable facial features',hair:'unusual memorable hairstyle',body:'recognisable and expressive silhouette',outfit:'bold unexpected outfit with signature accessories',vibe:'charismatic, eccentric and funny',accent:'#c5fdba',mark:'+'};
const formats=[
 {id:'sheet',label:'4-view identity sheet'},
 {id:'portrait',label:'Portrait'},
 {id:'body',label:'Full body'}
];
const fields=[
 {key:'name',label:'Character name',placeholder:'e.g. Zeca Zigzag'},
 {key:'age',label:'Age and identity',placeholder:'e.g. adult woman in her 50s'},
 {key:'face',label:'Signature facial features',placeholder:'e.g. tiny moustache, asymmetrical grin'},
 {key:'hair',label:'Unforgettable hair',placeholder:'e.g. geometric platinum curls'},
 {key:'body',label:'Silhouette and posture',placeholder:'e.g. tall, narrow shoulders'},
 {key:'outfit',label:'Clothing and accessories',placeholder:'e.g. violet suit, giant yellow tie'},
 {key:'vibe',label:'Personality and expression',placeholder:'e.g. deadpan, mischievous'}
];
function clean(value){return String(value||'').replace(/\s+/g,' ').trim().slice(0,280);}
function makePrompt(c,format,background){
 const identity=[clean(c.age),clean(c.face),clean(c.hair),clean(c.body),clean(c.outfit),clean(c.vibe)].filter(Boolean).join('; ');
 const common=`Create an ORIGINAL, highly distinctive but believable human viral-comedy character named "${clean(c.name)||'Untitled Character'}". CHARACTER IDENTITY: ${identity}. Photorealistic real-person appearance, natural skin texture, sharp facial detail, physically plausible anatomy, creative memorable proportions, premium editorial photography, cinematic but even lighting, precise clothing and accessories. Maintain the exact same face, hair, outfit, body proportions and identity across all views. `;
 const shot=format==='sheet'?'Deliver one clean 2×2 CHARACTER REFERENCE SHEET with four clearly separated views: (1) front-facing full body, (2) 3/4 full body, (3) face close-up, (4) side-profile full body. All views must show the SAME character with consistent wardrobe, facial structure and hair. No cropped feet. ':format==='portrait'?'Deliver a waist-up editorial portrait looking at camera, with recognisable hair, face, accessories and natural expression. ':'Deliver a complete head-to-toe standing full-body fashion editorial image with hands and shoes fully visible. ';
 return common+shot+`Background: ${clean(background)||'seamless soft grey studio'}. Vertical 4:5 composition, crisp high resolution. No added text, logos, watermark, labels, duplicate people, monsters, robots, illustration, plastic skin, deformed hands or inconsistent faces. This is a concept prompt; output quality depends on the separate generation model.`;
}

export default function CharacterGenerator(){
 const [active,setActive]=useState('tico');
 const [character,setCharacter]=useState(presets[0]);
 const [format,setFormat]=useState('sheet');
 const [background,setBackground]=useState('seamless off-white photography studio');
 const [copied,setCopied]=useState(false);
 const [showPrompt,setShowPrompt]=useState(true);
 const prompt=useMemo(()=>makePrompt(character,format,background),[character,format,background]);
 function choose(item){setActive(item.id);setCharacter({...item});setCopied(false);}
 function edit(key,value){setActive('custom');setCharacter(c=>({...c,[key]:value}));setCopied(false);}
 async function copy(){try{await navigator.clipboard.writeText(prompt);setCopied(true);}catch{setCopied(false);}}
 return <main className="character-lab">
   <header className="cl-header">
    <Link href="/" className="cl-logo">K4K<span> APP</span><i>✳</i></Link>
    <nav aria-label="Character lab navigation"><Link href="/templates">Templates</Link><Link href="/create">Video Studio</Link><Link href="/characters" aria-current="page">Characters</Link></nav>
    <Link className="cl-account" href="/academy">My account ↗</Link>
   </header>
   <div className="cl-shell">
    <section className="cl-intro"><div><div className="cl-eyebrow"><span/> ORIGINAL CHARACTER WORKSHOP · PREVIEW</div><h1>Unforgettable faces.<br/><em>Unrepeatable energy.</em></h1><p>Build strange, photorealistic human personalities with a signature silhouette, outrageous wardrobe and consistent character-sheet instructions. Made for the viral remix world.</p></div><span className="cl-preview-badge">£0 PROMPT TEST · NO API CHARGES</span></section>
    <div className="cl-board">
     <section className="cl-setup" aria-labelledby="cl-setup-heading">
      <div className="cl-section-title"><div><small>01 / START WITH A PERSONALITY</small><h2 id="cl-setup-heading">Pick an original</h2></div><span>3 presets + custom</span></div>
      <div className="cl-presets">
       {presets.map(p=><button type="button" key={p.id} className={'cl-preset '+(active===p.id?'selected':'')} onClick={()=>choose(p)} aria-pressed={active===p.id}><span className="cl-preset-avatar" style={{'--tone':p.accent}}><b>{p.mark}</b><span className="cl-avatar-hair"/></span><strong>{p.name}</strong><small>{p.role}</small></button>)}
       <button type="button" className={'cl-preset cl-custom '+(active==='custom'?'selected':'')} onClick={()=>choose(blank)} aria-pressed={active==='custom'}><span className="cl-preset-avatar"><b>＋</b></span><strong>Start original</strong><small>Every detail is yours</small></button>
      </div>
      <div className="cl-section-title cl-details"><div><small>02 / MAKE IT IMPOSSIBLE TO FORGET</small><h2>Design the details</h2></div></div>
      <div className="cl-fields">{fields.map(f=><label key={f.key} className={f.key==='outfit'||f.key==='face'?'wide':''}><span>{f.label}</span><input maxLength={280} value={character[f.key]||''} placeholder={f.placeholder} onChange={e=>edit(f.key,e.target.value)}/></label>)}</div>
      <div className="cl-settings"><fieldset><legend>Output composition</legend><div className="cl-format-options">{formats.map(f=><button key={f.id} type="button" className={format===f.id?'active':''} aria-pressed={format===f.id} onClick={()=>setFormat(f.id)}>{f.label}</button>)}</div></fieldset><label>Background<input value={background} maxLength={120} onChange={e=>setBackground(e.target.value)}/></label></div>
     </section>
     <aside className="cl-output" aria-labelledby="cl-output-heading">
      <div className="cl-output-top"><span>CREATOR IDENTITY CARD</span><span>CONCEPT / NOT AN AI IMAGE</span></div>
      <div className="cl-preview-card" style={{'--identity-accent':character.accent||'#b9ffb0'}}>
       <div className="cl-abstract"><div className="cl-orbit"/><div className="cl-person-silhouette"><span className="head"/><span className="torso"/><span className="legs"/></div></div>
       <div className="cl-preview-overlay"><span>NEW CHARACTER CONCEPT</span><h2>{clean(character.name)||'Your next viral icon'}</h2><p>{clean(character.role)||'Your original character'}</p></div>
      </div>
      <div className="cl-output-label"><div><small>03 / READY FOR YOUR MODEL</small><h2 id="cl-output-heading">Identity prompt</h2></div><button type="button" onClick={()=>setShowPrompt(s=>!s)} aria-expanded={showPrompt}>{showPrompt?'Hide':'Show'} prompt {showPrompt?'−':'+'}</button></div>
      {showPrompt&&<div className="cl-prompt"><p>{prompt}</p></div>}
      <button className="cl-copy" type="button" onClick={copy}>{copied?'Copied to clipboard ✓':'Copy character prompt ↗'}</button>
      <Link href="/create" className="cl-next">Continue to Character Swap ↗</Link>
      <p className="cl-honest">This creates and copies an original generation prompt locally. It does not render a finished character image or spend credits. Live AI generation stays disabled until provider costs, credit enforcement and billing safeguards are verified.</p>
     </aside>
    </div>
    <section className="cl-footnote"><strong>One character. Endless remixes.</strong><p>Use your consistent character sheet as an image reference in Character Swap or Image to Video once generation is available. All preset personalities and styling directions are original to K4K APP.</p><Link href="/templates">Explore motion templates ↗</Link></section>
   </div>
 </main>;
}
