import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const source=(path)=>readFileSync(join(process.cwd(),path),'utf8');
const accent=/#faf9f6/i;
const sections=[
 ['app/k4k-app/studio.css','public site and mobile feed',/\.k4k-market/],
 ['app/k4k-app/preview.css','account and customer workspace',/\.k4k-light/],
 ['app/k4k-app/template/[id]/template.css','recreate template viewer',/\.k4k-template-workflow/],
 ['app/create/workspace.css','legacy motion workspace',/\.km/],
 ['app/k4k-app/register/register.css','account registration',/\.k4k-register/],
 ['app/k4k-app/landing.css','template-led homepage',/\.k4k-landing/],
];

test('K4K surfaces share the monochrome black / warm white palette',()=>{
 for(const [path,name,scope] of sections){
  const css=source(path);
  assert.match(css,accent,name+' must include warm white');
  assert.doesNotMatch(css,/#c7ff36/i,name+' must not include the old neon accent');
  assert.match(css,scope,name+' must be scoped');
 }
});

test('K4K signup imports its scoped stylesheet',()=>{
 assert.match(source('app/k4k-app/register/page.js'),/import '\.\/register\.css'/);
});

test('dark background and input themes are present in the account workspace',()=>{
 const css=source('app/k4k-app/preview.css');
 assert.match(css,/background:radial-gradient\(/);
 assert.match(css,/\.k4k-light input:not\(/);
 assert.match(css,/\.k4k-light \.k4k-card/);
});

test('K4K homepage is the cinematic launch showcase, with no waitlist',()=>{
 const feed=source('app/k4k-app/MobileTemplateFeed.js');
 const homepage=source('app/k4k-app/page.js');
 assert.match(homepage,/return <SingleFeedHome\/>/);
 const launch=source('app/k4k-app/CinematicLaunch.js');
 assert.doesNotMatch(launch,/\d{2}\.\d{2}\.\d{4}|PLANNED RELEASE|COMING SOON/);
 assert.match(launch,/STARTING FROM ONLY/);
 assert.match(launch,/CHOOSE YOUR PLAN/);
 assert.match(launch,/A PARTIR DE APENAS/);
 assert.match(launch,/DESDE SOLO/);
 assert.match(launch,/id="plans"/);
 assert.match(launch,/planRegistration\(plan\.key\)/);
 assert.match(launch,/paid checkout is not open yet/);
 assert.match(launch,/catalogue\.trending/);
 assert.match(launch,/IntersectionObserver/);
 assert.match(launch,/muted=\{muted\} loop playsInline/);
 assert.doesNotMatch(launch,/href="\/academy"/);
 assert.doesNotMatch(homepage,/import WaitlistLanding|<WaitlistLanding/);
 assert.doesNotMatch(launch,/WaitlistSignup|Motion Pro|Motion Lite/);
 const waitlist=source('app/k4k-app/WaitlistSignup.js');
 assert.match(waitlist,/Get priority access/);
 assert.match(feed,/href:'\/login'/);
 assert.doesNotMatch(feed,/href:'\/academy'/);
 assert.match(waitlist,/consent/);
 assert.match(source('app/k4k-app/explore/page.js'),/MobileTemplateFeed/);
 assert.match(feed,/template-catalogue\.json/);
 assert.match(feed,/kf-scroll/);
 assert.match(feed,/kf-cta/);
 assert.match(feed,/k4k-mark\.svg/);
 assert.match(feed,/CREATE · SWAP · GENERATE/);
 assert.match(source('app/k4k-app/landing.css'),/@media\(max-width:680px\)/);
 assert.match(feed,/onClick=\{\(\)=>setCreateItem\(item\)\}/);
 assert.match(feed,/<TemplateCreateSheet item=\{createItem\}/);
 const sheet=source('app/k4k-app/TemplateCreateSheet.js');
 assert.match(sheet,/role="dialog"/);
 assert.match(sheet,/disabled=\{!complete\|\|!consent\|\|busy\|\|!supported\|\|!mediaReady\}/);
 assert.match(sheet,/\/api\/generation\/jobs\/quote/);
 assert.match(sheet,/\/api\/generation\/jobs\/submit/);
 assert.match(feed,/setTab/);
 assert.match(feed,/\/k4k-app\/creator/);
});
test('template workflow does not trigger AI generation or credits',()=>{
 const template=source('app/k4k-app/template/[id]/TemplateCreator.js');
 assert.match(template,/k4k-template-disabled-generate/);
 assert.match(template,/disabled>\{!requiredReady/);
 assert.match(template,/validateTemplatePreparation/);
 assert.match(template,/MAX_PHOTOS=30/);
});

test('K4K pricing and studio views use dedicated responsive monochrome layouts',()=>{
 const pricing=source('app/k4k-app/credits/page.js');
 const creator=source('app/k4k-app/creator/page.js');
 assert.match(pricing,/k4k-pricing-grid/);
 assert.match(pricing,/checkoutReady/);
 assert.match(pricing,/Published prices include applicable tax/);
 assert.match(pricing,/disabled=\{!currency\|\|checkoutBusy\|\|!checkoutReady\|\|signedIn!==true\}/);
 assert.match(creator,/k4k-creator-layout/);
 assert.match(creator,/extraUrlRegistry/);
});

test('cinematic desktop navigation cannot cover authentication actions',()=>{
 const css=source('app/k4k-app/cinematic-launch.css');
 assert.match(css,/\.kc-header \.kc-desktop-nav\{position:static;inset:auto;width:auto;height:auto/);
 assert.match(css,/\.kc-header-right\{position:relative;z-index:2;min-width:0;pointer-events:auto\}/);
 assert.match(css,/\.kc-auth-dialog:not\(\[open\]\)\{display:none\}/);
 const launch=source('app/k4k-app/CinematicLaunch.js');
 assert.match(launch,/className="kc-login" onClick=\{\(\)=>setAuthOpen\(true\)\}/);
 assert.match(launch,/className="kc-join" href="\/k4k-app\/register\?plan=starter"/);
});

test('the shared monochrome foundation is loaded and applied across customer surfaces',()=>{
 assert.match(source('app/layout.js'),/import '\.\/k4k-monochrome\.css'/);
 const theme=source('app/k4k-monochrome.css');
 for(const token of ['--k4k-bg:#030303','--k4k-panel:#111111','--k4k-fg:#ffffff','--k4k-muted:#b5b5b5'])assert.ok(theme.includes(token),token);
 for(const path of ['app/k4k-app/creator/creator.css','app/k4k-app/credits/credits.css','app/k4k-app/feed.css','app/k4k-app/video-library.css','app/k4k-app/template-sheet.css','app/kx-redesign.css','app/account-simple.css','app/course-v3.css','app/globals.css']){
  const css=source(path);
  assert.match(css,/#faf9f6/i,path+' uses warm white');
  assert.doesNotMatch(css,/#(?:c7ff36|caff39|d9ff3d)\b/i,path+' removes old neon branding');
 }
 assert.match(source('public/k4k-mark.svg'),/fill="#faf9f6"/i);
 assert.match(source('app/k4k-app/template-sheet.css'),/\.kts-sheet\{background:#111111;color:#faf9f6/);
 assert.match(source('app/affiliates/page.js'),/\.k4k-affiliate \.hero\{[^}]*min-height:0/);
});

test('single feed homepage retains K4K backdrop and real navigation',()=>{const s=source('app/k4k-app/SingleFeedHome.js');assert.match(s,/kc-abstract-motion/);assert.match(s,/Use this template/);assert.match(s,/href="\/affiliates"/);assert.match(s,/muted=\{muted\} loop playsInline/);assert.match(s,/TemplateCreateSheet item=\{create\}/);assert.match(s,/\/k4k-app\/credits/);});

test('home uses native vertical snap reels and retains responsive desktop navigation',()=>{
 const home=source('app/k4k-app/SingleFeedHome.js'),css=source('app/k4k-app/single-feed-home.css');
 assert.match(home,/className="ksh-reels-scroll"/);
 assert.match(home,/scrollFeed/);assert.match(home,/videoNodes/);
 assert.match(css,/scroll-snap-type:y mandatory/);assert.match(css,/scroll-snap-align:start/);
 assert.match(home,/ksh-desktop-rail/);assert.doesNotMatch(home,/className="ksh-sound"/);
 assert.doesNotMatch(home,/aria-label=\{paused\?'Play video'/);
});
