import AcademyAuthForm from '../components/AcademyAuthForm';

export const metadata={
 title:'Sign In — K4K APP',
 description:'Sign in to create AI videos, manage your K4K workspace, and access optional Academy learning.',
 robots:{index:false,follow:false}
};

export default function Login(){
 return <AcademyAuthForm mode="login"/>;
}
