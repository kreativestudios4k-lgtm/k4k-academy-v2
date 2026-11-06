import {k4kUpdates} from '../../../lib/k4k-updates';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Member Updates | K4K Academy', robots: {index: false, follow: false}};

export default function UpdatesPage() {
 return (
  <main style={{maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem'}}>
   <h1>Member updates</h1>
   {k4kUpdates.length === 0 ? (
    <p>No updates yet. New lessons, prompts and announcements will appear here.</p>
   ) : (
    k4kUpdates.map((u) => (
     <article key={u.date + u.title} style={{marginTop: '1.5rem'}}>
      <time dateTime={u.date}>{u.date}</time>
      <h2>{u.title}</h2>
      <p>{u.body}</p>
     </article>
    ))
   )}
  </main>
 );
}
