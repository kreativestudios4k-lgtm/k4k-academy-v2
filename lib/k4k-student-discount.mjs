// Matheus's student discount is distinct from his recurring partner commission.
// Stripe coupon MATHEUS10 exists independently in TEST and LIVE, once duration,
// restricted to the four K4K APP subscription products in each mode.
export const STUDENT_CODE='MATHEUS10';
export const STUDENT_DISCOUNT_PERCENT=10;
export function studentCode(value){return typeof value==='string'&&value.trim().toUpperCase()===STUDENT_CODE}
export function studentDiscountRequested(value){return value!==undefined&&value!==null&&value!==''}
export function applyStudentDiscount(form){form.set('discounts[0][coupon]',STUDENT_CODE);return form}
export function discountedMinorUnits(amount){if(!Number.isSafeInteger(amount)||amount<0)throw Error('INVALID_AMOUNT');return amount-Math.round(amount*STUDENT_DISCOUNT_PERCENT/100)}
