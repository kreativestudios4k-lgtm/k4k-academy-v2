import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowRight,BookOpen,Clock3,CheckCircle2,Clapperboard,Lightbulb} from 'lucide-react';
import {courseTopics} from '../../../../lib/academy-course';

export function generateStaticParams(){return courseTopics.map(({slug})=>({slug}));}
export async function generateMetadata({params}){
 const {slug}=await params;
 const topic=courseTopics.find(item=>item.slug===slug);
 return {title:topic?`${topic.title} | K4K Academy`:'K4K Academy Learning Topics',robots:{index:false,follow:false}};
}
export default async function CourseTopicPage({params}){
 const {slug}=await params;
 const topic=courseTopics.find(item=>item.slug===slug);
 if(!topic)notFound();
 const index=courseTopics.findIndex(item=>item.slug===slug);
 const prev=index>0?courseTopics[index-1]:null;
 const next=index<courseTopics.length-1?courseTopics[index+1]:null;
 return <main className="k4kLessonPage">
   <div className="k4kLessonNav"><Link href="/academy#course-topics"><ArrowLeft size={17}/> All course topics</Link><Link href="/prompts">Prompt Vault <ArrowRight size={16}/></Link></div>
   <section className="k4kLessonHero">
     <img src={topic.image} alt={topic.imageAlt} width="1920" height="1080"/>
     <div className="k4kLessonHeroCopy"><span className="academyKicker">K4K ACADEMY · TOPIC {topic.number} · {topic.eyebrow}</span><h1>{topic.title}</h1><p>{topic.summary}</p>
       <div className="k4kLessonMeta"><span><BookOpen size={16}/>{topic.level}</span><span><Clock3 size={16}/>{topic.duration}</span></div>
     </div>
   </section>
   <div className="k4kLessonContents">
     <div className="k4kLessonMain">
       <section className="k4kLessonSection"><span className="academyKicker">YOUR LEARNING OBJECTIVE</span><h2>What you will learn</h2><p>{topic.goal}</p></section>
       <section className="k4kLessonSection"><span className="academyKicker">GUIDED STUDY NOTES</span><h2>Learn the method, step by step</h2>
         <div className="k4kLessonBlocks">{topic.lessons.map((lesson,i)=><article className="k4kLessonBlock" key={lesson.title}><div className="k4kLessonNumber">{String(i+1).padStart(2,'0')}</div><div><h3>{lesson.title}</h3><p>{lesson.body}</p><ul>{lesson.steps.map(step=><li key={step}>{step}</li>)}</ul></div></article>)}</div>
       </section>
       <section className="k4kLessonSection k4kLessonPrompt"><span className="academyKicker">STARTER RESOURCE</span><h2>Ready-to-use practice prompt</h2><p>Copy and adapt this to your own authorised content and chosen AI tool. Review each output instead of assuming one generation will be perfect.</p><pre>{topic.prompt}</pre><Link href="/prompts">Explore the full Prompt Vault <ArrowRight size={16}/></Link></section>
       <section className="k4kLessonSection k4kLessonAssignment"><span className="academyKicker">HANDS-ON PROJECT</span><h2>Build something yourself</h2><p>{topic.assignment}</p><h3>What to prepare</h3><ul>{topic.deliverables.map(d=><li key={d}>{d}</li>)}</ul></section>
       <div className="k4kLessonNavigation">
         {prev?<Link href={`/academy/topics/${prev.slug}`}><ArrowLeft size={16}/><span><small>PREVIOUS TOPIC</small><strong>{prev.title}</strong></span></Link>:<Link href="/academy#course-topics"><ArrowLeft size={16}/><span><small>BACK TO</small><strong>All Topics</strong></span></Link>}
         {next?<Link href={`/academy/topics/${next.slug}`}><span><small>NEXT TOPIC</small><strong>{next.title}</strong></span><ArrowRight size={16}/></Link>:<Link href="/academy/trends"><span><small>KEEP LEARNING</small><strong>Trend of the Week</strong></span><ArrowRight size={16}/></Link>}
       </div>
     </div>
     <aside className="k4kLessonAside">
       <div className="k4kLessonAsideCard"><span className="academyKicker">QUALITY CHECK</span><h3>Before you finish</h3>{topic.checklist.map(item=><div key={item}><CheckCircle2 size={17}/><span>{item}</span></div>)}</div>
       <div className="k4kLessonAsideCard"><Lightbulb size={22}/><h3>K4K Creator Tip</h3><p>Save your reference assets, prompt and final result together so you can reproduce or improve your workflow later.</p></div>
       {topic.related?<Link className="k4kLessonRelated" href={topic.related.href}><Clapperboard size={18}/>{topic.related.label}<ArrowRight size={15}/></Link>:<Link className="k4kLessonRelated" href="/academy/workflows/viral-character-swap"><Clapperboard size={18}/>Explore the K4K video workshop<ArrowRight size={15}/></Link>}
     </aside>
   </div>
 </main>;
}
