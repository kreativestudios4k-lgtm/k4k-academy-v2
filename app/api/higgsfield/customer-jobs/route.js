import {createClient} from '@supabase/supabase-js';
import {createHiggsfieldCustomerHttp} from '../../../../lib/server/higgsfield-customer-http.mjs';
import {createHiggsfieldCustomerService} from '../../../../lib/server/higgsfield-customer-service.mjs';
import {createHiggsfieldReferenceTransfer} from '../../../../lib/server/higgsfield-reference-transfer.mjs';
import {createMultimodelLedger} from '../../../../lib/server/multimodel-ledger.mjs';
import {createGenjutsuProvider} from '../../../../lib/server/higgsfield-genjutsu-motion.mjs';
import {createHiggsfieldPlatformApi,higgsfieldPreviewCredential,higgsfieldModelAccess} from '../../../../lib/server/higgsfield-platform-api.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
const options={auth:{persistSession:false,autoRefreshToken:false}};
const url=()=>process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=()=>process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const POST=createHiggsfieldCustomerHttp({
 authenticate:async token=>{
  const {data,error}=await createClient(url(),key(),options).auth.getUser(token);
  return error?null:data?.user;
 },
 createService:token=>{
  const env=process.env;
  const database=createClient(url(),env.SUPABASE_SERVICE_ROLE_KEY,options);
  const userStorage=createClient(url(),key(),{...options,global:{headers:{Authorization:'Bearer '+token}}});
  const credentials=higgsfieldPreviewCredential(env);
  const api=createHiggsfieldPlatformApi({credentials});
  const generation=createGenjutsuProvider({env});
  const provider={ready:higgsfieldModelAccess(env),submit:generation.submit,status:api.status};
  const store={
   async getOwnedJob(userId,jobId){
    const {data,error}=await database.from('k4k_multimodel_jobs').select('*').eq('id',jobId).eq('user_id',userId).eq('provider','higgsfield').maybeSingle();
    if(error)throw Error('JOB_LOOKUP_FAILED');return data;
   },
   async insert(job){const {error}=await database.from('k4k_multimodel_jobs').insert(job);if(error)throw Error('DRAFT_SAVE_FAILED');},
   async listOwned(userId){
    const {data,error}=await database.from('k4k_multimodel_jobs').select('id,status,credits_quoted,created_at').eq('user_id',userId).eq('provider','higgsfield').order('created_at',{ascending:false}).limit(30);
    if(error)throw Error('JOB_LOOKUP_FAILED');return data;
   }
  };
  return createHiggsfieldCustomerService({env,database,store,provider,storage:database.storage,
   ledger:createMultimodelLedger({client:database,enabled:true}),
   transfer:createHiggsfieldReferenceTransfer({storageClient:userStorage,credentials})});
 }
});
