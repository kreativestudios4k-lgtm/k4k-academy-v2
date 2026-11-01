import {NextResponse} from "next/server";
import {K4K_ROUTES} from "../../../../../lib/k4k-provider-routing";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({platform:"K4K APP",generationEnabled:false,routes:K4K_ROUTES},{headers:{"Cache-Control":"no-store"}})}
