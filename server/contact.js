import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const attempts = new Map();
const json = (status, payload) => Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });

export function createContactHandler({ env = process.env, fetchImpl = fetch, sendMail } = {}) {
 return async function handleContact(request) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const allowedOrigins = (env.CONTACT_ALLOWED_ORIGINS || 'https://www.twms.ai,https://twms.ai').split(',').map(value => value.trim()).filter(Boolean);
  if (!allowedOrigins.includes(request.headers.get('origin'))) return json(403, { ok: false, code: 'forbidden' });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json(415, { ok: false, code: 'invalid_input' });
  if (Number(request.headers.get('content-length')) > 24000) return json(413, { ok: false, code: 'invalid_input' });
  let body;
  try {
   const reader = request.body?.getReader();
   if (!reader) return json(400, { ok: false, code: 'invalid_input' });
   const chunks = []; let length = 0;
   for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 24000) { await reader.cancel(); return json(413, { ok: false, code: 'invalid_input' }); } chunks.push(value); }
   body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return json(400, { ok: false, code: 'invalid_input' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { ok: false, code: 'invalid_input' });
  const clean = (key, max) => typeof body[key] === 'string' && body[key].length <= max ? body[key].trim() : '';
  const name = clean('name', 100), email = clean('email', 254), subject = clean('subject', 160), message = clean('message', 5000), token = clean('token', 2048);
  if (body.website) return json(400, { ok: false, code: 'invalid_input' });
  if (!name || !subject || /[\r\n]/.test(name + subject) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || body.consent !== true || !token) return json(400, { ok: false, code: 'invalid_input' });
  // A test key is never accepted by the deployed production endpoint.
  if (!env.TURNSTILE_SECRET_KEY || !env.SES_FROM_EMAIL || !env.AWS_REGION || /^([123])x0+AA$/.test(env.TURNSTILE_SECRET_KEY)) return json(503, { ok: false, code: 'unavailable' });
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  for (const [key, entry] of attempts) if (now - entry.start > 60000) attempts.delete(key);
  if (!attempts.has(ip) && attempts.size >= 500) return json(429, { ok: false, code: 'rate_limited' });
  const attempt = attempts.get(ip) || { start: now, count: 0 }; attempt.count++; attempts.set(ip, attempt);
  if (attempt.count > 5) return json(429, { ok: false, code: 'rate_limited' });
  try {
   const verify = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token }), signal: AbortSignal.timeout(8000) });
   if (!verify.ok) return json(503, { ok: false, code: 'verification_unavailable' });
   const verification = await verify.json();
   const allowedHosts = allowedOrigins.map(origin => new URL(origin).hostname);
   if (!verification.success || verification.action !== 'contact' || !allowedHosts.includes(verification.hostname)) return json(400, { ok: false, code: 'verification_failed' });
   const input = {
    FromEmailAddress: env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [env.CONTACT_TO_EMAIL || 'info@twms.ai'] },
    ReplyToAddresses: [email],
    Content: { Simple: { Subject: { Data: `[TWMS 문의] ${subject}`, Charset: 'UTF-8' }, Body: { Text: { Data: `이름: ${name}\n답장 주소: ${email}\n문의 주제: ${subject}\n\n${message}`, Charset: 'UTF-8' } } } },
   };
   const result = sendMail ? await sendMail(input) : await new SESv2Client({ region: env.AWS_REGION, maxAttempts: 1, requestHandler: { requestTimeout: 10000, connectionTimeout: 3000 } }).send(new SendEmailCommand(input));
   if (!result?.MessageId) return json(502, { ok: false, code: 'delivery_failed' });
   return json(200, { ok: true });
  } catch { return json(502, { ok: false, code: 'delivery_failed' }); }
 };
}

export default createContactHandler();
