// Official company domain stays on this Vercel project. K4K V2 lives in
// a second Next.js zone, mounted *only* under /k4k-app after approved QA.
// Never rewrite /api, /auth, /academy, /pricing or /. Customers and Stripe
// on the legacy company website must retain their original endpoints.
const enabled=process.env.K4K_V2_MULTI_ZONE_ENABLED==="true";
const upstream="https://k4k-v2-no-customer-api-popup.vercel.app";
export default {
 async rewrites(){
  if(!enabled)return [];
  return {
   beforeFiles:[
    {source:"/k4k-app",destination:upstream+"/k4k-app"},
    {source:"/k4k-app/:path*",destination:upstream+"/k4k-app/:path*"}
   ],
   afterFiles:[],
   fallback:[]
  };
 }
};
