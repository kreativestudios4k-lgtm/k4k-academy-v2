// Read-only validation of the deployed settlement function definition.
// Use before enabling billable generation; this does not change the database.
export function inspectGenerationSettlementContract(definition){
 if(typeof definition!=='string'||!definition.trim())return {ready:false,issues:['FUNCTION_NOT_FOUND']};
 const compact=definition.toLowerCase().replace(/\s+/g,' ');
 const issues=[];
 if(!compact.includes('security definer'))issues.push('MISSING_SECURITY_DEFINER');
 if(!compact.includes('service_role'))issues.push('MISSING_SERVICE_ROLE_GUARD');
 if(!compact.includes('for update'))issues.push('MISSING_RESERVATION_LOCK');
 if(!compact.includes("v_res.status<>'reserved'"))issues.push('MISSING_IDEMPOTENT_SETTLEMENT');
 // A path regex allowing any UUID-shaped filename in the user's folder
 // cannot prove the output belongs to the job being settled.
 if(!/p_output_path\s*(?:<>|!=|is\s+distinct\s+from)\s*\(?p_user::text\s*\|\|\s*'\/'\s*\|\|\s*p_job::text\s*\|\|\s*'\.mp4'\)?/i.test(definition))issues.push('OUTPUT_NOT_BOUND_TO_JOB_ID');
 if(!compact.includes("status='settled'"))issues.push('MISSING_SETTLED_TRANSITION');
 if(!compact.includes("status='refunded'"))issues.push('MISSING_REFUNDED_TRANSITION');
 return {ready:issues.length===0,issues};
}
