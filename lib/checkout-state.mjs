// Checkout readiness is separate from authentication. An expired session
// never converts public launch availability into a closed checkout.
export async function loadCheckoutState({auth,fetchImpl=globalThis.fetch}){
 let session=null,user=null;
 try{
  const result=await auth.getSession();
  if(!result.error)session=result.data?.session;
  if(session?.access_token){
   const check=await auth.getUser();
   if(!check.error&&check.data?.user&&!check.data.user.is_anonymous&&check.data.user.id===session.user?.id)user=check.data.user;
  }
 }catch{}
 let billing=null,readinessError=false;
 try{
  const response=await fetchImpl('/api/billing/readiness',{cache:'no-store',headers:user&&session?.access_token?{Authorization:'Bearer '+session.access_token}:{},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('READINESS_UNAVAILABLE');
  billing=await response.json();
  if(typeof billing?.checkoutReady!=='boolean')throw Error('READINESS_UNAVAILABLE');
 }catch{billing=null;readinessError=true;}
 return {signedIn:Boolean(user),billing,readinessError};
}
