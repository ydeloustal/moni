import type { ConfigContext, ExpoConfig } from 'expo/config';

import pkg from './package.json';

/**
 * App configuration.
 *
 * Privacy by design: Moni never talks to a server. In particular:
 *  - expo-updates is not installed and updates are disabled (no OTA);
 *  - production Android builds block every permission, INTERNET included, except CAMERA:
 *    it is only used to scan the QR codes of a device-to-device transfer (no photo is
 *    saved, the microphone stays blocked). Development builds keep INTERNET for Metro.
 *
 * Set APP_VARIANT=development (or use the EAS "development" profile) for a dev build.
 */
const IS_DEV_BUILD =
  process.env.APP_VARIANT === 'development' || process.env.EAS_BUILD_PROFILE === 'development';

/**
 * User-facing version (web, Android versionName, iOS CFBundleShortVersionString).
 * Single source of truth: package.json. The release workflow overwrites it with the version of the
 * pushed vX.Y.Z tag before building, so web and EAS builds always carry the tag's version.
 */
const APP_VERSION = pkg.version;

/** EAS project id (not a secret), printed by `npx eas-cli@latest init`. Required by CI mobile builds. */
const EAS_PROJECT_ID = 'a354609d-112f-47a5-80c0-77b3a4dcd4ac';

const APP_ID = 'fr.moni.app';
const BRAND_LIGHT = '#f6f7f9';
const BRAND_DARK = '#0f172a';

const BLOCKED_ANDROID_PERMISSIONS = [
  ...(IS_DEV_BUILD ? [] : ['android.permission.INTERNET']),
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.READ_PHONE_STATE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.POST_NOTIFICATIONS',
  'com.google.android.gms.permission.AD_ID',
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV_BUILD ? 'Moni (dev)' : 'Moni',
  slug: 'moni',
  owner: 'ydeloustal',
  version: APP_VERSION,
  description:
    'Gestion de budget personnel, privée par conception : tes données restent sur ton appareil.',
  scheme: 'moni',
  orientation: 'default',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: BRAND_LIGHT,
  updates: { enabled: false },
  ios: {
    bundleIdentifier: IS_DEV_BUILD ? `${APP_ID}.dev` : APP_ID,
    supportsTablet: true,
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
      ],
    },
  },
  android: {
    package: IS_DEV_BUILD ? `${APP_ID}.dev` : APP_ID,
    adaptiveIcon: {
      backgroundColor: BRAND_DARK,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // System backups (Google) are allowed: losing the phone is the main risk of a serverless app.
    allowBackup: true,
    permissions: [],
    blockedPermissions: BLOCKED_ANDROID_PERMISSIONS,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
    name: 'Moni',
    shortName: 'Moni',
    lang: 'fr',
    themeColor: BRAND_DARK,
    backgroundColor: BRAND_LIGHT,
    display: 'standalone',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-sharing',
    [
      'expo-camera',
      {
        cameraPermission:
          'Moni utilise la caméra uniquement pour scanner les QR codes d’un transfert entre tes appareils. Aucune image n’est enregistrée.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-local-authentication',
      { faceIDPermission: 'Moni utilise Face ID pour déverrouiller l’application.' },
    ],
    // PIN hash stored in the Keychain / Keystore, excluded from Android backups (keys cannot be restored).
    ['expo-secure-store', { configureAndroidBackup: true, faceIDPermission: false }],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        resizeMode: 'contain',
        backgroundColor: BRAND_LIGHT,
        dark: { image: './assets/images/splash-icon.png', backgroundColor: BRAND_DARK },
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
  ...(EAS_PROJECT_ID ? { extra: { ...config.extra, eas: { projectId: EAS_PROJECT_ID } } } : {}),
});
