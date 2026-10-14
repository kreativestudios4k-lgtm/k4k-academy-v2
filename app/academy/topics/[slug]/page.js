import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowUpRight,ArrowLeft,ArrowRight} from 'lucide-react';
import {IdeaHeader,IdeaFooter,IdeaKicker,IdeaLink} from '../../../components/IdeaUI';
import {courseTopics} from '../../../../lib/academy-course';
import {topicStandards} from '../../../../lib/academy-rubrics';
import {syllabus} from '../../../../lib/k4k-idea';
import CopyLessonPrompt from './CopyLessonPrompt';
export function generateStaticParams(){return courseTopics.map(c=>({slug:c.slug}));}
export async function generateMetadata({params}){const {slug}=await params;const topic=courseTopics.find(t=>t.slug===slug);return {title:topic?topic.title+' | K4K Academy':'Academy Course',robots:{index:false,follow:false}}}
export default async function TopicPage({params}){
 const {slug}=await params;
 const t=courseTopics.find(x=>x.slug===slug);if(!t)notFound();
 const standard=topicStandards[slug],mapped=syllabus.find(s=>s.slug===slug);
 const i=courseTopics.findIndex(x=>x.slug===slug),prev=courseTopics[i-1],next=courseTopics[i+1];
 return <main className="ideaPage"><IdeaHeader privateArea/><div className="idea-wrap">
 <header className="ideaModuleHero"><IdeaKicker>ACADEMY / MODULE {t.number} OF 06 · IDEA STAGE {mapped?.stage||'I'}</IdeaKicker><h1>{mapped?.name||t.title}</h1><p>{t.summary}</p><div style={{display:'flex',gap:15,flexWrap:'wrap',alignItems:'center',marginTop:30}}><span className="idea-utility">{t.level} / SELF-PACED</span><span className="idea-utility">A PRACTICAL DELIVERABLE IS REQUIRED</span></div></header>
 <section className="ideaModuleSection"><span className="idea-kicker">01 / THE PURPOSE</span><h2>What you're here to learn.</h2><p>{t.goal}</p><p style={{color:'#d0ff6b',fontSize:19,fontWeight:750}}>{standard.outcome}</p></section>
 <section className="ideaModuleSection"><span className="idea-kicker">02 / THE LEARNING NOTES</span><h2>Understand the decisions.</h2><div className="ideaModuleList">{t.lessons.map((l,i)=><article key={l.title}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{l.title}</h3><p>{l.body}</p><ul>{l.steps.map(s=><li key={s}>{s}</li>)}</ul></div></article>)}</div></section>
 <section className="ideaModuleSection"><span className="idea-kicker">03 / THE PROMPT TOOL</span><h2>Adapt this. Then test it.</h2><p>This is a starting template, not a guaranteed recipe. Replace all placeholders, use source material you have permission to use, and always check the output.</p><div style={{background:'#171813',padding:'clamp(18px,3vw,38px)',border:'1px solid #ffffff42'}}><CopyLessonPrompt prompt={t.prompt}/></div><Link className="idea-utility" href="/prompts" style={{marginTop:23}}>OPEN THE PROMPT LIBRARY <ArrowUpRight size={16}/></Link></section>
 <section className="ideaModuleSection"><span className="idea-kicker">04 / THE PRACTICAL WORK</span><h2>Build your own evidence.</h2><p>{t.assignment}</p><p>{standard.task}</p><div className="ideaModuleColumns"><div className="idea-bullet-card"><h3>FILES TO PRODUCE</h3><ul>{standard.outputs.map(s=><li key={s}>{s}</li>)}</ul></div><div className="idea-bullet-card"><h3>QUALITY GATE</h3><ul>{standard.criteria.map(s=><li key={s}>{s}</li>)}</ul></div></div><div style={{marginTop:23}} className="idea-bullet-card"><h3>COMMON FAILURES</h3><ul>{standard.faults.map(s=><li key={s}>{s}</li>)}</ul></div></section>
 <section className="ideaModuleSection"><span className="idea-kicker">05 / THE HONEST STANDARD</span><h2>The result isn't magic.</h2><p>The goal is to understand which inputs created your outcome, which details are reliable, and what you should correct. External AI tools may require separate credits. Video quality, view counts and income are never guaranteed.</p><div style={{display:'flex',gap:16,flexWrap:'wrap'}}><IdeaLink href="/academy/method" variant="outline">REVISIT THE IDEA METHOD</IdeaLink><IdeaLink href="/academy/gallery" variant="outline">READ A CASE STUDY</IdeaLink></div></section>
 <nav style={{padding:'40px 0 90px',display:'flex',justifyContent:'space-between',gap:18,flexWrap:'wrap',borderTop:'1px solid #ffffff48'}}>{prev?<Link className="idea-utility" href={'/academy/topics/'+prev.slug}><ArrowLeft size={17}/> PREVIOUS: {prev.title}</Link>:<Link href="/academy" className="idea-utility">← ALL TOPICS</Link>}{next?<Link href={'/academy/topics/'+next.slug} className="idea-button">NEXT: {next.title} <ArrowRight size={18}/></Link>:<Link className="idea-button" href="/academy/gallery">PRACTISE WITH THE CASEBOOK <ArrowRight size={17}/></Link>}</nav>
 </div><IdeaFooter privateArea/></main>;
}