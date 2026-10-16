# Spotibai mobile parity (Expo 58)
This app is a native React Native music app separate from the Next.js website.

## Install and run
```powershell
cd apps/mobile
npm install
npx expo start --clear
```
Expo Go SDK 58 supports testing UI, Audius native audio, file selection and WebView.

## Native features
- YouTube Data API music search, 50-result pagination, artist-based Up Next queue
- Official YouTube embedded visible video player (not background audio or offline downloading)
- Audius streaming with expo-audio playback controls, seek, next/previous, repeat
- Mixed-source favorites and mixtapes (create, rename, remove, delete)
- Persistent native local library, preferences and recent searches using AsyncStorage
- Local owned audio import; artist-authorized Audius download and offline playback
- Dark/light themes, multiple accent colors, subtle screen transitions
- Full original website accessible from Settings for Neon sign-in and web-only collection

## Important scope
Native collections are saved on this device, not shared with the browser. The existing web app stores its data in browser localStorage, even after Neon login. Neon session and playlists **are not synchronized to the native app**. Full website tab lets users access their original web experience in the meantime.
On Android, sustained background playback/lock-screen controls require an EAS development/standalone APK with the expo-audio config plugin; Expo Go is insufficient. YouTube videos must remain visible and user controlled.
When the Vercel hostname changes, use Profile > API address and enter the current public HTTPS production URL.

## Offline and consent
Only local files chosen by the user and server-verified artist-authorized Audius tracks can be downloaded. Never download YouTube media with this app.

## Before APK
Test on Android Expo Go, then run `eas build --profile preview --platform android` with a suitable eas.json profile and a properly configured Expo/EAS project.
