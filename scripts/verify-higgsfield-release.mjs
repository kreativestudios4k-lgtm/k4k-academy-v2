// Production build gate: validate configuration and the production credential
// without uploading customer media, reserving credits, or submitting generation.
import {higgsfieldPublicEnabled,higgsfieldCustomerEnv} from '../lib/server/higgsfield-release-policy.mjs';
import {higgsfieldCustomerCredential} from '../lib/server/higgsfield-platform-api.mjs';
import {createHiggsfieldCredentialProbe} from '../lib/server/higgsfield-credential-probe.mjs';
if(process.env.VERCEL_ENV==='production'&&process.env.K4K_HIGGSFIELD_CUSTOMERS_ENABLED==='true'){
 const env=higgsfieldCustomerEnv(process.env);
 if(!higgsfieldPublicEnabled(env)||env.K4K_HIGGSFIELD_RATE_CARD_APPROVED!=='true'||env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED!=='true')throw Error('HIGGSFIELD_RELEASE_POLICY_INCOMPLETE');
 if(!env.K4K_GENERATION_QUOTE_SECRET||env.K4K_GENERATION_QUOTE_SECRET.length<32)throw Error('HIGGSFIELD_RELEASE_QUOTE_SECRET_MISSING');
 for(const key of ['K4K_GENERATION_MAX_USD','K4K_PROVIDER_DAILY_BUDGET_USD','K4K_PROVIDER_TOTAL_BUDGET_USD','K4K_MAX_ACTIVE_JOBS_PER_USER','K4K_PROVIDER_USD_PER_CREDIT'])if(!(Number(env[key])>0))throw Error('HIGGSFIELD_RELEASE_BUDGET_MISSING');
 const credentials=higgsfieldCustomerCredential(env);
 if(!credentials)throw Error('HIGGSFIELD_PRODUCTION_CREDENTIAL_MISSING');
 const check=await createHiggsfieldCredentialProbe({credentials})();
 if(!check.credentialVerified)throw Error('HIGGSFIELD_PRODUCTION_CREDENTIAL_'+check.state.toUpperCase());
 console.log('Higgsfield production authentication verified; no generation submitted.');
}
