# Book Club Platform

Helps a book club go from "we need a new book" to "here's what we're reading":
suggest books, vote, close the round, and see the winner.

Five slices are built so far:
1. Create a club → invite a member → suggest a book → rank the suggestions →
   close the round → see the winner as "Currently Reading".
2. Mark the current book as finished → rate it (1–5 stars + optional review) →
   see it in the club's reading history with its average rating.
3. Ranked-choice voting: members rank as many suggestions as they like instead
   of picking just one, and the winner is decided by instant-runoff.
4. Real email delivery via [Resend](https://resend.com): magic-link sign-in
   emails, and a notification to every club member when a round closes with
   the winner.
5. Discussion threads: comment on any suggestion to weigh in before voting.
6. Meeting scheduling: the organizer sets a date/time, optional location, and
   optional video call link for discussing the currently-reading book.
7. Reading progress tracker: any member can share "chapter X of Y" for the
   currently-reading book, visible to the whole club.
8. Goodreads/StoryGraph import: the organizer uploads their library export
   CSV to backfill the club's reading history.
9. "Your club loves" panel on the suggest page: a deterministic
   ratings/genre-based recommendation — no AI, per the PRD's own non-goal.
10. Multiple simultaneous tracks: a club can run more than one pick at once
    (e.g. a fiction track and a nonfiction track), each with its own
    suggestions, ranking, and currently-reading book.

Every PRD nice-to-have is now built.

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
- `RESEND_API_KEY` — optional. Without it, emails are logged to the terminal
  instead of sent (see below). Get a free key from
  [resend.com](https://resend.com) → API Keys.
- `EMAIL_FROM` — sender address. Defaults to Resend's sandbox sender
  (`onboarding@resend.dev`), which only delivers to the email address on your
  own Resend account. Verify a domain in Resend and change this to send to
  anyone else (e.g. your actual book club members).

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

### Signing in

If `RESEND_API_KEY` is set, magic-link and round-closed emails are actually
sent via Resend. Otherwise (e.g. you haven't set up a provider yet), they're
logged to the terminal instead. After entering your email on the sign-in
page, check the terminal running `npm run dev` for a block like:

```
----- EMAIL to you@example.com -----
Subject: Your Book Club sign-in link
Sign in by clicking this link:
http://localhost:3000/api/auth/callback/nodemailer?...
----- END EMAIL -----
```

Copy that link into your browser to finish signing in.

With Resend configured but no verified domain, remember the sandbox sender
only delivers to the email on your own Resend account — sign in with that
address, or verify a domain first if you want to invite real people. To
switch providers entirely, replace `sendEmail` in
[`src/lib/email.ts`](src/lib/email.ts) — nothing else needs to change.

## Trying the end-to-end flow

1. Sign in, then create a club from the dashboard.
2. Open the club page — as the organizer, you'll see an invite link. Copy it.
3. Open the invite link in another browser/incognito window, sign in with a
   different email, and join the club.
4. From either account, go to **+ Suggest** and search for a book to add it
   to the current round.
5. Add a couple more suggestions. Click **Discuss** on one to leave a comment
   from each account, then go back. From each account, rank as many
   suggestions as you like (1st choice, 2nd choice, ...) and click **Save my
   ranking**.
6. As the organizer, click **Close voting and pick a winner** — the
   instant-runoff winner becomes the club's "Currently Reading" book, a new
   round opens automatically for the next pick, and every member gets an
   email with the result (real, if Resend is configured; logged to the
   terminal otherwise).
7. Still as the organizer, click **Mark as finished** on the currently-reading
   book. It moves into **History**, where any member can open it and submit a
   1–5 star rating with an optional short review. The history list shows each
   book's average rating across all members who rated it.
8. From **History**, the organizer can click **Import** and upload a
   Goodreads or StoryGraph library export CSV to backfill past reads —
   finished books get added straight to history, rated under the organizer's
   account.
9. As the organizer, scroll to **Add a track** and create one (e.g.
   "Nonfiction"). The club page now shows two independent sections, each
   with its own suggestions, ranking, and (once you close a round) its own
   "Currently Reading" book — running at the same time as the original
   track.

## Deployment

Live at **https://book-club-platform.vercel.app**, deployed on Vercel with
the GitHub repo ([isabellale7/book-club](https://github.com/isabellale7/book-club))
connected for auto-deploy on push to `main`.

- **Database**: production uses its own Neon project — separate from the
  Neon project used for local dev (see `DATABASE_URL` in your local `.env`
  vs. the `DATABASE_URL` set in Vercel's project env vars). Don't point
  local dev at the production database; that's how test data ends up in a
  real deployment.
- **Env vars**: set directly on Vercel (Project → Settings → Environment
  Variables) — `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (the production
  URL above), `RESEND_API_KEY`, `EMAIL_FROM`. `GOOGLE_BOOKS_API_KEY` is
  optional and unset in production, same as local dev.
- **Prisma client on deploy**: the generated client (`src/generated/prisma`)
  is gitignored, so a fresh clone has nothing to import until `prisma
  generate` runs. `package.json` has a `postinstall` script for this —
  Vercel (and anyone else's `npm install`) triggers it automatically. Don't
  remove that script or deploys will fail with `Module not found: Can't
  resolve '@/generated/prisma/client'`.
- **Migrations**: this repo's migrations are applied straight to the
  production Neon database via `prisma db execute` / `prisma migrate
  resolve` (see the migration files' timestamps) rather than `prisma migrate
  deploy` in a CI step — there's no automated migration-on-deploy step yet.
  Run new migrations against production manually before relying on a schema
  change in the deployed app.

## Project structure

```
prisma/schema.prisma          Data model (User, Club, Membership, Round,
                               Suggestion, Vote, ReadBook, Rating, Comment,
                               Meeting, ReadingProgress, + Auth.js tables)
src/auth.ts                   NextAuth config (magic-link provider, Prisma adapter)
src/lib/db.ts                 Prisma client singleton
src/lib/email.ts              Email sending (Resend if configured, else console)
src/lib/googleBooks.ts        Google Books search
src/lib/instantRunoff.ts      Instant-runoff tally, given ranked ballots
src/lib/csvImport.ts          Goodreads/StoryGraph CSV export parser
src/lib/genreStats.ts         Ranks genres by average club rating
src/lib/auth-helpers.ts       requireUser / requireMembership guards
src/app/page.tsx              Dashboard — list of your clubs
src/app/clubs/new             Create a club
src/app/clubs/[clubId]        Club page — suggestions, voting, close round,
                               mark finished
src/app/clubs/[clubId]/suggest  Suggest a book (Google Books search)
src/app/clubs/[clubId]/suggestions/[suggestionId]  Suggestion detail — discussion
                               thread, comment form
src/app/clubs/[clubId]/history  Reading history with average ratings
src/app/clubs/[clubId]/import  Upload a Goodreads/StoryGraph CSV export
src/app/clubs/[clubId]/books/[readBookId]  Book detail — submit/update your
                               rating and review, see others' reviews
src/app/invite/[code]         Join a club via invite link
src/app/login                 Magic-link sign-in
```

## Decisions baked into this slice

- **Voting**: ranked-choice (instant-runoff). Members rank as many
  suggestions as they like — ranking is optional beyond 1st choice. Closing
  a round repeatedly eliminates the suggestion with the fewest current
  first-choice votes and redistributes its ballots to each voter's next
  remaining choice, until one suggestion has a majority (or only one is
  left). Ties for last place are broken by suggestion creation order — see
  [`src/lib/instantRunoff.ts`](src/lib/instantRunoff.ts).
- **Invites**: open link — anyone with the link can join, no organizer
  approval step.
- **Vote visibility**: hidden from other members until the organizer closes
  the round, to avoid social pressure.
- **Rounds**: a club always has exactly one open round; closing it picks a
  winner, records it as `ReadBook`, and immediately opens the next round.
- **Finishing a book**: only the organizer marks a book as finished (mirrors
  who can close a round). A book only shows up in history, and can only be
  rated, once it's marked finished.
- **Ratings**: one rating per member per book — resubmitting updates your
  existing rating and review rather than adding a duplicate.
- **Email notifications**: sent for magic-link sign-in and when a round
  closes (winner + link to the club). There's no "you've been invited" email
  — invites are a shareable link the organizer sends themselves through
  whatever channel they like, not an email the app sends on their behalf.
  A failed notification email is logged and swallowed rather than failing
  the close-round action — the round still closes even if email delivery
  has a problem.
- **Discussion threads**: scoped to suggestions (discuss before voting), not
  finished books — `Rating.reviewText` already covers after-the-fact
  commentary on a finished book, so a second comment surface there felt
  redundant for now.
- **Meeting scheduling**: one meeting per `ReadBook`, set by the organizer
  only (mirrors who can close a round / mark a book finished). Setting it
  again updates the existing meeting rather than creating another one — there's
  no support for multiple recurring meetings per book.
- **Reading progress**: tracked by chapter, not page (matches the PRD's own
  example), one row per member per book — updating replaces your previous
  progress rather than keeping a history of past updates. Any member can post
  their own progress, not just the organizer.
- **Goodreads/StoryGraph import**: neither service offers a live API (Goodreads
  retired its public API in 2020; StoryGraph never had one), so "import" means
  uploading the CSV library export either service lets you download from
  account settings. Column names differ between the two, so the parser
  matches by keyword (`title`, `author`, `rating` but not `average rating`,
  `date read`) rather than an exact header. Organizer-only, since it writes
  shared club history — imported rows are rated under the importing
  organizer's account, and `ReadBook.imported` flags them so History can
  distinguish "we voted on this" from "backfilled from an export." A row is
  only imported if it looks finished (has a rating or a read date); "want to
  read" shelf rows are skipped. `ReadBook.roundId` had to become optional to
  support these — imported books were never voted on, so there's no `Round`
  to attach them to.
- **Recommendations**: the PRD's §3 non-goals explicitly rule out
  AI-generated recommendations for v1, so this is a deterministic ratings
  aggregation instead — the suggest page shows the club's top genres by
  average rating (pooling every individual rating in that genre, not an
  average of each book's average). Genre comes from the first Google Books
  category on a suggestion (e.g. "Fiction / Science Fiction" → "Fiction") and
  carries over to the `ReadBook` when a round closes. Imported books have no
  genre (neither export format includes one), so they're invisible to this
  panel until someone re-suggests something in the same genre through the
  normal flow.
- **Multiple simultaneous tracks**: implemented as a `trackName` string on
  `Round`/`ReadBook` (default `"General"`) rather than a separate `Track`
  model — a club always has exactly one *open* round per distinct track name
  instead of exactly one open round total. This needed far less schema/query
  churn than a full relational model, since almost every action already
  operated on a specific `roundId` rather than looking one up implicitly —
  only `addSuggestion` needed to start taking `roundId` explicitly instead of
  finding "the" open round. Track names aren't unique at the database level,
  only checked for collisions among currently-open rounds when adding one, so
  a club can reuse a track name (e.g. "Fiction") again later once its round
  closes. The club page hides track-name labels entirely when a club only
  has its default single track, so the common case looks identical to before
  multi-track support existed. Closing a round is blocked with an error if
  that track's current book hasn't been marked finished yet, to prevent two
  unfinished "Currently Reading" books piling up for the same track.
