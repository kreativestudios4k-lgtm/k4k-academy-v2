// Only a server-owned partner code is persisted. Never accept a commission rate,
// partner user ID or referred user ID from the browser.
export const REFERRAL_COOKIE='k4k_referral';
export const validReferralCode=code=>typeof code==='string'&&/^[a-z0-9][a-z0-9-]{2,39}$/.test(code);
export function referralsEnabled(env=process.env){return env.K4K_REFERRALS_ENABLED==='true'}
export async function recordReferral(database,userId,code){
 const {data,error}=await database.rpc('k4k_app_record_referral',{p_user:userId,p_code:validReferralCode(code)?code:null});
 if(error||!data)throw Error('REFERRAL_TRACKING_UNAVAILABLE');
 return data.attributed&&validReferralCode(data.code)?data.code:null;
}
