import {redirect} from 'next/navigation';
export const metadata={title:'Image Studio | K4K APP',description:'Create 1K AI images with Nano Banana 2.1 and FLUX 3. Review credits before generating.'};
export default async function ImageStudio({searchParams}){
 const query=await searchParams;
 const model=['nano_banana_2','flux_3_image'].includes(query?.model)?query.model:'nano_banana_2';
 redirect('/k4k-app/create?kind=image&model='+model);
}
