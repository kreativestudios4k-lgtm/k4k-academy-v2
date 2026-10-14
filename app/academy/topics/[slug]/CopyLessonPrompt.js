'use client';
import {useState} from 'react';
import {Copy,Check} from 'lucide-react';
export default function CopyLessonPrompt({prompt}){
 const[status,setStatus]=useState('ready');
 async function copy(){try{await navigator.clipboard.writeText(prompt);setStatus('copied')}catch{setStatus('error')}}
 return <div>
  <pre>{prompt}</pre>
  <button type="button" onClick={copy} style={{display:'inline-flex',alignItems:'center',gap:8,border:0,borderRadius:999,background:'#baff45',color:'#091009',padding:'13px 19px',fontWeight:900,margin:'12px 0 22px',cursor:'pointer'}}>
   {status==='copied'?<Check size={16}/>:<Copy size={16}/>}
   {status==='copied'?'COPIED — ADAPT YOUR REFERENCES':status==='error'?'SELECT THE PROMPT ABOVE TO COPY':'COPY THIS PRACTICE PROMPT'}
  </button>
 </div>
}