import {headers} from 'next/headers';
export const dynamic='force-dynamic';
export async function GET(){const h=await headers();const country=(h.get('x-vercel-ip-country')||'').toUpperCase();const locale=country==='BR'?'pt':country==='ES'?'es':country==='GB'||country==='UK'?'en':null;return Response.json({locale,country:country||null},{headers:{'Cache-Control':'private, no-store'}})}
