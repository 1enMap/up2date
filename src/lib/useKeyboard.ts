import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height the keyboard currently covers.
 *
 * `KeyboardAvoidingView` alone is not enough here: the article screen is a long
 * ScrollView whose input sits at the very bottom, and on Android the window may
 * pan rather than resize. Padding the scroll content by this much, and scrolling
 * the input into view on focus, keeps what you are typing visible on both platforms.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // The `will` events fire early enough on iOS to animate with the keyboard;
    // Android only has the `did` pair.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
