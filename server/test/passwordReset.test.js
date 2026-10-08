import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BrevoClient } from '@getbrevo/brevo';
import pool from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { requestPasswordReset, verifyPasswordReset, confirmPasswordReset } from '../src/controllers/passwordResetController.js';
import { authenticate } from '../src/middleware/authMiddleware.js';
import { login } from '../src/controllers/authController.js';

const originalHash = await bcrypt.hash('original-password', 4);
function response() { return { code:200, headers:{}, cookies:[], status(n){this.code=n;return this;},set(k,v){this.headers[k]=v;return this;},json(v){this.data=v;return this;},clearCookie(n){this.cleared=n;},cookie(...args){this.cookies.push(args);} }; }
async function fixture(t) {
 const state={user:{user_id:7,email:'owner@example.com',first_name:'Owner',last_name:'Test',password_hash:originalHash,account_status:'active',role:'user',session_version:0},pending:null,mail:[],writes:0,emailChange:true,failWrite:false,failMail:false};
 const previous=config.brevo.apiKey;config.brevo.apiKey='test-only';t.after(()=>{config.brevo.apiKey=previous;});
 t.mock.getter(BrevoClient.prototype,'transactionalEmails',()=>({async sendTransacEmail(payload){if(state.failMail)throw new Error('Simulated delivery failure');state.mail.push(payload);return {messageId:'test'};}}));
 const query=async(sql,args=[])=>{
  if(sql.startsWith('SELECT user_id, email, password_hash'))return [[state.user].filter(u=>u.email===args[0])];
  if(sql.includes('FROM users WHERE email'))return [[state.user].filter(u=>u.email===args[0])];
  if(sql.includes('FROM users WHERE user_id'))return [[state.user]];
  if(sql.startsWith('INSERT INTO password_reset_verifications')){state.pending={user_id:args[0],request_id:args[1],email:args[2],password_fingerprint:args[3],code_hash:args[4],attempts:0,expires_at:args[5],reset_token_hash:null};return [{}];}
  if(sql.includes('FROM password_reset_verifications r')){assert.match(sql,/FOR UPDATE/);return [[state.pending].filter(p=>p?.request_id===args[0]).map(p=>({...p,current_email:state.user.email,password_hash:state.user.password_hash,account_status:state.user.account_status}))];}
  if(sql.startsWith('UPDATE password_reset_verifications SET attempts')){state.pending.attempts++;return [{}];}
  if(sql.startsWith('UPDATE password_reset_verifications SET reset_token_hash')){Object.assign(state.pending,{reset_token_hash:args[0],code_hash:null,expires_at:args[1]});return [{}];}
  if(sql.startsWith('UPDATE users SET password_hash')){if(state.failWrite)throw new Error('Simulated write failure');assert.match(sql,/session_version=session_version\+1/);state.user.password_hash=args[0];state.user.session_version++;state.writes++;return [{affectedRows:1}];}
  if(sql.startsWith('DELETE FROM password_reset_verifications')){if(state.pending?.request_id===args[0])state.pending=null;return [{}];}
  if(sql.startsWith('DELETE FROM email_change_verifications')){state.emailChange=false;return [{}];}
  throw new Error('Unexpected SQL: '+sql);
 };
 t.mock.method(pool,'query',query);
 let queue=Promise.resolve();
 t.mock.method(pool,'getConnection',async()=>{
  let unlock,snapshot;
  return {async beginTransaction(){const wait=queue;queue=new Promise(r=>{unlock=r;});await wait;snapshot=structuredClone({user:state.user,pending:state.pending,emailChange:state.emailChange,writes:state.writes});},query,async commit(){unlock?.();unlock=null;},async rollback(){if(unlock){Object.assign(state,snapshot);unlock();unlock=null;}},release(){unlock?.();}};
 });
 const request=async(email=state.user.email)=>{const res=response();await requestPasswordReset({body:{email,recipientEmail:'attacker@example.com'}},res);return res;};
 const verify=async(requestId,code)=>{const res=response();await verifyPasswordReset({body:{requestId,code}},res);return res;};
 const confirm=async(requestId,resetToken,extra={})=>{const res=response();await confirmPasswordReset({body:{requestId,resetToken,newPassword:'new-password-123',confirmNewPassword:'new-password-123',...extra}},res);return res;};
 const lastCode=()=>state.mail.at(-1)?.textContent.match(/code is (\d{6})/)[1];
 const verified=async()=>{const r=await request();const v=await verify(r.data.requestId,lastCode());assert.equal(v.code,200);return {requestId:r.data.requestId,resetToken:v.data.resetToken};};
 return {state,request,verify,confirm,lastCode,verified};
}

