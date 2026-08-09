# Security

## What this application is

Stockroom is a static site. Every route prerenders to HTML at build time and is served
from a CDN. There is no server at runtime, no database, no API, no session, and no user
account. The whole dataset is a seeded sample warehouse that lives in the visitor's own
`localStorage`.

That shape removes most of the attack surface a web application normally has, and it
determines everything below.

## What is not here

Worth stating plainly, because the absence is the control:

- **No authentication or authorisation.** There is nothing to log in to, and no data that
  belongs to one person rather than another.
- **No server-side code paths.** No API routes, no server actions, no middleware. Nothing
  accepts a request body.
- **No database, no ORM, no query construction.** SQL injection has nothing to inject into.
- **No third-party requests at runtime.** No analytics, no tag managers, no fonts from a
  CDN, no error reporting. The page talks to its own origin and nothing else.
- **No cookies, no tokens, no session storage.**
- **No file uploads.**
- **No personal data.** The seeded supplier contacts are `.example` addresses, which are
  reserved by RFC 2606 and cannot receive mail. The operator names are invented.
- **No secrets in the repository.** The one environment variable, `NEXT_PUBLIC_SITE_URL`,
  is a public origin and is inlined into the client bundle by design.

## Headers

Set in `next.config.ts` on every response.

| Header | Value | What it is for |
|---|---|---|
| `Content-Security-Policy` | see below | Refuses anything loaded from elsewhere |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | No downgrade to HTTP |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing |
| `X-Frame-Options` | `DENY` | No framing, alongside `frame-ancestors` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | No path leakage off-origin |
| `Permissions-Policy` | camera, microphone, geolocation, payment all `()` | Capabilities the app never uses |

`X-Powered-By` is switched off.

### The policy

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; form-action 'self';
frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests
```

`connect-src 'self'` is the important one here: the app has no reason to reach any other
origin, so exfiltration through `fetch` is refused rather than merely unused.

**`'unsafe-inline'` on `script-src` is a known and deliberate weakening.** Next inlines its
hydration bootstrap, and the alternative is a per-request nonce, which needs middleware,
which takes every page off static rendering. On a site with no authentication, no cookies
and no user-supplied content rendered as markup, the injection vector that
`'unsafe-inline'` protects against does not exist here. If this application ever gains a
server, a login, or any content one visitor can put in front of another, that trade stops
being acceptable and the nonce is the correct answer.

## Data handling

Everything a visitor changes stays in their browser under the key
`stockroom:snapshot:v1`. It is never transmitted anywhere.

Two consequences worth being explicit about:

- **`localStorage` is not encrypted and is not private on a shared machine.** Anyone with
  access to the browser profile can read it. Nothing sensitive belongs in this app, and
  the sample data is not sensitive.
- **`localStorage` is readable by any script on the origin.** Since the origin serves only
  this application and loads nothing from anywhere else, that is the same trust boundary
  as the application itself.

The Reset button clears the stored snapshot and restores the sample warehouse.

## Input handling

There is no server to validate against, so validation is a correctness control rather than
a security one. It still runs:

- Part names, SKUs, bins, quantities and costs are checked before a save.
- SKUs must be unique; bins must match `^[A-F]-\d{2}-\d{2}$`.
- A stored snapshot is validated row by row on read. Anything failing falls back to a
  fresh seed rather than reaching the screens.
- URL query parameters are validated. An unknown `?status=` falls back to showing
  everything rather than putting the table into a state that does not exist.

Nothing is rendered with `dangerouslySetInnerHTML`, and there is no `eval`, no `new
Function`, and no dynamic script construction anywhere in the source. React escapes all
interpolated text, so a part name is displayed rather than executed.

## Dependencies

Eight production packages: Next, React, React DOM, Radix, Framer Motion, Lucide, clsx,
tailwind-merge. Each was chosen because writing it would have been worse, and the
[architecture notes](ARCHITECTURE.md) record what was deliberately not installed.

- `npm audit --omit=dev` reports 0 vulnerabilities at the time of writing.
- Versions are pinned by `package-lock.json`, which is committed.
- CI runs on every push and pull request.

Adding a dependency to this project is a security decision, not only a size one.

## Reporting a vulnerability

Report privately through GitHub, at
<https://github.com/dooddles07/Inventory-Management-System/security/advisories/new>.

Please do not open a public issue for anything exploitable.

Include what you did, what happened, and what you expected. A proof of concept helps.
Expect an acknowledgement within a few days; this is a portfolio project maintained by one
person, not a product with an on-call rotation, and saying so is more useful than promising
a response time that will not be met.

## Scope

**In scope:** anything served from the deployed origin - the headers, the content security
policy, the client bundle, the stored snapshot handling.

**Out of scope:** findings that depend on already having control of the visitor's machine
or browser profile; the absence of authentication, which is a deliberate property of a
demo with no private data; `'unsafe-inline'` on `script-src`, which is documented above
with its reasoning; and anything about the sample data, which is invented.
