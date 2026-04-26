/**
 * Google OAuth Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT: The webClientId MUST come from Firebase Console, not from a
 * manually created OAuth client in Google Cloud Console. Using the wrong
 * client ID is the most common reason Google sign-in silently fails.
 *
 * HOW TO GET THE CORRECT webClientId:
 *   1. Go to https://console.firebase.google.com
 *   2. Open your project → Build → Authentication → Sign-in method
 *   3. Click "Google" provider → expand "Web SDK configuration"
 *   4. Copy the "Web client ID" → paste below as webClientId
 *
 * HOW TO GET iosClientId / androidClientId (for device builds):
 *   1. Same Firebase Console → Authentication → Sign-in method → Google
 *   2. Download GoogleService-Info.plist (iOS) or google-services.json (Android)
 *   3. iOS: CLIENT_ID value from GoogleService-Info.plist
 *   4. Android: client_id where client_type=3 in google-services.json
 *
 * AUTHORIZED REDIRECT URIs — add these in Google Cloud Console for the web
 * client that Firebase created (same project as your Firebase app):
 *   • http://localhost:19006   (Expo web dev server — exact port required)
 *   • http://localhost:8081    (Metro web fallback port)
 *   • https://auth.expo.io/@YOUR_EXPO_USERNAME/word-match-kids  (Expo proxy)
 *
 * NOTE: Expo Go on a physical device uses a dynamic exp://IP:PORT redirect URI
 * which cannot be pre-authorized. For device testing, use a development build:
 *   npx expo run:ios  OR  npx expo run:android
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const GOOGLE_CONFIG = {
  // Get from Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration
  webClientId: '1012960287893-6o63oboopum84ucp7m5aqk4dvvkjlom2.apps.googleusercontent.com',

  // Get from GoogleService-Info.plist (iOS) / google-services.json (Android)
  // Must be non-empty strings (empty string = not configured, fails gracefully)
  iosClientId:     '',
  androidClientId: '',
};

/** Returns true only when at least one client ID has been configured. */
export const GOOGLE_AUTH_ENABLED = !!GOOGLE_CONFIG.webClientId;
