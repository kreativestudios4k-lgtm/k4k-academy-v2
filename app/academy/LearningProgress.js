'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {CheckCircle2,ArrowRight,LoaderCircle} from 'lucide-react';

const lessons=[
 {id:'workflow-001',name:'Dembow Party · Character Swap',href:'/academy/workflows/viral-character-swap'},
 {id:'workflow-002',name:'Puskás · Football Character Swap',href:'/academy/workflows/puskas-character-swap'}
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
  <div className="learningProgressTop"><div><small>YOUR LEARNING JOURNEY</small><h2>Pick up where you left off.</h2></div><strong>{status==='ready'?count+'/2':'—'} <span>completed</span></strong></div>
  <div className="learningProgressTrack"><div style={{width:(count/2*100)+'%'}}/></div>
  {status==='loading'?<p><LoaderCircle size={15}/> Loading your saved progress…</p>:status==='error'?<p>Progress could not be loaded right now. Your lessons are still available below.</p>:null}
  <div className="learningProgressList">{lessons.map((lesson,i)=>{const locked=i===1&&!workflowTwoAvailable;return <Link key={lesson.id} href={lesson.href} className="learningProgressItem"><span className={progress[lesson.id]?'done':''}>{progress[lesson.id]?<CheckCircle2 size={20}/>:String(i+1).padStart(2,'0')}</span><div><b>{lesson.name}</b><small>{progress[lesson.id]?'Completed':locked?'Unlocks Monday 12 October':'Ready to learn'}</small></div><ArrowRight size={17}/></Link>})}</div>
 </section>;
}

export function CompleteWorkflowButton({lessonId}){
 const [completed,setCompleted]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let alive=true;(async()=>{try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Please sign in again.');const {data,error}=await supabase.from('lesson_progress').select('completed').eq('user_id',user.id).eq('lesson_id',lessonId).maybeSingle();if(error)throw error;if(alive)setCompleted(!!data?.completed)}catch(e){if(alive)setError('Progress could not be loaded.')}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[lessonId]);
 async function toggle(){setLoading(true);setError('');try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Please sign in again.');const next=!completed;const {error}=await supabase.from('lesson_progress').upsert({user_id:user.id,lesson_id:lessonId,completed:next,updated_at:new Date().toISOString()},{onConflict:'user_id,lesson_id'});if(error)throw error;setCompleted(next)}catch{setError('Could not save progress. Please try again.')}finally{setLoading(false)}}
 return <div className="completeWorkflow"><button type="button" disabled={loading} onClick={toggle}><CheckCircle2 size={19}/>{loading?'LOADING…':completed?'COMPLETED ✓ · MARK AS INCOMPLETE':'MARK WORKFLOW AS COMPLETED'}</button>{error&&<p role="alert">{error}</p>}{completed&&<p role="status">Well done! This lesson is marked complete in your Academy dashboard.</p>}</div>;
}
