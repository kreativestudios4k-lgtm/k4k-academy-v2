import {redirect} from 'next/navigation';
import AcademyAuthForm from '../components/AcademyAuthForm';

export const dynamic='force-dynamic';
export const metadata={
 title:'Create Your Account — K4K APP',
 description:'Create your K4K APP account.',
 robots:{index:false,follow:false}
};


export default async function Register({searchParams}){
 const query=await searchParams;
 const sessionId=typeof query?.session_id==='string'?query.session_id:'';
 const fromStripe=query?.checkout==='success'&&/^cs_live_[A-Za-z0-9_]{8,170}$/.test(sessionId);

 // The secure client form independently verifies this signed-webhook receipt.
 // A URL-shaped Stripe session ID alone is never proof of payment.
 if(fromStripe)return <AcademyAuthForm mode="register" sessionId={sessionId}/>;

 redirect('/k4k-app/register');
}
