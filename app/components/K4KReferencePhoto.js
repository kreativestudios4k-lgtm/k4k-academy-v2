const labels=[
 'K4K masked creator wearing a black technical jacket, with a moving city crowd behind him',
 'Close-up of the masked K4K creator in rectangular glasses and black high-collar jacket',
 'K4K masked creator in a navy football kit holding a ball in a warm locker room'
];
export default function K4KReferencePhoto({index=0,className='',label}){
 const safe=Math.max(0,Math.min(2,Number(index)||0));
 return <div className={'k4k-course-reference '+className} role="img" aria-label={label||labels[safe]} style={{backgroundPosition:[ '0% 50%','50% 50%','100% 50%' ][safe]}}/>;
}
