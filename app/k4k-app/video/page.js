import {redirect} from 'next/navigation';
export const metadata={title:'Video Studio | K4K APP',description:'Create AI videos with Wan 3, Kling 4.0 and other supported models. Seedance business creation has its own studio.'};
export default async function VideoStudio({searchParams}){
 const query=await searchParams;
 const model=['seedance_2_5','seedance_2_5_flash','kling4_hf','kling4_0','wan-prime'].includes(query?.model)?query.model:'wan-prime';
 redirect('/k4k-app/create?kind=video&model='+model);
}
