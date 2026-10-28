import Link from 'next/link';
import {IdeaHeader} from '../../components/IdeaUI';
import GeneratorWorkspace from './GeneratorWorkspace';
export const metadata={title:'K4K AI Generator — Preview',robots:{index:false,follow:false}};
export default function GeneratorPage(){return <main className="k4k-classroom"><IdeaHeader privateArea/><div className="k4k-course-shell"><nav style={{padding:'24px 0'}}><Link href="/academy">← Academy</Link></nav><GeneratorWorkspace/></div></main>}