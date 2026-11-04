'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import PreviewShell from '../PreviewShell';
import {useK4KLocale} from '../locale';
import {createClient} from '../../../lib/supabase/client';

const MAX_VIDEO=150*1024*1024;
const MAX_IMAGE=10*1024*1024;
const IMAGE_TYPES=['image/png','image/jpeg','image/webp'];
const VIDEO_TYPES=['video/mp4','video/webm','video/quicktime'];
function useLocalPreview(){
 const [file,setFile]=useState(null);
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!file){setUrl('');return;}const objectUrl=URL.createObjectURL(file);setUrl(objectUrl);return()=>URL.revokeObjectURL(objectUrl)},[file]);
 return {file,url,setFile};
}
export default function Creator(){
 const {locale}=useK4KLocale();
 const video=useLocalPreview(),character=useLocalPreview();
 const [error,setError]=useState('');
 const [prompt,setPrompt]=useState('');
 const [model,setModel]=useState('standard');
 const [uploading,setUploading]=useState(false),[uploadMessage,setUploadMessage]=useState('');
 async function saveReference(){
  if(!character.file||uploading)return;
  setUploadMessage('');setUploading(true);
  try{
   if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)throw new Error('Storage is not configured for this preview.');
   const client=createClient();const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user)throw new Error('Sign in to your K4K APP account before saving an image.');
   if(!IMAGE_TYPES.includes(character.file.type)||character.file.size>MAX_IMAGE)throw new Error(copy.limit);
   const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[character.file.type];
   const path=user.id+'/'+crypto.randomUUID()+'.'+extension;
   const {error:uploadError}=await client.storage.from('studio-references').upload(path,character.file,{contentType:character.file.type,upsert:false});
   if(uploadError)throw uploadError;
   setUploadMessage('Reference saved privately to your account. No AI generation or credit charge occurred.');
  }catch(e){setUploadMessage(e?.message||'Unable to save reference image.')}finally{setUploading(false)}
 }
 const pt=locale==='pt',es=locale==='es';
 const copy=pt?{title:'Estúdio de criação',intro:'Prepare seu vídeo e sua foto. O vídeo fica no navegador; você pode salvar a foto na sua conta.',reference:'Vídeo de referência',image:'Foto do personagem',prompt:'Instruções criativas (opcional)',placeholder:'Descreva o personagem, o cenário ou o resultado desejado...',model:'Modelo de geração',ready:'Prévia pronta para geração',waiting:'Adicione um vídeo e uma imagem para preparar seu projeto',disabled:'Geração de IA ainda desativada — nenhum crédito será cobrado.',back:'Explorar templates',video:'Escolher vídeo',photo:'Escolher foto',remove:'Remover',privacy:'O vídeo fica neste navegador. A foto só é enviada ao armazenamento privado se você clicar em Salvar.',limit:'Arquivo inválido ou acima do limite permitido.'}:es?{title:'Estudio de creación',intro:'Prepara tu vídeo y foto. El vídeo permanece en tu navegador; puedes guardar la foto en tu cuenta.',reference:'Vídeo de referencia',image:'Foto del personaje',prompt:'Instrucciones creativas (opcional)',placeholder:'Describe el resultado deseado...',model:'Modelo de generación',ready:'Vista previa lista',waiting:'Añade un vídeo y una imagen',disabled:'Generación desactivada — no se cobran créditos.',back:'Explorar plantillas',video:'Elegir vídeo',photo:'Elegir foto',remove:'Quitar',privacy:'El vídeo permanece en tu navegador. La foto solo se sube si eliges guardarla.',limit:'Archivo no válido o demasiado grande.'}:{title:'Creator Studio',intro:'Prepare a reference video and character image. Video stays in your browser; you can choose to save the image privately.',reference:'Reference video',image:'Character photo',prompt:'Creative instructions (optional)',placeholder:'Describe the character, scene, or result you want...',model:'Generation model',ready:'Project ready for generation',waiting:'Add a video and an image to prepare your project',disabled:'AI generation is disabled — no credits will be charged.',back:'Explore templates',video:'Choose video',photo:'Choose photo',remove:'Remove',privacy:'Video stays in this browser. Your image is uploaded to private storage only if you choose Save reference.',limit:'Invalid file or file exceeds the size limit.'};
 function choose(event,target,kind,max){const file=event.target.files?.[0];setError('');if(!file)return;if(!(kind==='image'?IMAGE_TYPES:VIDEO_TYPES).includes(file.type)||file.size>max){setError(copy.limit);event.target.value='';return;}target.setFile(file);}
 return <PreviewShell active="Creator">
 <div className="k4k-visual" aria-hidden="true">✦</div>
 <h1>{copy.title}</h1><p>{copy.intro}</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16,margin:'26px 0'}}>
 <section className="k4k-card"><h2>01 · {copy.reference}</h2>
 <div style={{aspectRatio:'9 / 16',maxHeight:370,background:'#151816',borderRadius:16,overflow:'hidden',display:'grid',placeItems:'center',color:'#dfff38'}}>
 {video.url?<video src={video.url} controls playsInline preload="metadata" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:50}}>▶</span>}</div>
 <label style={{display:'block',marginTop:16,fontWeight:700}}>{copy.video}<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>choose(e,video,'video',MAX_VIDEO)} style={{display:'block',width:'100%',marginTop:9}}/></label>
 {video.file&&<p><small>{video.file.name} · {(video.file.size/1048576).toFixed(1)} MB</small> <button type="button" onClick={()=>video.setFile(null)}>{copy.remove}</button></p>}
 </section>
 <section className="k4k-card"><h2>02 · {copy.image}</h2>
 <div style={{aspectRatio:'9 / 16',maxHeight:370,background:'#151816',borderRadius:16,overflow:'hidden',display:'grid',placeItems:'center',color:'#dfff38'}}>
 {character.url?<img src={character.url} alt="Character preview" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:50}}>✦</span>}</div>
 <label style={{display:'block',marginTop:16,fontWeight:700}}>{copy.photo}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>choose(e,character,'image',MAX_IMAGE)} style={{display:'block',width:'100%',marginTop:9}}/></label>
 {character.file&&<><p><small>{character.file.name} · {(character.file.size/1048576).toFixed(1)} MB</small> <button type="button" onClick={()=>character.setFile(null)}>{copy.remove}</button></p><button type="button" onClick={saveReference} disabled={uploading} style={{padding:12,borderRadius:10,background:'#d9ff3d',fontWeight:800}}>{uploading?'Saving…':pt?'Salvar referência privada':es?'Guardar referencia privada':'Save reference privately'}</button></>}
 {uploadMessage&&<p role="status" style={{overflowWrap:'anywhere'}}>{uploadMessage}</p>}
 </section></div>
 {error&&<p role="alert" style={{color:'#b42318'}}>{error}</p>}
 <div className="k4k-card"><h2>03 · {copy.model}</h2><select value={model} onChange={e=>setModel(e.target.value)} style={{width:'100%',padding:13,borderRadius:12}}><option value="standard">Standard · Preview</option><option value="premium">Premium · Preview</option></select>
 <label style={{display:'block',marginTop:18,fontWeight:700}}>{copy.prompt}<textarea value={prompt} onChange={e=>setPrompt(e.target.value.slice(0,1200))} placeholder={copy.placeholder} rows={4} maxLength={1200} style={{display:'block',width:'100%',padding:13,borderRadius:12,marginTop:8}}/></label>
 <p style={{fontWeight:800,color:video.file&&character.file?'#28783e':'#6d6d6d'}}>{video.file&&character.file?copy.ready:copy.waiting}</p>
 <button type="button" disabled style={{width:'100%',padding:16,border:0,borderRadius:12,background:'#d9ff3d',fontWeight:900,opacity:.65,cursor:'not-allowed'}}>✦ {copy.disabled}</button>
 <p><small>{copy.privacy}</small></p></div>
 <Link className="k4k-black" href="/k4k-app">{copy.back}</Link>
 </PreviewShell>;
}
