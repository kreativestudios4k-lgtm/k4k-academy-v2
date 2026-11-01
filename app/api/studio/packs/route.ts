import {NextResponse} from "next/server";
import {STUDIO_PACKS} from "../../../../lib/studio-packs";
export const dynamic="force-dynamic";
export async function GET(){
 return NextResponse.json({currency:"gbp",packs:STUDIO_PACKS,checkoutEnabled:false,mode:"preview",note:"Paid checkout is disabled until test-mode Stripe, signed webhook and credit ledger are verified."},{headers:{"Cache-Control":"no-store"}});
}