test('request is generic, sends only to account email and never changes password',async t=>{
 const f=await fixture(t);const known=await f.request(' OWNER@example.com ');const unknown=await f.request('missing@example.com');f.state.user.account_status='suspended';const inactive=await f.request();
 for(const r of [known,unknown,inactive]){assert.equal(r.code,202);assert.equal(r.headers['Cache-Control'],'no-store');assert.match(r.data.requestId,/^[a-f0-9]{64}$/);assert.equal(r.data.code,undefined);assert.equal(r.data.message,known.data.message);}
 assert.equal(f.state.mail.length,1);assert.equal(f.state.mail[0].to[0].email,'owner@example.com');assert.equal(f.state.writes,0);assert.notEqual(f.state.pending.code_hash,f.lastCode());assert.equal(f.state.user.password_hash,originalHash);
});
test('password cannot be changed before verification or with a forged grant',async t=>{
 const f=await fixture(t);const r=await f.request();assert.equal((await f.confirm(r.data.requestId,'a'.repeat(64))).code,400);const v=await f.verify(r.data.requestId,f.lastCode());assert.equal((await f.confirm(r.data.requestId,'b'.repeat(64))).code,400);assert.equal(f.state.writes,0);assert.equal((await f.confirm(r.data.requestId,v.data.resetToken)).code,200);
});
test('five wrong codes exhaust the challenge, including a subsequent correct code',async t=>{
 const f=await fixture(t);const r=await f.request();const good=f.lastCode();const wrong=good==='111111'?'222222':'111111';
 for(let i=0;i<5;i++)assert.equal((await f.verify(r.data.requestId,wrong)).code,400);
 assert.equal(f.state.pending.attempts,5);assert.equal((await f.verify(r.data.requestId,good)).code,400);assert.equal(f.state.writes,0);
});
test('resend replaces old codes and old verified grants',async t=>{
 const f=await fixture(t);const first=await f.request();const code=f.lastCode();const second=await f.request();assert.equal((await f.verify(first.data.requestId,code)).code,400);
 const verified=await f.verify(second.data.requestId,f.lastCode());await f.request();assert.equal((await f.confirm(second.data.requestId,verified.data.resetToken)).code,400);
});
test('expired codes and verified grants cannot change the password',async t=>{
 const f=await fixture(t);const r=await f.request();f.state.pending.expires_at=new Date(Date.now()-1);assert.equal((await f.verify(r.data.requestId,f.lastCode())).code,400);
 const v=await f.verified();f.state.pending.expires_at=new Date(Date.now()-1);assert.equal((await f.confirm(v.requestId,v.resetToken)).code,400);assert.equal(f.state.writes,0);
});
test('verified code is consumed, mismatched passwords are rejected, grant is single-use',async t=>{
 const f=await fixture(t);const v=await f.verified();assert.equal((await f.verify(v.requestId,f.lastCode())).code,400);
 for(const extra of [{confirmNewPassword:'different'},{confirmNewPassword:undefined},{newPassword:'short'},{newPassword:'a'.repeat(73)}])assert.equal((await f.confirm(v.requestId,v.resetToken,extra)).code,400);
 assert.equal(f.state.writes,0);const result=await f.confirm(v.requestId,v.resetToken);assert.equal(result.code,200);assert.equal(result.cleared,'resqtag_token');assert.equal(await bcrypt.compare('new-password-123',f.state.user.password_hash),true);assert.equal(await bcrypt.compare('original-password',f.state.user.password_hash),false);assert.equal(f.state.user.session_version,1);assert.equal(f.state.pending,null);assert.equal(f.state.emailChange,false);assert.equal((await f.confirm(v.requestId,v.resetToken)).code,400);
});
for(const change of ['email','password_hash','account_status'])test(`${change} change invalidates pending recovery`,async t=>{
 const f=await fixture(t);const v=await f.verified();f.state.user[change]=change==='email'?'changed@example.com':change==='account_status'?'suspended':'changed-hash';assert.equal((await f.confirm(v.requestId,v.resetToken)).code,400);assert.equal(f.state.writes,0);
});
test('concurrent reset confirmations allow only one password update',async t=>{
 const f=await fixture(t);const v=await f.verified();const replies=await Promise.all([f.confirm(v.requestId,v.resetToken),f.confirm(v.requestId,v.resetToken)]);assert.deepEqual(replies.map(r=>r.code).sort(),[200,400]);assert.equal(f.state.writes,1);
});
test('database failure rolls back and permits retry with the same valid grant',async t=>{
 const f=await fixture(t);const v=await f.verified();f.state.failWrite=true;t.mock.method(console,'error',()=>{});assert.equal((await f.confirm(v.requestId,v.resetToken)).code,503);assert.equal(f.state.user.password_hash,originalHash);assert.ok(f.state.pending);f.state.failWrite=false;assert.equal((await f.confirm(v.requestId,v.resetToken)).code,200);
});
test('email delivery failure removes the undeliverable code without exposing account existence',async t=>{
 const f=await fixture(t);f.state.failMail=true;t.mock.method(console,'error',()=>{});const res=await f.request();assert.equal(res.code,202);assert.equal(f.state.pending,null);assert.equal(f.state.writes,0);
});
test('reset invalidates legacy and current old sessions; new login works',async t=>{
 const f=await fixture(t);const legacy=jwt.sign({userId:7,role:'user'},config.jwtSecret);const old=jwt.sign({userId:7,role:'user',sessionVersion:0},config.jwtSecret);
 const authenticateToken=async token=>{const res=response();let passed=false;await authenticate({headers:{authorization:`Bearer ${token}`}},res,()=>{passed=true;});return {res,passed};};
 assert.equal((await authenticateToken(legacy)).passed,true);const v=await f.verified();await f.confirm(v.requestId,v.resetToken);
 for(const token of [legacy,old]){const result=await authenticateToken(token);assert.equal(result.res.code,401);assert.equal(result.passed,false);}
 const res=response();await login({body:{email:'owner@example.com',password:'new-password-123'}},res);assert.equal(res.code,200);assert.equal(jwt.verify(res.data.token,config.jwtSecret).sessionVersion,1);assert.equal((await authenticateToken(res.data.token)).passed,true);
});
test('malformed inputs never create or complete recovery',async t=>{
 const f=await fixture(t);for(const email of [null,{},'bad','<script>@example.com'])assert.equal((await f.request(email)).code,400);
 assert.equal((await f.verify('bad','123456')).code,400);assert.equal((await f.verify('a'.repeat(64),123456)).code,400);assert.equal((await f.confirm('bad','bad')).code,400);assert.equal(f.state.writes,0);
});

