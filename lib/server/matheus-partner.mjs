// Exclusive founding ambassador. The account UUID is configured server-side only
// after Matheus registers and the owner confirms his identity and agreement.
export const MATHEUS_CODE='matheusborrascah';
export const MATHEUS_TERMS=Object.freeze({title:'Exclusive Brazil Ambassador',monthlyFixedBRL:2000,monthlyCredits:160,commissionBps:1000});
export function matheusUserId(env=process.env){const id=env.K4K_MATHEUS_USER_ID;return typeof id==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)?id.toLowerCase():null}
export function isMatheusAccount(userId,env=process.env){return typeof userId==='string'&&matheusUserId(env)!==null&&userId.toLowerCase()===matheusUserId(env)}
export function isMatheusCode(code){return code===MATHEUS_CODE}
export function validMatheusPartner(row,env=process.env){return Boolean(row&&row.active===true&&isMatheusCode(row.code)&&isMatheusAccount(row.user_id,env)&&row.commission_bps===MATHEUS_TERMS.commissionBps)}
export async function exclusivePartner(db,env=process.env){const id=matheusUserId(env);if(!id)return null;const {data,error}=await db.from('k4k_app_partners').select('user_id,code,active,commission_bps').eq('user_id',id).eq('code',MATHEUS_CODE).maybeSingle();if(error)throw Error('PARTNER_LOOKUP_UNAVAILABLE');return validMatheusPartner(data,env)?data:null}
