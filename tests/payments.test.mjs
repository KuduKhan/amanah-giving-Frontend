import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature, sameSecret, privatePhone } from '../lib/payment-validation.ts';
import { minorAmount, mpesaPhone } from '../lib/domain.ts';
test('Stripe signatures reject altered payloads, stale events and malformed hashes',()=>{
 const body='{"id":"evt_test"}',secret='test-webhook-secret',time=1700000000;
 const sig=createHmac('sha256',secret).update(`${time}.${body}`).digest('hex');
 assert.equal(verifyStripeSignature(body,`t=${time},v1=${sig}`,secret,time*1000),true);
 assert.equal(verifyStripeSignature(body+' ',`t=${time},v1=${sig}`,secret,time*1000),false);
 assert.equal(verifyStripeSignature(body,`t=${time},v1=${sig}`,secret,(time+301)*1000),false);
 assert.equal(verifyStripeSignature(body,`t=${time},v1=bad`,secret,time*1000),false);
});
test('KES amounts reject fractional, unsafe, negative and below-minimum values',()=>{
 assert.equal(minorAmount(10000),10000);
 for(const n of [99,10001,-10000,Infinity,NaN,100000001])assert.throws(()=>minorAmount(n));
});
test('M-PESA phones normalize Kenya mobile formats and reject other identifiers',()=>{
 for(const n of ['0712345678','+254 712 345 678','712345678'])assert.equal(mpesaPhone(n),'254712345678');
 assert.equal(mpesaPhone('0112345678'),'254112345678');
 for(const n of ['1234','+15551234567','254212345678'])assert.throws(()=>mpesaPhone(n));
 assert.equal(sameSecret('',''),false);assert.equal(sameSecret('valid','invalid'),false);
 assert.notEqual(privatePhone('254712345678','a'),privatePhone('254712345678','b'));
});