test('incorrect-code responses do not reveal whether the email has an account',async t=>{
 const f=await fixture(t);const known=await f.request();const unknown=await f.request('missing@example.com');const wrong=f.lastCode()==='111111'?'222222':'111111';
 const a=await f.verify(known.data.requestId,wrong);const b=await f.verify(unknown.data.requestId,wrong);assert.equal(a.code,b.code);assert.deepEqual(a.data,b.data);
});

test('public recovery routes require verification and limit repeated email requests',async t=>{
 const {default:express}=await import('express');const {default:routes}=await import('../src/routes/authRoutes.js');
 const f=await fixture(t);const app=express();app.use(express.json());app.use('/auth',routes);
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>new Promise(r=>server.close(r)));
 const post=(suffix,body)=>fetch(`http://127.0.0.1:${server.address().port}/auth/password-reset/${suffix}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const request=await post('request',{email:'owner@example.com'});assert.equal(request.status,202);const {requestId}=await request.json();
 const verification=await post('verify',{requestId,code:f.lastCode()});assert.equal(verification.status,200);const {resetToken}=await verification.json();
 const reset=await post('confirm',{requestId,resetToken,newPassword:'new-password-123',confirmNewPassword:'new-password-123'});assert.equal(reset.status,200);assert.equal(reset.headers.get('cache-control'),'no-store');
 for(let i=0;i<2;i++)assert.equal((await post('request',{email:'owner@example.com'})).status,202);
 assert.equal((await post('request',{email:'owner@example.com'})).status,429);
});
