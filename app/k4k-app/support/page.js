import Link from 'next/link';
import PreviewShell from '../PreviewShell';

export const metadata={title:'Help & Support — K4K APP',description:'Get help with your K4K APP account, creator projects, Academy access and preview billing.'};
const categories=[
 {title:'Account & sign-in',description:'Problems confirming your email, accessing your account or signing in.',subject:'K4K APP - Account support'},
 {title:'Creator & projects',description:'Missing drafts, reference uploads, video playback or the creator workspace.',subject:'K4K APP - Creator support'},
 {title:'Credits & billing',description:'Test checkout issues, plan questions or a credit balance that looks incorrect.',subject:'K4K APP - Billing support'},
 {title:'Existing Academy access',description:'Keep your current Academy membership and course access working.',subject:'K4K Academy - Access support'}
];
const faqs=[
 ['How do I start?', 'Explore a video template, create a K4K account, then open the Creator Studio. Preview drafts are available, but paid AI generation has not been enabled.'],
 ['Where are my projects?', 'Open Projects in the navigation. Saved generation jobs and drafts appear under your signed-in account. Unsaved browser files do not follow you between devices.'],
 ['How do credits work?', 'The Credits screen shows proposed subscriptions and Stripe test checkout. Credit issuance, deductions and paid AI generation stay disabled until the billing pipeline passes verification.'],
 ['Will my Academy membership disappear?', 'No. Existing Academy access is separate from preview K4K APP pricing. Use the Academy link with your existing account.'],
 ['Can I share a payment problem?', 'Yes. Email our support address with the checkout error code and approximate time. Never send card numbers, passwords, API keys or authentication tokens.']
];
function emailLink(subject){return 'mailto:hello@kreativestudios4k.com?subject='+encodeURIComponent(subject);}
export default function Support(){
 return <PreviewShell active="Account">
 <div className="k4k-workspace-heading"><div><span className="k4k-workspace-eyebrow">K4K APP / CUSTOMER CARE</span><h1>Help & support</h1><p>Find an answer, get back to your project or contact the K4K team directly.</p></div></div>
 <section className="k4k-card"><h2>Contact the K4K team</h2><p>Choose what you need help with. The link opens your email app with the correct subject.</p><div className="k4k-support-grid">{categories.map(item=><a key={item.title} href={emailLink(item.subject)} className="k4k-support-tile"><strong>{item.title} ↗</strong><span>{item.description}</span></a>)}</div><p><strong>Email:</strong> <a href="mailto:hello@kreativestudios4k.com">hello@kreativestudios4k.com</a></p><p><small>Support email is available now. An in-app ticket inbox and response-time guarantees have not been implemented.</small></p></section>
 <section className="k4k-card"><h2>Frequently asked questions</h2><div className="k4k-support-faq">{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
 <section className="k4k-card"><h2>Quick links</h2><div className="k4k-workspace-actions"><Link href="/k4k-app/creator">Creator Studio</Link><Link href="/k4k-app/videos">Projects</Link><Link href="/k4k-app/credits">Credits</Link><Link href="/k4k-app/account">Account</Link><Link href="/academy">Academy</Link></div></section>
 </PreviewShell>;
}
