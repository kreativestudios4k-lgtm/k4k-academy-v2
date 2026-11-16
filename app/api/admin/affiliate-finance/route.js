import {affiliateContext,financeEnabled,validCommissionSource,syncAffiliateCommission,listCommissionRows,transitionCommission,commissionError} from '../../../../lib/server/affiliate-finance.mjs';
export const runtime='nodejs';export const maxDuration=60;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){try{const {db}=await affiliateContext(request,{admin:true});if(!financeEnabled())return json({enabled:false,rows:[]});return json({enabled:true,rows:await listCommissionRows(db)})}catch(e){return commissionError(e)}}
export async function POST(request){try{
 const {db}=await affiliateContext(request,{admin:true});if(!financeEnabled())return json({error:'AFFILIATE_FINANCE_DISABLED'},503);
 let body;try{body=await request.json()}catch{throw Error('INVALID_REQUEST')}
 const {action,kind,sourceId,reference,channel,expectedMinor}=body||{};
 if(!['sync','approve','paid'].includes(action)||!validCommissionSource(kind,sourceId)||Object.keys(body).some(k=>!['action','kind','sourceId','reference','channel','expectedMinor'].includes(k)))throw Error('INVALID_REQUEST');
 const row=await syncAffiliateCommission({db,kind,sourceId});
 if(action==='sync')return json({row});
 if(row?.skipped||!Number.isSafeInteger(expectedMinor)||expectedMinor!==row?.commission_minor)throw Error('COMMISSION_REVIEW_REQUIRED');
 const changed=await transitionCommission(db,{kind,sourceId,action,expectedMinor,reference,channel});
 return json({row:changed});
 }catch(e){return commissionError(e)}}
