import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGenerationSettlementContract} from '../lib/server/generation-settlement-contract.mjs';
const base=`create function k4k_generation_finish() returns jsonb language plpgsql security definer as $$ begin
 if auth.role()<>'service_role' then raise exception 'FORBIDDEN'; end if;
 select * into v_res from public.k4k_generation_reservations for update;
 if v_res.status<>'reserved' then return '{}'::jsonb; end if;
 update public.k4k_generation_reservations set status='settled';
 update public.k4k_generation_reservations set status='refunded';
 end $$;`;
test('current broad UUID filename rule is not sufficient',()=>{
 const sql=base.replace('end $$;',`if p_output_path !~ ('^'||p_user::text||'/[0-9a-f-]{36}\\\\.mp4$') then raise exception 'INVALID_OUTPUT'; end if; end $$;`);
 const result=inspectGenerationSettlementContract(sql);
 assert.equal(result.ready,false);assert.ok(result.issues.includes('OUTPUT_NOT_BOUND_TO_JOB_ID'));
});
test('exact job-owned output path is accepted by audit',()=>{
 const sql=base.replace('end $$;',`if p_output_path <> (p_user::text || '/' || p_job::text || '.mp4') then raise exception 'INVALID_OUTPUT'; end if; end $$;`);
 assert.deepEqual(inspectGenerationSettlementContract(sql),{ready:true,issues:[]});
});
test('missing function fails closed',()=>{
 assert.equal(inspectGenerationSettlementContract(null).ready,false);
});
