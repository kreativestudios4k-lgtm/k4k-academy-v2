// Keep the real customer overview at /dashboard instead of redirecting
// the navigation entry to the profile page. Account's verified wallet,
// generation history, membership state and sign-in handling are reused.
import AccountDashboard from '../account/page';
export const metadata={
 title:'Dashboard | K4K APP',
 description:'Your K4K creative dashboard, verified credits, recent generations and studio shortcuts.',
 robots:{index:false,follow:false}
};
export default function Dashboard(){return <AccountDashboard/>;}
