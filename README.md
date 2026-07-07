# Book Club Platform

Helps a book club go from "we need a new book" to "here's what we're reading":
suggest books, vote, close the round, and see the winner.

This is the first, minimal slice: create a club → invite a member → suggest a
book → vote → close the round → see the winner as "Currently Reading". Ratings,
reading history, and email notifications are not built yet — see
[Not built yet](#not-built-yet).

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS — one deployable unit
- **PostgreSQL** via [Prisma](https://www.prisma.io/) — works with any Postgres,
  including free-tier [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- **Auth**: [NextAuth (Auth.js)](https://authjs.dev/) v5, email magic link only
  (no passwords, no OAuth app to register)
- **Book metadata**: [Google Books API](https://developers.google.com/books)

## Running it locally

### 1. Get a Postgres database

The fastest free option is [Neon](https://neon.tech): sign up, create a
project, and copy the connection string from the dashboard (`Connect` button —
it looks like `postgresql://user:password@host/db?sslmode=require`).

Any other Postgres works too (local install, Supabase, `npx prisma dev`, etc.)
— you just need a connection string.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — your Postgres connection string from step 1.
- `AUTH_SECRET` — generate one with `npx auth secret`.
- `NEXTAUTH_URL` — leave as `http://localhost:3000` for local dev.
- `GOOGLE_BOOKS_API_KEY` — optional. The app works without it (Google Books
  allows unauthenticated requests at low volume), but a free key raises the
  rate limit. Get one at the
  [Google Cloud Console](https://console.cloud.google.com/apis/library/books.googleapis.com).

### 3. Install dependencies and set up the database

```bash
npm install
npx prisma migrate dev
```

This creates all tables (users, clubs, memberships, rounds, suggestions,
votes, etc.) in your database.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Signing in (dev mode)

There's no real email provider configured for local dev — magic links are
logged to the terminal instead of actually sent. After entering your email on
the sign-in page, check the terminal running `npm run dev` for a block like:

```
----- EMAIL to you@example.com -----
Subject: Your Book Club sign-in link
Sign in by clicking this link:
http://localhost:3000/api/auth/callback/nodemailer?...
----- END EMAIL -----
```

Copy that link into your browser to finish signing in. To send real emails,
replace `sendEmail` in [`src/lib/email.ts`](src/lib/email.ts) with a call to a
provider like [Resend](https://resend.com) or [Postmark](https://postmarkapp.com)
— nothing else needs to change.

## Trying the end-to-end flow

1. Sign in, then create a club from the dashboard.
2. Open the club page — as the organizer, you'll see an invite link. Copy it.
3. Open the invite link in another browser/incognito window, sign in with a
   different email, and join the club.
4. From either account, go to **+ Suggest** and search for a book to add it
   to the current round.
5. Add a couple more suggestions, then cast votes from each account.
6. As the organizer, click **Close voting and pick a winner** — the top-voted
   suggestion becomes the club's "Currently Reading" book, and a new round
   opens automatically for the next pick.

## Project structure

```
prisma/schema.prisma          Data model (User, Club, Membership, Round,
                               Suggestion, Vote, ReadBook, + Auth.js tables)
src/auth.ts                   NextAuth config (magic-link provider, Prisma adapter)
src/lib/db.ts                 Prisma client singleton
src/lib/email.ts              Email sending (stubbed to console in dev)
src/lib/googleBooks.ts        Google Books search
src/lib/auth-helpers.ts       requireUser / requireMembership guards
src/app/page.tsx              Dashboard — list of your clubs
src/app/clubs/new             Create a club
src/app/clubs/[clubId]        Club page — suggestions, voting, close round
src/app/clubs/[clubId]/suggest  Suggest a book (Google Books search)
src/app/invite/[code]         Join a club via invite link
src/app/login                 Magic-link sign-in
```

## Decisions baked into this slice

- **Voting**: one vote per person per round (simple, not ranked-choice).
- **Invites**: open link — anyone with the link can join, no organizer
  approval step.
- **Vote visibility**: hidden from other members until the organizer closes
  the round, to avoid social pressure.
- **Rounds**: a club always has exactly one open round; closing it picks a
  winner, records it as `ReadBook`, and immediately opens the next round.

## Not built yet

These are in the PRD but intentionally left for later slices:

- Ratings/reviews after finishing a book, and reading history display.
- Real email delivery for invite/voting notifications.
- Ranked-choice voting.
- Discussion threads, meeting scheduling, progress tracking, recommendation
  engine, Goodreads/StoryGraph import, multiple simultaneous rounds.
