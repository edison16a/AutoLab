# Activating cloud mode

Demo is the default on both services. Adding Supabase keys does not silently activate authentication. Set the explicit mode flags after completing setup.

1. Create a Supabase project. Run `supabase/migrations/001_autolab.sql` in SQL Editor once. It creates all six tables, indexes, private bucket, read policies and an atomic claim function.
2. Enable email/password authentication. Set the Auth Site URL and allowed redirect URL to your frontend URL. Configure email delivery and confirmation for your environment.
3. Gateway environment:

```dotenv
AUTOLAB_MODE=cloud
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
ALLOWED_ORIGINS=https://YOUR_APP.vercel.app
```

4. Web environment, then rebuild/redeploy:

```dotenv
NEXT_PUBLIC_AUTOLAB_MODE=cloud
NEXT_PUBLIC_GATEWAY_URL=wss://YOUR_GATEWAY_HOST
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

5. Set `AUTOLAB_MODE=cloud` on the Pi and restart the agent. It registers with its generated ID/secret and prints a six-digit code valid for ten minutes. Restart the agent to issue a new code if it expires. Already claimed devices authenticate without another claim.
6. Create an account, confirm email if enabled, sign in, click Connect device, and enter the code. The gateway links the device to your account atomically. Rename it if desired.
7. Capture an image, refresh, select the owned device and verify that the image loads from private storage. Try a second account and confirm it cannot access or control the first account's device.
8. For ML, set the worker's `AUTOLAB_MODE=cloud`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AUTOLAB_EMAIL`, and `AUTOLAB_PASSWORD` to the owning account. Protect the environment file. Alternatively, set `AUTOLAB_ACCESS_TOKEN` to a current user access token and replace it when expired. Never use a service-role key in the worker.

## Security boundary

The gateway validates user access tokens with Supabase Auth, checks device ownership before opening client/worker channels, and authenticates Pi connections against a SHA-256 hash of a high-entropy device secret. Tokens are sent in the first WebSocket message, not the URL. Claims are short-lived, one-use and rate-limited. Ownership cannot be changed by direct browser table writes. The claim RPC is available only to the service role. Credential and claim tables have no browser read policies.

Service-role operations happen only after server-side authorization. RLS additionally protects direct browser read access. All cloud mutations route through the gateway. Images are stored at `owner/device/originals/image.jpg`. Signed read URLs expire after an hour; refresh the cloud library to renew them. ML returns metadata, with overlays drawn in the browser rather than storing redundant overlay bitmaps. Image deletion removes originals, any recorded overlay objects, and cascades database analyses.

## Operational notes

- Back up the database and storage and define a retention policy before ongoing use.
- A gateway restart clears connections, but agents reconnect and cloud images remain durable.
- Database and object storage cannot share a transaction. A failed metadata insert attempts to remove the uploaded object. A failed delete can be retried. Monitor storage/database errors for reconciliation.
- Keep a single gateway replica until shared connection routing is implemented.
- Device credentials can be revoked by setting `device_credentials.revoked_at`; reconnect is denied. For immediate disconnection, restart the gateway as part of credential revocation.
- Cloud code is included and tested with ownership-boundary test doubles. Running the migration and exercising a real Supabase project remains a deployment verification step.
