import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {k4kProfileId,profileName,profileInitials} from '../lib/k4k-profile-id.mjs';
test('profile IDs are stable, complete, unique and never derived from an email',()=>{
 const a='11111111-2222-3333-4444-555555555555',b='11111111-2222-3333-4444-555555555556';
 assert.equal(k4kProfileId(a),'K4K-'+a.toUpperCase());assert.notEqual(k4kProfileId(a),k4kProfileId(b));assert.equal(k4kProfileId(a.toUpperCase()),k4kProfileId(a));assert.equal(k4kProfileId('person@example.com'),null);
 assert.equal(profileName({user_metadata:{full_name:'Jane Creator'}}),'Jane Creator');assert.equal(profileInitials({user_metadata:{full_name:'Jane Creator'}}),'JC');
});
test('auth controls use verified identity, immediate sign-out and safe return destinations',()=>{
 const src=p=>readFileSync(p,'utf8');const hook=src('app/k4k-app/useVerifiedAccount.js');
 assert.match(hook,/auth.getUser\(\)/);assert.match(hook,/event==='SIGNED_OUT'/);assert.match(hook,/signOut\(\{scope:'local'\}\)/);assert.match(hook,/window.location.replace\('\/'\)/);
 assert.match(src('app/k4k-app/CinematicLaunch.js'),/AccountMenu user=\{user\}/);
 assert.match(src('app/k4k-app/account/page.js'),/k4kProfileId\(user\?\.id\)/);
 assert.match(src('app/components/AcademyAuthForm.js'),/studioDestination\(requested\)/);
 assert.match(src('app/k4k-app/AccountStatus.js'),/studioDestination\(window.location.pathname\+window.location.search\)/);
});
