// Proposed Brazilian Black Friday launch offer, supplied by the K4K owner on 19 November 2026.
// PRESENTATION ONLY. These prices and credits are NOT wired to Stripe or subscription entitlements.
// Do not activate without new test prices, atomic credit checks, funding limits and approval.
export const BR_BLACK_FRIDAY_OFFER = Object.freeze({
  currency: 'BRL',
  audience: 'Eligible new customers in Brazil',
  startDate: '2026-11-27',
  endDate: '2026-11-30',
  discountedMonths: 3,
  saverModel: 'Kling Motion Saver',
  estimatedCreditsPer30SecondSaver: 140,
  checkoutReady: false,
  plans: Object.freeze([
    Object.freeze({id:'starter',name:'Starter',regularMinor:11990,promoMinor:7990,monthlyCredits:420,estimatedSaverVideos:3,description:'Start creating viral content'}),
    Object.freeze({id:'creator',name:'Creator',regularMinor:23990,promoMinor:15990,monthlyCredits:840,estimatedSaverVideos:6,description:'For creators publishing every week'}),
    Object.freeze({id:'pro',name:'Pro',regularMinor:44990,promoMinor:29990,monthlyCredits:1680,estimatedSaverVideos:12,description:'For high-volume creators'}),
    Object.freeze({id:'studio',name:'Studio',regularMinor:89990,promoMinor:59990,monthlyCredits:3360,estimatedSaverVideos:24,description:'For production teams and agencies'}),
  ])
});
export const formatBlackFridayBRL=minor=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(minor/100);
