import catalogue from '../../template-catalogue.json';
import {notFound,redirect} from 'next/navigation';
import {templateStudioDestination} from '../../../../lib/customer-routes.mjs';
export default async function TemplatePage({params}){
 const {id}=await params;
 const template=[...catalogue.topPerforming,...catalogue.trending].find(x=>x.id===id);
 if(!template)notFound();
 redirect(templateStudioDestination(template.id));
}
