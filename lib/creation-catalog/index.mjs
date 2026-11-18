// K4K's public model discovery catalog, assembled from one declaration per model.
//
// Model appearance does not imply enabled paid API access.
// Entries mirror models actually discovered in the connected Higgsfield catalog on 2026-11-16.
// Do NOT infer Higgsfield REST paths from these model IDs; use official model-specific docs.
//
// To add a model: write models/<id>.mjs with defineModel({...}) and add it to
// the list below. The order here is the order the studio shows them in.

import k4kMotionLite from './models/k4k-motion-lite.mjs';
import k4kMotionPro from './models/k4k-motion-ultra.mjs';
import wanPrime from './models/wan-prime.mjs';
import seedance25 from './models/seedance_2_5.mjs';
import seedance25Flash from './models/seedance_2_5_flash.mjs';
import kling40 from './models/kling4_0.mjs';
import k4kCinema from './models/kling4_hf.mjs';
import kling40Flash from './models/kling_4_0_flash.mjs';
import nanoBanana from './models/nano_banana_2.mjs';
import flux3Image from './models/flux_3_image.mjs';
import gptImage from './models/gpt_image_2_6.mjs';
import klingO1Image from './models/kling_omni_image.mjs';

const DECLARED=[
 k4kMotionLite,
 k4kMotionPro,
 wanPrime,
 seedance25,
 seedance25Flash,
 kling40,
 k4kCinema,
 kling40Flash,
 nanoBanana,
 flux3Image,
 gptImage,
 klingO1Image,
];

// Two models answering to one id would make every lookup by id ambiguous, and
// which one won would depend on import order.
const seen=new Set();
for(const model of DECLARED){
 if(seen.has(model.id))throw Error(`CATALOG_INVALID[${model.id}]: declared more than once`);
 seen.add(model.id);
}

export const CREATION_MODELS=Object.freeze(DECLARED);
