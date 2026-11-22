# Weekend Crust Pizza

A local-first pickup ordering app built with Next.js, React, TypeScript, Supabase, and Stripe Checkout. The menu offers Margherita, Pepperoni, and Mushroom in one 12-inch size. Stripe accepts test card payments only.

## Start the full local stack

Install the app dependencies with `npm install`. You also need Docker Desktop, Supabase CLI 2.108 or newer, and Stripe CLI. On macOS, install the CLIs with `brew install supabase/tap/supabase stripe`.

Set `STRIPE_SECRET_KEY` in `.env.local` to your sandbox secret key beginning with `sk_test_`. If you are setting up a fresh checkout, copy `.env.example` to `.env.local` first.

```sh
./start.sh
```

You can also run `npm run dev:all`.

The command opens Docker Desktop on macOS when needed, starts or reuses local Supabase, connects the Stripe listener with the same test key as the app, and runs Next.js at [localhost:3000](http://localhost:3000). It passes the local Supabase keys and webhook signing secret to Next.js automatically. Open the [local email inbox](http://localhost:54324) for signup and magic links.

Press Ctrl+C to stop Next.js and the Stripe listener. Run `supabase stop` when you are done with the local Supabase services.

## Start services manually

You need Node.js 22.13 or newer, a running Docker engine, Supabase CLI 2.108 or newer, and Stripe CLI with access to a Stripe sandbox.

1. Run `npm install`, then `supabase start` from this directory. Supabase applies the order migration automatically on a fresh local instance.
2. Copy `.env.example` to `.env.local`. Set `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` from `supabase status`. If the CLI shows legacy keys, use the anon key and service_role key respectively. The secret key is used only by server routes.
3. Run `stripe login`, then keep the following listener running in its own terminal. Set `STRIPE_WEBHOOK_SECRET` to the signing secret printed by the listener and `STRIPE_SECRET_KEY` to your sandbox secret key.

   ```sh
   stripe listen --events checkout.session.completed,checkout.session.expired \
     --forward-to http://localhost:3000/api/stripe/webhook
   ```

4. Run `npm run dev` and open [localhost:3000](http://localhost:3000). Use [the local email inbox](http://localhost:54324) to open signup confirmations and magic links. Use localhost consistently so the email links and the browser's checkout cart use the same origin.

For a storefront-only preview, start the app with no environment variables and browse the menu and cart. Account operations require Supabase, and checkout requires Stripe test credentials.

## Staff accounts

Create and confirm the staff account through the same signup form. In the local Supabase Studio SQL editor at [localhost:54323](http://localhost:54323), grant staff access to that email.

```sql
insert into public.staff (user_id)
select id from auth.users
where email = 'staff@example.com' and email_confirmed_at is not null
on conflict do nothing;
```

The staff account can open [the pickup queue](http://localhost:3000/staff). Each paid order moves from Paid to Ready for pickup to Picked up. Customer order details refresh automatically while the tab is visible.

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build`.

- Add pizzas to the cart while signed out. Sign up, confirm the account using the local inbox, and verify the cart survives sign-in. Sign out and verify both password and magic-link sign-in. Reopen a used link to check the expired-link screen.
- Start checkout, cancel, and confirm the cart survives and reopens the same open Checkout Session. Complete checkout using Stripe's `4242 4242 4242 4242` test card, a future expiration date, and any three-digit CVC. The order should appear once in customer history and in the staff queue.
- Mark the order ready and picked up in the staff queue and verify customer status updates. Try opening the order URL and staff queue from a separate customer account. Both should return a not-found page.
- Check the menu, cart, account forms, and staff order controls at narrow and wide viewport sizes.

Edit menu items and the pickup label in [lib/menu.ts](lib/menu.ts). Only Stripe-confirmed test payments enter the staff queue.
