"use client";

import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";

type Overview = {
 administrator: { email: string };
 customerData?: { student_count: number; auth_user_count: number; membership_count: number; subscription_claim_count: number; generation_job_count: number; customers: {email:string;name:string;joined:string;membership_status:string}[] } | null;
 customerDataError?: string | null;
 environment: string;
 providerConfigured: boolean;
 storageConfigured: boolean;
 pilotEnabled: boolean;
 allowlistedTesterCount: number;
 modules: { name: string; status: string; detail: string }[];
};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client: SupabaseClient | null = url && key ? createClient(url, key) : null;

export default function StudioAdmin() {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState("");
 const [overview, setOverview] = useState<Overview | null>(null);
 const [loggedIn, setLoggedIn] = useState(false);
 const refresh = async () => {
   if (!client) { setMessage("Supabase authentication is not configured."); return; }
   const { data: { session } } = await client.auth.getSession();
   setLoggedIn(Boolean(session));
   if (!session) { setOverview(null); return; }
   try {
     const res = await fetch("/api/studio-admin/overview", { headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store" });
     const body = await res.json();
     if (!res.ok) { setOverview(null); setMessage(body.error || "Access denied."); return; }
     setOverview(body); setMessage("");
   } catch { setMessage("Could not reach the admin API."); }
 };
 useEffect(() => { void refresh(); const { data: { subscription } } = client?.auth.onAuthStateChange(() => { void refresh(); }) || { data: { subscription: null } }; return () => subscription?.unsubscribe(); }, []);
 const signIn = async (e: React.FormEvent) => { e.preventDefault(); if (!client) return; setBusy(true); setMessage(""); const { error } = await client.auth.signInWithPassword({ email, password }); setBusy(false); if (error) setMessage(error.message); else await refresh(); };
 const signOut = async () => { await client?.auth.signOut(); setOverview(null); setLoggedIn(false); setPassword(""); };
 const tiles = overview?.modules || [];
 return <main className="admin">
 <style>{`
 *{box-sizing:border-box}body{margin:0;background:#0a0910}.admin{min-height:100vh;background:#0a0910;color:#f8f6ff;font-family:Inter,Arial,sans-serif;padding:0 5% 70px}.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:25px 0;border-bottom:1px solid #282333}.brand{font-size:20px;font-weight:900;letter-spacing:-.05em}.brand b{color:#bc98ff}.bar a,.bar button{color:#c8adff;background:transparent;border:1px solid #514269;border-radius:10px;padding:10px 14px;text-decoration:none;cursor:pointer}.actions{display:flex;gap:10px;align-items:center}.heading{padding:55px 0 30px}.eyebrow{font-size:11px;letter-spacing:.16em;color:#bd98ff;font-weight:800}.heading h1{font-size:clamp(32px,5vw,54px);letter-spacing:-.055em;margin:12px 0}.heading p,.muted{color:#a8a0b6}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.card{background:#191622;border:1px solid #332b41;border-radius:18px;padding:23px;min-height:160px}.card h2{font-size:19px;margin:0 0 16px}.card p{font-size:13px;color:#aaa3b7;line-height:1.6}.status{font-size:12px;font-weight:750;color:#cbaaff}.metrics{display:flex;gap:15px;flex-wrap:wrap;margin-bottom:24px}.metric{background:#21192e;border:1px solid #4c3964;border-radius:14px;padding:17px 22px;min-width:190px}.metric strong{display:block;font-size:24px;margin-top:7px}.metric small{color:#b7a8c8}.login{max-width:430px;margin:60px auto;padding:30px;background:#191622;border:1px solid #443653;border-radius:20px}.login h1{margin-top:0}.login label{display:block;font-size:13px;margin:18px 0 7px;color:#cfc7dd}.login input{width:100%;background:#100e16;color:white;border:1px solid #50445e;padding:14px;border-radius:10px;font-size:15px}.primary{background:#b28aff;color:#140d20;border:0;padding:14px 18px;border-radius:11px;font-weight:850;cursor:pointer}.login .primary{width:100%;margin-top:22px}.error{color:#f1a2b3;font-size:13px;line-height:1.5}.notice{background:#1c1727;border:1px solid #51416a;padding:16px;border-radius:12px;color:#cdbce3;font-size:13px;margin-top:24px}@media(max-width:850px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:570px){.cards{grid-template-columns:1fr}.admin{padding:0 5% 45px}.bar{align-items:flex-start}.actions{flex-wrap:wrap;justify-content:end}.login{margin-top:35px}}
 `}</style>
 <header className="bar"><div className="brand">✦ K4K <b>ADMIN</b></div><div className="actions"><Link href="/studio-pilot">Creator Studio</Link>{loggedIn&&<button onClick={signOut}>Sign out</button>}</div></header>
 {!overview ? <section className="login"><div className="eyebrow">RESTRICTED WORKSPACE</div><h1>Admin sign in</h1><p className="muted">Only verified, authorised K4K administrators can access this dashboard.</p><form onSubmit={signIn}><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary" type="submit" disabled={busy}>{busy?"Signing in...":"Open dashboard"}</button></form>{message&&<p className="error" role="status">{message}</p>}</section> :
 <><section className="heading"><span className="eyebrow">PRIVATE PREVIEW • {overview.environment.toUpperCase()}</span><h1>Creator Studio overview</h1><p>Signed in as {overview.administrator.email}. Live configuration checks are shown below; unavailable data is clearly labelled.</p></section>
 <section className="metrics"><div className="metric"><small>Higgsfield credentials</small><strong>{overview.providerConfigured?"Configured":"Missing"}</strong></div><div className="metric"><small>Reference storage</small><strong>{overview.storageConfigured?"Configured":"Missing"}</strong></div><div className="metric"><small>Private generation pilot</small><strong>{overview.pilotEnabled?"Enabled":"Disabled"}</strong></div><div className="metric"><small>Allowlisted testers</small><strong>{overview.allowlistedTesterCount}</strong></div></section>
 {overview.customerData&&<section style={{marginBottom:30}}><h2>Existing Academy customers</h2><p className="muted">Read-only records from your existing Academy database. No customer accounts or subscriptions have been changed.</p><div className="metrics"><div className="metric"><small>Student records</small><strong>{overview.customerData.student_count}</strong></div><div className="metric"><small>Auth accounts</small><strong>{overview.customerData.auth_user_count}</strong></div><div className="metric"><small>Membership records</small><strong>{overview.customerData.membership_count}</strong></div><div className="metric"><small>Subscription claims</small><strong>{overview.customerData.subscription_claim_count}</strong></div></div><div style={{overflowX:"auto",background:"#191622",border:"1px solid #332b41",borderRadius:16}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left",fontSize:13}}><thead><tr><th style={{padding:16}}>Customer</th><th style={{padding:16}}>Email</th><th style={{padding:16}}>Membership</th><th style={{padding:16}}>Joined</th></tr></thead><tbody>{overview.customerData.customers.map((c,i)=><tr key={c.email+"-"+i} style={{borderTop:"1px solid #332b41"}}><td style={{padding:16}}>{c.name||"—"}</td><td style={{padding:16}}>{c.email}</td><td style={{padding:16}}>{c.membership_status}</td><td style={{padding:16}}>{new Date(c.joined).toLocaleDateString("en-GB")}</td></tr>)}</tbody></table></div></section>}
 <section className="cards">{tiles.map(t=><article className="card" key={t.name}><h2>{t.name}</h2><span className="status">{t.status}</span><p>{t.detail}</p></article>)}</section>
 <p className="notice">This is an access-controlled operational dashboard preview. Customer totals, billing, generation spend and errors are not displayed until their secure data integrations are implemented. No production settings or payments can be changed here.</p>
 <button className="primary" style={{marginTop:20}} onClick={()=>void refresh()}>Refresh status</button></>}
 </main>;
}
