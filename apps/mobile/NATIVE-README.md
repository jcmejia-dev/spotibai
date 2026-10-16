# Spotibai Android — One main app, original UI

Spotibai now opens **the actual original website** as the sole main UI inside Expo WebView. There is no second, redesigned tabbed app or Original/Native mode switch.

- The **Install App** prompt is hidden in the Android wrapper only (not the public website).
- A small **♫** button is injected next to the existing profile/header actions. It opens the native **Audius background audio** sheet; tapping Done hides the sheet without stopping playback.
- Stream Audius tracks via the original Spotibai API with `expo-audio`, artist-authorized downloads, and imported owned audio.
- Native playlist/music files are device-local and independent of the website's browser-local collection.
- **YouTube background playback is unsupported**: YouTube API policies disallow keeping the embedded player running when the app is minimized or the screen locked.
- Background audio requires a **built Android APK** with the `expo-audio` config plugin and active lock-screen controls. Expo Go is insufficient to validate this functionality.

## Launch in Expo Go for UI testing

```powershell
cd C:\Users\pc\OneDrive\Documents\Projects\spotibai
git pull --ff-only origin feat/spotibai-music-ui
cd apps/mobile
npm install
npx expo start --clear --port 8082
```

## Build APK to test background music

```powershell
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

The build runs via Expo EAS (requires Expo account, project association, Android signing). Install the resulting APK on your phone, then test an Audius song with screen locked. EAS builds can take time and account quotas apply.

If the website is missing, confirm the production domain `spotibai-delta.vercel.app` or adjust `EXPO_PUBLIC_SPOTIBAI_API_URL` before building. The native audio API uses the same domain as the displayed site. No server-side credentials should be placed in `EXPO_PUBLIC_` variables.

**Current limitation**: The app relies on the hosted website and does not deliver full native/offline UI. The original browser's playlists/favorites do not automatically synchronize with Audius downloads. 
