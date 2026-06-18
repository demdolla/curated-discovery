# Curated Discovery

A calm, bounded feed for useful scrolling.

This app is separate from Diego's finance dashboard and Second Brain wiki. It is designed to be deployed as its own private GitHub repo and Vercel project.

## What it does

- Tracks Instagram accounts Diego chooses.
- Pulls recent posts through the official Meta API route when credentials are available.
- Turns captions into text-first cards.
- Hides likes, follower counts, comments, and public metrics.
- Ends the feed after a fixed batch.
- Stores saved cards, hidden accounts, read history, and preferences in the browser.

## Local setup

Copy `.env.example` to `.env.local` and fill in:

```bash
META_ACCESS_TOKEN=replace_with_meta_graph_api_token
META_IG_USER_ID=replace_with_instagram_business_or_creator_user_id
META_GRAPH_VERSION=v21.0
```

Run locally through Vercel CLI:

```bash
vercel dev
```

The static UI can open directly in a browser, but API sync requires Vercel dev or a Vercel deployment.

## Deploy

1. Create a private GitHub repo named `curated-discovery`.
2. Push this folder as the repo root.
3. Import the repo into Vercel as `curated-discovery`.
4. Add the same environment variables in Vercel.
5. Deploy from `main`.

## Guardrails

- No direct scraping.
- No posting, liking, commenting, following, unfollowing, or DMs.
- No committed secrets.
- No finance dashboard files are part of this repo.
