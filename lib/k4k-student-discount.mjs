// Matheus's student discount is distinct from his recurring partner commission.
// Stripe coupon MATHEUS10 exists independently in TEST and LIVE, once duration,
// restricted to the four K4K APP subscription products in each mode.
export const STUDENT_CODE='MATHEUS10';
export const STUDENT_DISCOUNT_PERCENT=10;
export function studentCode(value){return typeof value==='string'&&value.trim().toUpperCase()===STUDENT_CODE}
export function studentDiscountRequested(value){return value!==undefined&&value!==null&&value!==''}
export function applyStudentDiscount(form){form.set('discounts[0][coupon]',STUDENT_CODE);return form}
export function discountedMinorUnits(amount){if(!Number.isSafeInteger(amount)||amount<0)throw Error('INVALID_AMOUNT');return amount-Math.round(amount*STUDENT_DISCOUNT_PERCENT/100)}

// Public creator codes resolve to an approved referral record on the server.
export const CREATOR_COUPON='K4KCREATOR10';
export function creatorDiscountReferral(value){if(studentCode(value))return 'matheusborrascah';if(typeof value!=='string')return null;const code=value.trim().toLowerCase();return /^[a-z0-9][a-z0-9-]{1,37}10$/.test(code)?code:null}
export function publicCreatorCode(referral){if(referral==='matheusborrascah')return STUDENT_CODE;return typeof referral==='string'&&creatorDiscountReferral(referral)===referral?referral.toUpperCase():null}
export function applyCreatorDiscount(form,referral){if(!publicCreatorCode(referral))throw Error('INVALID_DISCOUNT_CODE');form.set('discounts[0][coupon]',referral==='matheusborrascah'?STUDENT_CODE:CREATOR_COUPON);return form}

export function creatorCouponsEnabled(env=process.env){return env.K4K_CREATOR_COUPONS_ENABLED==='true'}
export function eligibleCreatorCoupon(referral,env=process.env){return referral==='matheusborrascah'?STUDENT_CODE:creatorCouponsEnabled(env)?publicCreatorCode(referral):null}
