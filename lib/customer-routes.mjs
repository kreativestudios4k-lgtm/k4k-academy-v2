// One destination policy for password login, email confirmation and OAuth.
export const K4K_PUBLIC_DESTINATIONS=new Set(['/k4k-app/creator','/k4k-app/videos','/k4k-app/account','/k4k-app/credits','/k4k-app/explore']);
export function studioDestination(requested){return K4K_PUBLIC_DESTINATIONS.has(requested)?requested:'/k4k-app/creator';}
export function retiredCustomerDestination(path){
 if(['/academy','/mentor','/prompts'].some(base=>path===base||path.startsWith(base+'/')))return '/k4k-app/creator';
 if(path==='/create')return '/k4k-app/creator';
 if(path==='/templates')return '/k4k-app/explore';
 return null;
}
