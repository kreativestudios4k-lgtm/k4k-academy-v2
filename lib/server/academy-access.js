import 'server-only';
import {cache} from 'react';
import {redirect} from 'next/navigation';
import {createClient} from '../supabase/server';

// Defense in depth: the server component independently authorizes paid content.
// Do not depend on proxy routing or client-side visibility.
export const requireAcademyAccess=cache(async()=>{
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)throw Error('Academy temporarily unavailable');
 const client=await createClient();
 const {data:{user}={},error}=await client.auth.getUser();
 if(error||!user||user.is_anonymous)redirect('/login?next=%2Facademy');
 const [admin,membership]=await Promise.all([
  client.from('k4k_admins').select('user_id').eq('user_id',user.id).maybeSingle(),
  client.from('memberships').select('status,current_period_end').eq('user_id',user.id).maybeSingle()
 ]);
 if(admin.error||membership.error)throw Error('Academy access verification unavailable');
 const m=membership.data;
 const active=m&&['active','trialing'].includes(m.status)&&(!m.current_period_end||Date.parse(m.current_period_end)>Date.now());
 if(!admin.data&&!active)redirect('/membership-required');
 return user.id;
});
