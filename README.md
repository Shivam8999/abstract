# Abstract — Bookmark Manager

A personal bookmark manager built with **Next.js 14** (App Router), **Supabase** (PostgreSQL + Auth + Realtime), and **Google OAuth**. Users can save, view, and delete bookmarks — all changes reflect in real time without page refresh.

## 🌐 Deployment

**Live URL:** `<YOUR_DEPLOYMENT_URL>`

---

## Tech Stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Frontend       | Next.js 14 (App Router), React 18 |
| Styling        | Vanilla CSS, Inter (Google Fonts) |
| Icons          | Lucide React                      |
| Auth           | Supabase Auth (Google OAuth)      |
| Database       | Supabase (PostgreSQL)             |
| Realtime       | Supabase Realtime (Postgres Changes) |

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Supabase** project ([supabase.com](https://supabase.com))
- **Google OAuth** credentials ([Google Cloud Console](https://console.cloud.google.com))

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <REPO_URL>
cd abstract
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

You can find these values in your Supabase dashboard under **Settings → API**.

### 4. Configure Google OAuth in Supabase

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Enable the Google provider
3. Add your **Client ID** and **Client Secret** from Google Cloud Console
4. Set the redirect URL to:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
5. In Google Cloud Console, add the same redirect URL to your OAuth 2.0 credentials under **Authorized redirect URIs**

### 5. Create Database Tables and Policies and OAUTH Client
- Google OAUTH Client
- Database Tables
- Database Policies
- Realtime Publication

### 6. Enable Realtime Replica Identity

Go to **Supabase Dashboard → Database → Tables → bookmarks** and set the **Replica Identity** to **Full** (instead of the default). This is required for `DELETE` events to be emitted via Realtime.

### 7. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/
│   ├── auth/callback/route.ts   # OAuth callback handler
│   ├── bookmarks/page.tsx       # Bookmarks page (server component)
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Login page
├── components/
│   └── BookmarkList.tsx         # Main bookmark UI (client component, realtime)
├── lib/
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       └── server.ts            # Server Supabase client
├── middleware.ts                # Auth guard + token refresh
supabase/
└── migration.sql                # Database schema + RLS policies
```

---

## Issues Faced & Resolutions

### Issue 1: RLS Policy Type — Restrictive vs Permissive

**Problem:** After setting up Row Level Security, I was unable to insert bookmarks. Every insert returned an RLS violation error, even though the policy logic looked correct.

**Root Cause:** I had accidentally created the RLS policies as **restrictive** instead of **permissive**. In PostgreSQL, restrictive policies deny access unless *all* restrictive policies pass, whereas permissive policies allow access if *any* permissive policy passes. Since the default behavior for `CREATE POLICY` is permissive, the issue arose from explicitly setting the policy type to restrictive in the Supabase dashboard.

**Resolution:** I reviewed the [Supabase RLS documentation](https://supabase.com/docs/guides/auth/row-level-security) and understood the difference between permissive and restrictive policies. I then recreated the policies as **permissive** (the default type), which correctly allowed authenticated users to insert and manage their own bookmarks.

---

### Issue 2: Supabase Realtime Not Emitting DELETE Events

**Problem:** After deleting a bookmark, the Realtime subscription did not receive the `DELETE` event. Inserts worked fine in realtime, but deletes were not being broadcast to the client.

**Root Cause:** The `bookmarks` table was using the **default** replica identity, which only sends the primary key in the `old` record for `DELETE` events. However, the Realtime filter (`filter: user_id=eq.<id>`) requires the `user_id` column to be present in the payload to match the subscription filter. With the default replica identity, `user_id` was not included in delete payloads, so the event was silently filtered out.

**Resolution:** I changed the **Replica Identity** of the `bookmarks` table to **Full** via the Supabase Dashboard (Database → Tables → bookmarks → Replica Identity → Full). With full replica identity, all column values are included in the `old` record for `DELETE` events, allowing the Realtime filter to correctly match and deliver the event to the subscribed client.

``` 
alter table public.bookmarks
replica identity full;

 ```
---

## License

This project is for educational/assignment purposes.
