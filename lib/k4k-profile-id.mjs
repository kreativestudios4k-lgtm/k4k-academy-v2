// The full existing Auth UUID is the stable, collision-free support identifier.
 // It is a reference, never a password, access token, or authorization credential.
export function k4kProfileId(userId){
 if(typeof userId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))return null;
 return 'K4K-'+userId.toUpperCase();
}
export function profileName(user){return [user?.user_metadata?.full_name,user?.user_metadata?.name,user?.email?.split('@')[0]].find(v=>typeof v==='string'&&v.trim())?.trim().slice(0,90)||'Creator'}
export function profileInitials(user){return profileName(user).split(/\s+/).slice(0,2).map(v=>Array.from(v)[0]||'').join('').toUpperCase().slice(0,2)||'K4'}
