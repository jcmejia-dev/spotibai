# Spotibai Native (Expo SDK 58)

Real React Native app in the same repository as the Spotibai Next.js website.

## Test with Expo Go

```powershell
cd apps/mobile
npm install
npx expo start --clear
```

Scan the QR in Expo Go for SDK 58.

## Included in this first milestone

- Native listening-room Home with Spotibai logo, cassette, and interactive mood shortcuts
- Native Discover screen using the existing public Spotibai Audius search API
- Session-only favorites (not yet synced or persisted)
- Offline information screen
- Functional native light/dark themes and accent selection
- Native tab navigation and transition

## Not implemented yet

Neon native sign-in; persistent favorites/playlists; native audio streaming; authorized offline downloads; background and lock-screen controls. No YouTube streaming or download bypass is implemented.

The API endpoint is configured with `EXPO_PUBLIC_SPOTIBAI_API_URL`.
Use a **public HTTPS URL**, not a Neon secret. If you changed the Vercel domain, update this setting.

Native audio and background playback will need `expo-audio` and a development/standalone build. The current app remains Expo Go compatible.
