import type { PressableStateCallbackType } from 'react-native';

/** react-native-web adds `hovered` and `focused` to the Pressable state. */
export type InteractionState = PressableStateCallbackType & {
  hovered?: boolean;
  focused?: boolean;
};
