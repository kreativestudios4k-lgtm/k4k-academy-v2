'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {CheckCircle2,ArrowRight,LoaderCircle} from 'lucide-react';

const lessons=[
 {id:'k4k-v3-realism',name:'Lab 01 · The Reality Engine',href:'/academy/lessons/reality-engine'},
 {id:'k4k-v3-wardrobe',name:'Lab 02 · The Wardrobe Lock',href:'/academy/lessons/wardrobe-lock'},
 {id:'k4k-v3-scene',name:'Lab 03 · The Scene Transfer',href:'/academy/lessons/scene-transfer'},
 {id:'k4k-v3-control',name:'Lab 04 · The Prompt Control Room',href:'/academy/lessons/prompt-control'},
 {id:'k4k-v3-audit',name:'Lab 05 · The Final Quality Gate',href:'/academy/lessons/final-quality-gate'}
];

export default function LearningProgress({workflowTwoAvailable=false}){
 const [progress,setProgress]=useState({});const [status,setStatus]=useState('loading');
 useEffect(()=>{let alive=true;(async()=>{try{
  const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw Error('Sign in to view progress');
  const {data,error}=await supabase.from('lesson_progress').select('lesson_id,completed').eq('user_id',user.id).in('lesson_id',lessons.map(x=>x.id));
  if(error)throw error;
  if(alive){setProgress(Object.fromEntries((data||[]).map(x=>[x.lesson_id,!!x.completed])));setStatus('ready')}
 }catch{if(alive)setStatus('error')}})();return()=>{alive=false}},[]);
 const count=lessons.filter(x=>progress[x.id]).length;
 return <section className="learningProgress" aria-label="My workflow progress">
  <div className="learningProgressTop"><div><small>YOUR K4K IDEA JOURNEY</small><h2>Track your K4K IDEA training.</h2></div><strong>{status==='ready'?count+'/'+lessons.length:'—'} <span>completed</span></strong></div>
  <div className="learningProgressTrack"><div style={{width:(count/lessons.length*100)+'%'}}/></div>
  {status==='loading'?<p><LoaderCircle size={15}/> Loading your saved progress…</p>:status==='error'?<p>Progress could not be loaded right now. Your lessons are still available below.</p>:null}
  <div className="learningProgressList">{lessons.map((lesson,i)=>{const locked=false;return <Link key={lesson.id} href={lesson.href} className="learningProgressItem"><span className={progress[lesson.id]?'done':''}>{progress[lesson.id]?<CheckCircle2 size={20}/>:String(i+1).padStart(2,'0')}</span><div><b>{lesson.name}</b><small>{progress[lesson.id]?'Completed':'Ready to learn'}</small></div><ArrowRight size={17}/></Link>})}</div>
 </section>;
}

export function CompleteWorkflowButton({lessonId}){
 const [completed,setCompleted]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let alive=true;(async()=>{try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Please sign in again.');const {data,error}=await supabase.from('lesson_progress').select('completed').eq('user_id',user.id).eq('lesson_id',lessonId).maybeSingle();if(error)throw error;if(alive)setCompleted(!!data?.completed)}catch(e){if(alive)setError('Progress could not be loaded.')}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[lessonId]);
 async function toggle(){setLoading(true);setError('');try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Please sign in again.');const next=!completed;const {error}=await supabase.from('lesson_progress').upsert({user_id:user.id,lesson_id:lessonId,completed:next,updated_at:new Date().toISOString()},{onConflict:'user_id,lesson_id'});if(error)throw error;setCompleted(next)}catch{setError('Could not save progress. Please try again.')}finally{setLoading(false)}}
 return <div className="completeWorkflow"><button type="button" disabled={loading} onClick={toggle}><CheckCircle2 size={19}/>{loading?'LOADING…':completed?'COMPLETED ✓ · MARK AS INCOMPLETE':'MARK WORKFLOW AS COMPLETED'}</button>{error&&<p role="alert">{error}</p>}{completed&&<p role="status">Well done! This lesson is marked complete in your Academy dashboard.</p>}</div>;
}
