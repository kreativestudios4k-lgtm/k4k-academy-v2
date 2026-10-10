'use client';
import {useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {Check,KeyRound} from 'lucide-react';
export default function UpdatePassword(){
 const[p1,setP1]=useState('');const[p2,setP2]=useState('');const[msg,setMsg]=useState('');const[done,setDone]=useState(false);const[loading,setLoading]=useState(false);
 async function submit(e){e.preventDefault();setMsg('');if(p1.length<8){setMsg('Use at least 8 characters.');return}if(p1!==p2){setMsg('Passwords do not match.');return}setLoading(true);const supabase=createClient();const{error}=await supabase.auth.updateUser({password:p1,data:{k4k_temp_password:false}});setLoading(false);if(error){setMsg(error.message);return}setDone(true)}
 return <main className="authpage"><Link href="/" className="brand"><span>K4K</span> ACADEMY</Link><form onSubmit={submit}><small>SECURE PASSWORD CHANGE</small><h1>NEW<br/><i>PASSWORD.</i></h1>{done?<><div className="authSuccess"><Check/> Password updated successfully.</div><Link className="authEnter" href="/academy">Enter Academy →</Link></>:<><label>New password<input type="password" minLength={8} required value={p1} onChange={e=>setP1(e.target.value)} placeholder="At least 8 characters"/></label><label>Confirm password<input type="password" minLength={8} required value={p2} onChange={e=>setP2(e.target.value)} placeholder="Repeat password"/></label>{msg&&<p className="authmsg">{msg}</p>}<button disabled={loading}>{loading?'Updating…':'Update password'} <KeyRound/></button></>}</form></main>
}