# Privacy Policy

**Last updated:** 2026-05-14
**Applies to:** Algorithmia: The Path of Logic — first public release (v1.0.x)

This document describes what data the game collects, how it is stored, and what we do (or do not do) with it. It is intentionally short because the game itself does very little with your data.

## What we collect

**Nothing leaves your browser in v1.0.** The game runs entirely client-side. There are no analytics, no telemetry, no account system, and no server-side logging in this release.

## What is stored locally

The game saves your progress in your browser's **localStorage** under the keys `algorithmia_save_v2` and (for migration purposes only) `algorithmia_save_v1`, plus a one-time UI flag at `desktop_splash_dismissed`. The save contains:

- The region you were last in and your position within it.
- Which puzzles you have completed, with star scores, attempts, hints used, and time spent.
- Which codex entries you have unlocked.
- Story flags (e.g., "you have crossed the beta gate once").
- Your audio and text-speed settings.

The save does **not** contain personal information such as your name, email, IP address, device identifier, or any identifying details. It is keyed only to your browser profile on your device.

## Cookies and tracking

The game does not set HTTP cookies. It uses `localStorage`, which is functionally similar but is purely local — its contents are never sent to a server.

There are **no tracking pixels, analytics scripts, advertising identifiers, or third-party trackers** in this release.

## How to clear your data

- **Erase save inside the game:** From the main menu, choose **NEW GAME** while a save exists. Confirm the overwrite prompt.
- **Erase save outside the game:** Open your browser's site-data settings for the page hosting Algorithmia and clear local storage. This wipes everything the game has ever stored.

## Children

Algorithmia is designed for general audiences and does not require any age verification. Because the game collects no personally identifying information, it does not knowingly process data from anyone under 13. If you are a parent or guardian and have concerns, simply have your child clear the browser's local storage for the page.

## Third-party services

The first public release uses no third-party services that could see your data. Specifically:

- **No analytics provider** (Google Analytics, Plausible, etc.).
- **No error tracker** (Sentry, etc.).
- **No backend or account system.** A future release (v1.1) may add an optional Supabase-backed cloud save. If that ships, this policy will be updated and you will be opted-out by default.

## Changes to this policy

If the policy changes, the "Last updated" date at the top will change and substantive changes will be noted in the project's release notes.

## Contact

If you have privacy questions, open an issue on the project repository or contact the maintainers.
