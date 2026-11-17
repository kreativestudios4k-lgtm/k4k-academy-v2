import {redirect} from 'next/navigation';
export const metadata={title:'Video Studio | K4K APP',description:'Create AI videos with Seedance 2.5, Kling 4.0 and Wan 3. Review generation credits before submission.'};
export default async function VideoStudio({searchParams}){
 const query=await searchParams;
 const model=['seedance_2_5','kling4_0','wan-prime'].includes(query?.model)?query.model:'seedance_2_5';
 redirect('/k4k-app/create?kind=video&model='+model);
}
