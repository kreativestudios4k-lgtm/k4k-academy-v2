import {createClient} from '@supabase/supabase-js';
import {createHiggsfieldPreviewMediaHandler} from '../../../../lib/server/higgsfield-preview-media.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const handler=createHiggsfieldPreviewMediaHandler({createClient});
export const POST=handler;
