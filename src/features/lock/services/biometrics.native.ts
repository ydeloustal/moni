import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'generic';

/** Biometrics usable right now: hardware present and at least one face / fingerprint enrolled. */
export async function biometricKind(): Promise<BiometricKind | null> {
  try {
    if (
      !(await LocalAuthentication.hasHardwareAsync()) ||
      !(await LocalAuthentication.isEnrolledAsync())
    ) {
      return null;
    }
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
    return 'generic';
  } catch {
    return null;
  }
}

/** Biometric prompt only: the fallback is Moni's own PIN, not the device passcode. */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouiller Moni',
      cancelLabel: 'Utiliser le code',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    });
    return result.success;
  } catch {
    return false;
  }
}
