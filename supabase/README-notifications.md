# Email notification on every bet submission

When someone submits a bet, the app inserts a row into the `pending` table.
A **Database Webhook** fires on that insert and calls the **`notify-bet`
Edge Function**, which sends you an email via **Resend**.

Everything below is a one-time setup. No secrets live in this repo — they're
stored as Supabase function secrets.

---

## 1. Get a Resend API key (free)

1. Sign up at <https://resend.com> **using frankqu7@gmail.com**.
   (In Resend's free tier you can send from `onboarding@resend.dev` to your own
   account email with no domain verification — which is exactly what we need.)
2. Go to **API Keys → Create API Key**, copy it (starts with `re_...`).

## 2. Install the Supabase CLI and link the project

```sh
brew install supabase/tap/supabase     # or see supabase.com/docs/guides/cli
supabase login                          # opens browser
cd /Users/frankqu/kubo
supabase link --project-ref qbnehadwdxawxkggcwrf
```

## 3. Deploy the function

```sh
supabase functions deploy notify-bet --no-verify-jwt
```

(`--no-verify-jwt` lets the database webhook call it; we protect it instead with
a shared secret header set below.)

## 4. Set the secrets

Pick any random string for `HOOK_SECRET` (e.g. `openssl rand -hex 16`).

```sh
supabase secrets set \
  RESEND_API_KEY=re_your_key_here \
  HOOK_SECRET=your_random_string \
  NOTIFY_TO=frankqu7@gmail.com
```

## 5. Create the Database Webhook

In the Supabase dashboard:

1. **Database → Webhooks → Create a new hook**
2. Name: `notify-bet`
3. Table: `public.pending`  ·  Events: **Insert** only
4. Type: **Supabase Edge Functions** → choose `notify-bet`
   (or HTTP Request to `https://qbnehadwdxawxkggcwrf.supabase.co/functions/v1/notify-bet`)
5. **HTTP Headers** → add one header:
   - `x-webhook-secret` = the same `HOOK_SECRET` you set in step 4
6. Save.

## 6. Test

Submit a test bet on the site (or insert a row into `pending`). You should get
an email within a few seconds. If not:

```sh
supabase functions logs notify-bet
```

- `401 unauthorized` → the `x-webhook-secret` header doesn't match `HOOK_SECRET`.
- `email failed ...` → check the Resend key, and that `NOTIFY_TO` is your own
  Resend account email (required while on the `onboarding@resend.dev` sender).

---

### Notes

- To send to addresses **other** than your Resend account email, verify a domain
  in Resend and set `NOTIFY_FROM` to an address on that domain.
- The email fires on **submission** (pending insert), not on admin approval.
