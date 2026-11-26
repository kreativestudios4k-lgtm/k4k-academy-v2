import Link from 'next/link';
import OwnerPlanQATool from '../OwnerPlanQATool';
import {v2PreviewAllowed} from '../../../../lib/k4k-plan-v2.mjs';
export const metadata={title:'K4K owner billing QA | Stripe TEST',robots:{index:false,follow:false}};
export default function OwnerCheckoutQA(){
 if(!v2PreviewAllowed()||process.env.K4K_PLAN_V2_OWNER_TEST_CHECKOUT!=='true')return <main style={{background:'#0c100d',color:'#fff',minHeight:'100vh',padding:45}}>QA test route disabled.</main>;
 return <main style={{minHeight:'100vh',background:'#0c100d',color:'#fff',fontFamily:'Arial,sans-serif',padding:'35px 16px'}}>
  <div style={{maxWidth:1000,margin:'auto'}}>
  <Link href="/k4k-app/plans-preview" style={{color:'#a3ff9b'}}>← Return to pricing preview</Link>
  <OwnerPlanQATool/>
  </div>
 </main>;
}
