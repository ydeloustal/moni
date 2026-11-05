/** Web: no biometric unlock (the PIN is always used). */
export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'generic';

export async function biometricKind(): Promise<BiometricKind | null> {
  return null;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  return false;
}
