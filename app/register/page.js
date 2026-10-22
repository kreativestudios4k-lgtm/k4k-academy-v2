import Link from 'next/link';
import {ArrowRight,ShieldCheck,LockKeyhole} from 'lucide-react';
import AcademyAuthForm from '../components/AcademyAuthForm';

export const dynamic='force-dynamic';
export const metadata={
 title:'Create Your Account — K4K Academy',
 description:'Complete your K4K Academy account registration after a successful Stripe checkout.',
 robots:{index:false,follow:false}
};

const checkoutUrl='https://buy.stripe.com/dRmbJ293u6d7egQ8CseEo0n';

export default async function Register({searchParams}){
 const query=await searchParams;
 const sessionId=typeof query?.session_id==='string'?query.session_id:'';
 const fromStripe=query?.checkout==='success'&&/^cs_live_[A-Za-z0-9_]{8,170}$/.test(sessionId);

 // The secure client form independently verifies this signed-webhook receipt.
 // A URL-shaped Stripe session ID alone is never proof of payment.
 if(fromStripe)return <AcademyAuthForm mode="register" sessionId={sessionId}/>;

 return <main className="k4k-auth-page">
  <header className="k4k-auth-header">
   <Link className="k4k-auth-brand" href="/">K4K<span>✳</span><small>ACADEMY</small></Link>
   <Link href="/" className="k4k-auth-back">Home <ArrowRight size={15}/></Link>
  </header>
  <div className="k4k-auth-centre">
   <section className="k4k-auth-card">
    <div className="k4k-auth-icon"><LockKeyhole size={25}/></div>
    <div className="k4k-auth-step">STEP 1 OF 2 · SECURE CHECKOUT</div>
    <h1>Pay first, register next.</h1>
    <p className="k4k-auth-subtitle">New Academy students purchase their membership through Stripe. After payment, we'll send you directly to a simple account form with your checkout email already filled in.</p>
    <a className="k4k-auth-submit" href={checkoutUrl}>Buy K4K Academy <ArrowRight size={18}/></a>
    <p className="k4k-auth-footer">Already purchased? <Link href="/login">Log in</Link></p>
    <p className="k4k-auth-policy">If you've already paid but haven't registered, contact <a href="mailto:hello@kreativestudios4k.com?subject=Paid%20Academy%20account%20setup">Academy support</a> so we can help without charging you again.</p>
   </section>
   <p className="k4k-auth-support"><ShieldCheck size={16}/> Payments are processed securely by Stripe. Course access requires a verified paid membership.</p>
  </div>
 </main>;
}
