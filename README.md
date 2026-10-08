# Outreach

Private B2B acquisition workspace built with Next.js, Supabase Auth, PostgreSQL,
and Tailwind CSS.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the
   Supabase project settings.
4. Generate a mailbox credential encryption key with
   `openssl rand -base64 32` and set it as `MAILBOX_ENCRYPTION_KEY`. Keep this
   secret stable and private; rotating it requires re-encrypting stored mailbox
   credentials.
5. Apply `supabase/migrations/20261008000000_initial_schema.sql` to the project
   using the Supabase CLI (`supabase db push`) or the SQL editor.
6. Provision internal users from Supabase Authentication. Public sign-up is
   intentionally not enabled.
7. Start the app with `npm run dev`.

The mailbox form supports Gmail, Microsoft 365, and Yahoo app passwords. It
verifies SMTP connectivity before saving and stores the password encrypted
with AES-256-GCM. Mailbox credentials are never returned to the browser.
Outbound campaign scheduling and sending require a separate delivery worker and
provider-specific operational configuration; campaign drafts and their
sequences are persisted here but are not automatically sent.

All workspace tables use row-level security and owner-scoped policies.
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is a public browser key; never put a Supabase
service-role key in a `NEXT_PUBLIC_` variable.
