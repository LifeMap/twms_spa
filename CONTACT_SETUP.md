# Contact form deployment

The site remains statically generated. `api/contact.js` is a Vercel Node.js
Function. The local Astro development server serves the same handler through
the Vite middleware in `astro.config.mjs`.

## Cloudflare Turnstile

Create a Managed widget for `www.twms.ai` (also add `twms.ai` if necessary).
Set its site key in `PUBLIC_TURNSTILE_SITE_KEY` and secret in
`TURNSTILE_SECRET_KEY` in Vercel Project Settings → Environment Variables.
The server requires action `contact` and an allowed hostname in the verified
response. Test keys cannot send email through this endpoint.

Local development without a public key uses Cloudflare's official visible test
widget. This previews the verification UI only; it does not bypass server-side
validation or pretend that a message was delivered.

## AWS SES

Set these server-only environment variables in Vercel:

- `AWS_REGION`: the SES region containing the verified sender, e.g. `ap-northeast-2`.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: an IAM identity restricted to
  `ses:SendEmail` for the chosen verified identity. Do not use the `PUBLIC_` prefix.
- `SES_FROM_EMAIL`: an address on an SES-verified domain. This need not equal
  the recipient; an existing verified `twms.in` sender can mail `info@twms.ai`.
- `CONTACT_TO_EMAIL`: `info@twms.ai` (the default).
- `CONTACT_ALLOWED_ORIGINS`: `https://www.twms.ai,https://twms.ai`.

## Vercel variable types

Select **Production** for the environment and use these types:

| Variable | Type | Value |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Config | Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile secret key |
| `AWS_ACCESS_KEY_ID` | Secret | SES sending IAM access key ID |
| `AWS_SECRET_ACCESS_KEY` | Secret | Corresponding secret access key |
| `AWS_REGION` | Config | Region of the verified SES sender |
| `SES_FROM_EMAIL` | Config | SES-verified sender, e.g. `info@twms.ai` |
| `CONTACT_TO_EMAIL` | Config | `info@twms.ai` |
| `CONTACT_ALLOWED_ORIGINS` | Config | `https://www.twms.ai,https://twms.ai` |

Config and Secret values are both available to application code. Config stays
readable in the dashboard; Secret cannot be read back after saving. The public
Turnstile site key is intentionally included in client HTML. Never prefix a
secret variable with `PUBLIC_`: choosing Secret does not prevent a framework
from embedding a publicly prefixed variable in the browser bundle.

## Website domain

In Vercel Project Settings → Domains, add `www.twms.ai` as the production
domain and `twms.ai` with a redirect to `www.twms.ai`. Configure the DNS values
shown by Vercel at the DNS provider for `twms.ai`. If using Cloudflare, use
DNS-only records for this Vercel configuration.

Astro canonical URLs, Open Graph URLs, structured data, sitemap and robots.txt
use `https://www.twms.ai`. Existing Autogram and blog links still use their
current `twms.in` service domains until their new domains are confirmed.

SES identities and sandbox status are region-specific. In the SES sandbox, the
recipient must also be verified. Outside the sandbox, only the sender needs SES
verification. The visitor's address is used as Reply-To, never as From or To.

Rebuild/redeploy after setting variables: the public widget key is embedded at
build time. Preview domains must be explicitly registered in Turnstile and
`CONTACT_ALLOWED_ORIGINS` if contact submissions are enabled there.

For local integration with real keys, copy `.env.example` to `.env` and enter
values there. Local AWS credentials may also come from the AWS CLI profile.
Never commit `.env` or AWS credentials. The local API allows localhost and
127.0.0.1 on port 4321; production only allows the configured HTTPS origins.

## Validation

Run `node --test tests/contact.test.js` and `npm run build`. Open a project
inquiry button: its subject should be prefilled. Complete the widget, submit,
and check the receiving mailbox. Success means SES accepted the message, not
proof of inbox delivery. Also test expired verification and failed sending.

Controls include bounded request size, field validation, a hidden honeypot,
required consent, same-origin checks, server-side Turnstile validation, and an
in-memory IP throttle. The throttle is per server instance; Turnstile is the
primary protection across instances. No message or credentials are logged.
