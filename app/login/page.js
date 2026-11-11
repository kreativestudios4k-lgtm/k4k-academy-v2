import AcademyAuthForm from '../components/AcademyAuthForm';

export const metadata={
 title:'Log In — K4K APP',
 description:'Sign in to your K4K APP studio, videos and credits.',
 robots:{index:false,follow:false}
};

export default function Login(){
 return <AcademyAuthForm mode="login"/>;
}
