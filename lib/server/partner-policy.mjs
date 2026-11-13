import {validReferralCode} from './referral-tracking.mjs';
export const PARTNER_TERMS=Object.freeze({commissionBps:1000,monthlyFixedBRL:0,monthlyCredits:0});
export const approvedPartner=row=>Boolean(row?.active===true&&row.commission_bps===1000&&validReferralCode(row.code)&&typeof row.user_id==='string');
export async function findPartner(db,code){if(!validReferralCode(code))return null;const {data,error}=await db.from('k4k_app_partners').select('user_id,code,active,commission_bps').eq('code',code).maybeSingle();if(error)throw Error('PARTNER_LOOKUP_UNAVAILABLE');return approvedPartner(data)&&data.code===code?data:null}
