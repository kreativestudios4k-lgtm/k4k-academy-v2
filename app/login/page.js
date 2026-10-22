import AcademyAuthForm from '../components/AcademyAuthForm';

export const metadata={
 title:'Log In — K4K Academy',
 description:'Sign in to your K4K Academy account to continue learning.',
 robots:{index:false,follow:false}
};

export default function Login(){
 return <AcademyAuthForm mode="login"/>;
}
