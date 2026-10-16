# Spotibai Hybrid Android App — Full UI Parity

This Expo SDK 58 build has two modes:

**Original Spotibai (default):** the *actual current web application* displayed inside an Android WebView, including its existing responsive UI, Neon sign-in/guest flow, playlists, favorites, YouTube video player and web offline vault. This is intentionally a **hybrid app**, not a claim that the website was rewritten into native React Native.

**Native audio & offline:** the separate React Native tools built with Expo Audio, AsyncStorage, and FileSystem for Audius music streaming, authorized downloading, local files, and a separate native collection.

These modes **do not sync their favorites or playlists**: the original site uses browser localStorage while native uses AsyncStorage. A common database and native Neon session are needed for true cross-device syncing.

## YouTube error 153
The earlier native app loaded a bare `youtube-nocookie.com/embed` page without a Referer, which YouTube rejects. The native player now uses an HTML iframe wrapper with `baseUrl` (the configured Spotibai domain) and `strict-origin-when-cross-origin`. The original website loads from its normal HTTPS origin and embeds YouTube in a browser-like context. Some videos disallow embedding; users can open them directly on YouTube. YouTube audio cannot be ripped, downloaded, or played as hidden background audio.

## Running
```powershell
cd C:\Users\pc\OneDrive\Documents\Projects\spotibai
git pull --ff-only origin feat/spotibai-music-ui
cd apps/mobile
npm install
npx expo start --clear --port 8082
```

Test both Original Spotibai mode and Native audio & offline mode on device.

If the Vercel domain changed, update the API address under **Native audio & offline > Settings**. Restart/switch modes to load the new domain.

Expo Go is for testing. Native Android background audio/lock screen controls require a properly configured EAS dev/standalone build and real device testing. The hybrid web screen does not become an offline native app merely because it is inside an APK.
