import Workspace from './workspace';
export const metadata={title:'Create video — K4K APP'};
export default async function Create({searchParams}){const q=await searchParams;const n=Number(q.template);return <Workspace template={q.template!==undefined&&Number.isInteger(n)&&n>=0&&n<10?n:null}/>}
