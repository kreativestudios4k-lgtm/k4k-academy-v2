import {headers} from 'next/headers';
import {currencyForCountry,localeForCountry} from '../../../lib/k4k-market.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 const h=await headers();
 const country=(h.get('x-vercel-ip-country')||'').toUpperCase();
 return Response.json({locale:localeForCountry(country),country:country||null,currency:currencyForCountry(country)},{headers:{'Cache-Control':'private, no-store'}});
}
