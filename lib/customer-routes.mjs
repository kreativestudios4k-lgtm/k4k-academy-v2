// One destination policy for password login, email confirmation and OAuth.
// /academy is included: an existing student signing in from a course link
// returns to their lessons, which the membership gate in proxy.js protects.
export const K4K_PUBLIC_DESTINATIONS=new Set(['/k4k-app/creator','/k4k-app/videos','/k4k-app/account','/k4k-app/credits','/k4k-app/explore','/academy']);
export const K4K_PLAN_KEYS=new Set(['starter','creator','pro','studio']);
export function validPlan(value){return typeof value==='string'&&K4K_PLAN_KEYS.has(value)?value:null;}
export function templateStudioDestination(id){return typeof id==='string'&&/^k4k-\d{3}$/.test(id)?'/k4k-app/creator?template='+id:'/k4k-app/creator';}
export function planDestination(plan){return validPlan(plan)?'/k4k-app/credits?plan='+plan:'/k4k-app/credits';}
export function planRegistration(plan){return validPlan(plan)?'/k4k-app/register?plan='+plan:'/k4k-app/register';}
export function checkoutReturnDestination(sessionId){
 const base='/k4k-app/creator?checkout=success';
 return typeof sessionId==='string'&&/^cs_(?:test|live)_[A-Za-z0-9_]{8,240}$/.test(sessionId)?base+'&session_id='+sessionId:base;
}
export function studioDestination(requested){
 if(K4K_PUBLIC_DESTINATIONS.has(requested))return requested;
 if(typeof requested==='string'&&/^\/k4k-app\/creator\?template=k4k-\d{3}$/.test(requested))return requested;
 // Only a single approved plan query is permitted, never an arbitrary URL.
 if(typeof requested==='string'&&/^\/k4k-app\/credits\?plan=(starter|creator|pro|studio)$/.test(requested))return requested;
 if(typeof requested==='string'&&/^\/k4k-app\/creator\?checkout=success(?:&session_id=cs_(?:test|live)_[A-Za-z0-9_]{8,240})?$/.test(requested))return requested;
 return '/k4k-app/creator';
}
// Retired interfaces only. The Academy course (/academy, /prompts) is NOT
// retired: paying members keep it. Redirecting those here would send every
// existing student to the studio and lock them out of the lessons they bought.
export function retiredCustomerDestination(path){
 if(path==='/mentor'||path.startsWith('/mentor/'))return '/k4k-app/creator';
 if(path==='/create')return '/k4k-app/creator';
 if(path==='/templates')return '/k4k-app/explore';
 return null;
}
// Member-only Academy course paths, gated by the membership check in proxy.js.
export function isAcademyPath(path){return ['/academy','/prompts'].some(base=>path===base||path.startsWith(base+'/'));}
