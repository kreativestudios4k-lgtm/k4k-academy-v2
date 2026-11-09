import {createGenerationLifecycle} from './generation-lifecycle.mjs';
import {createGenerationSubmissionRecorder} from './generation-submission-record.mjs';
import {createGenerationCompletion} from './generation-completion.mjs';
import {createGenerationOutputVerifier} from './generation-output-verifier.mjs';
import {createGuardedGenerationLedger} from './guarded-generation-ledger.mjs';

// Composition only: never exposed as a public endpoint. All switches default
// off; a trusted server caller must authenticate the provider callback and
// validate the media before calling complete().
export function createGenerationPipeline({database,storage,provider,jobStore,priceCredits,enabled=false,providerEnabled=false,bucket='studio-generations'}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 const ledger=createGuardedGenerationLedger(database,{enabled});
 const submissionRecorder=createGenerationSubmissionRecorder({client:database,enabled});
 const lifecycle=createGenerationLifecycle({ledger,provider,submissionRecorder,priceCredits,enabled,providerEnabled});
 const verifyOutput=createGenerationOutputVerifier({storage,bucket,enabled});
 const completion=createGenerationCompletion({ledger,jobStore,verifyOutput,enabled});
 return Object.freeze({
  submit:args=>lifecycle.run(args),
  // Never call this with untrusted client input. Only a trusted provider
  // reconciler, after authenticating the provider event, may invoke complete.
  complete:args=>completion.settle(args)
 });
}
