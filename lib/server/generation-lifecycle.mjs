// Explicitly gated generation lifecycle. No provider call unless both pricing and
// provider execution are separately enabled by the trusted server.
export function createGenerationLifecycle({ledger,provider,submissionRecorder,priceCredits,enabled=false,providerEnabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 return Object.freeze({
  async run({userId,jobId,requestKey,tier,input}={}){
   if(!enabled||!providerEnabled)throw Error('GENERATION_DISABLED');
   if(typeof priceCredits!=='function')throw Error('CREDIT_PRICING_UNAVAILABLE');
   if(!ledger?.reserve||!ledger?.finish||!provider?.submit||!submissionRecorder?.record)throw Error('LIFECYCLE_UNAVAILABLE');
   const credits=await priceCredits({tier,input});
   if(!Number.isSafeInteger(credits)||credits<1)throw Error('INVALID_CREDIT_PRICE');
   // The ledger owns idempotency, balance locking, and status transitions.
   const reservation=await ledger.reserve(userId,jobId,requestKey,credits);
   // Only a newly acquired reservation may trigger submission; retries must
   // never generate another billable provider request.
   if(reservation?.newlyReserved!==true)throw Error('RESERVATION_NOT_NEW');
   // A network timeout is ambiguous: the provider may have accepted the job.
   // Never automatically refund or resubmit on an unknown outcome.
   let result;
   try{result=await provider.submit(tier,input)}catch(error){
    // Only an explicit synchronous rejection (the provider never accepted the
    // request) is definite. The caller refunds it; everything else is ambiguous.
    if(error?.definitiveRejection===true)throw Object.assign(Error('PROVIDER_REJECTED'),{httpStatus:error.httpStatus??null});
    throw Error('PROVIDER_SUBMISSION_UNCERTAIN')
   }
   if(typeof result?.request_id!=='string'||!result.request_id)throw Error('PROVIDER_SUBMISSION_UNCERTAIN');
   try{
    await submissionRecorder.record({userId,jobId,providerJobId:result.request_id});
    // A separate verified completion handler must settle credits.
    return {jobId,status:'submitted',providerJobId:result.request_id,creditsReserved:credits};
   }catch(error){
    // Provider accepted work; preserve reservation for reconciliation.
    // Refunding here risks a free paid generation.
    throw Error('PROVIDER_RECORDING_REQUIRES_RECONCILIATION');
   }
  }
 });
}
