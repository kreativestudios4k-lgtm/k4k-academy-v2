'use client';
import {useState} from 'react';
import {signOutK4K} from '../k4k-app/useVerifiedAccount';
import {LogOut} from 'lucide-react';
export default function LogoutButton(){const [busy,setBusy]=useState(false);const [error,setError]=useState('');async function logout(){if(busy)return;setBusy(true);setError('');try{await signOutK4K()}catch(e){setError('Unable to sign out. Please try again.');setBusy(false)}}return <span style={{display:'inline-flex',flexDirection:'column',gap:6}}><button type='button' onClick={logout} disabled={busy} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px 15px',borderRadius:8,border:'1px solid #ffffff40',background:'#202020',color:'#faf9f6',fontWeight:700,cursor:busy?'wait':'pointer'}}><LogOut size={16}/>{busy?'Signing out…':'Log out'}</button>{error&&<small role='alert' style={{color:'#ffb7ac'}}>{error}</small>}</span>}
