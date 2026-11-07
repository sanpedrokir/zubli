# Zubli — Product Specification

## Vision
Zubli is a vibrant social discovery platform where people share photos, experiences and
recommendations about anything worth recommending — travel, food, drinks, shopping, tech,
footwear, hobbies, collectibles — and discover what others love.

## Core principle: place is optional
A recommendation is about a **thing**; a **place** is optional context. A sneaker review,
a vinyl-collecting tip or a gadget recommendation needs no location. A café recommendation
usually has one. The data model, forms, feed and search must never force a location.

## Two discovery modes
| Mode | Question it answers | Entry point | Primary axis |
|---|---|---|---|
| **Explore by Destination** | "What's good in/around X?" | Place search, trending destinations | `place` (country → region → city → venue) |
| **Explore by Interest** | "What's good in Y, anywhere?" | Interest grid, tags, trending interests | `interest` (category tree + tags) |

Both modes share the same post cards and filters; they differ in the *first* filter applied.
Destination mode can narrow by interest ("food in Lisbon"); Interest mode can narrow by
place ("sneakers — in Tokyo") but never requires it.

## Users & roles
- **Visitor** – browse public content, no account.
- **Member** – post, react, save, follow, comment.
- **Moderator/Admin** – review reports, remove content (via Edge Functions only).

## MVP features
1. Auth: email magic link + Google/Apple OAuth (Supabase Auth).
2. Profile: avatar, handle, bio, home city (optional).
3. Create recommendation: title, body, 1–10 photos, interest (required), tags, rating 1–5 (optional), place (optional), price band (optional), link (optional).
4. Feed: Following, For You (simple ranking), Latest.
5. Explore by Destination and Explore by Interest.
6. Post detail with comments, like, save.
7. Search: posts, places, interests, people.
8. Saved list (single default list in MVP).
9. Report content / block user.

## Post-MVP
Named collections, follow interests, notifications/push (Capacitor), map view, creator
badges, verified venues, multilingual UI, moderation dashboard.

## Non-goals (now)
Native apps, DMs, ads, e-commerce checkout, live video.

## Success metrics
Posts per active user/week, % of posts without a place (should be healthy — proves the
interest axis works), save rate, D7 retention, discovery-to-save conversion per mode.
