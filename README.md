# Spotibai 🎵

**Your sound, your space.** A responsive personal music player built with Next.js, React, and TypeScript.

## Features

- Premium responsive dark interface and curated discovery demo
- Import local audio (MP3, WAV, M4A, OGG, FLAC; browser codec support varies)
- Play, pause, skip, scrub, shuffle, repeat, adjust volume
- Search demo tracks and local imports
- Liked songs, a personal playlist, and a playback queue
- Audio stays on the device: imports use browser object URLs, **not** uploads to a server

## Get started

```bash
npm install
npm run dev
```

Open http://localhost:3000. For production, import this repository into Vercel and use the standard Next.js build settings.

## Notes

The discovery cards use **fictional track metadata and decorative images**, not real music streams. Import music you own or are authorized to use to start playback. Imported audio is **session-only** and must be imported again after a refresh; only liked track IDs are stored locally. Cloud storage, sign-in, durable playlists, licensing, and mobile apps are future work.

Next phase: authenticated cloud library, durable playlists, metadata extraction, original cover art, licensed online audio integration, and an Expo mobile client.
