// Explicitly gated generation lifecycle. No provider call unless both pricing and
// provider execution are separately enabled by the trusted server.
export function createGenerationLifecycle({ledger,provider,priceCredits,enabled=false,providerEnabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 return Object.freeze({
  async run({userId,jobId,requestKey,tier,input}={}){
   if(!enabled||!providerEnabled)throw Error('GENERATION_DISABLED');
   if(typeof priceCredits!=='function')throw Error('CREDIT_PRICING_UNAVAILABLE');
   if(!ledger?.reserve||!ledger?.finish||!provider?.submit)throw Error('LIFECYCLE_UNAVAILABLE');
   const credits=await priceCredits({tier,input});
   if(!Number.isSafeInteger(credits)||credits<1)throw Error('INVALID_CREDIT_PRICE');
   // The ledger owns idempotency, balance locking, and status transitions.
   await ledger.reserve(userId,jobId,requestKey,credits);
   try{
    const result=await provider.submit(tier,input);
    // Submission is not completion: async provider jobs remain queued until
    // a separate verified completion handler persists a private output.
    return {jobId,status:'submitted',providerJobId:result.request_id,creditsReserved:credits};
   }catch(error){
    // Fail closed: never swallow a refund failure or mark a paid job complete.
    await ledger.finish(userId,jobId,'failed');
    throw Error('GENERATION_SUBMISSION_FAILED');
   }
  }
 });
}
