import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ConfirmDiscardParams {
  onDiscard: () => void;
  onContinue?: () => void;
}

const TITLE = 'Bỏ đơn đang nhập?';
const MESSAGE = 'Thông tin lộ trình và người nhận sẽ không được lưu.';

export function showDiscardBookingActionSheet({
  onDiscard,
  onContinue,
}: ConfirmDiscardParams) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: TITLE,
        message: MESSAGE,
        options: ['Bỏ đơn', 'Tiếp tục nhập'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          onDiscard();
        } else if (onContinue) {
          onContinue();
        }
      },
    );
    return;
  }

  // `Alert.alert` is a no-op in react-native-web: it renders nothing and never
  // fires its callbacks, so the confirm never appeared and the back button
  // looked broken. Web gets a real confirm dialog instead.
  if (Platform.OS === 'web') {
    const canConfirm =
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as { confirm?: unknown }).confirm === 'function';

    if (!canConfirm) {
      // Never trap the driver on the screen: without a dialog, honour the tap.
      onDiscard();
      return;
    }

    const discard = (globalThis as unknown as { confirm: (m: string) => boolean }).confirm(
      `${TITLE}\n${MESSAGE}`,
    );
    if (discard) {
      onDiscard();
    } else if (onContinue) {
      onContinue();
    }
    return;
  }

  Alert.alert(
    TITLE,
    MESSAGE,
    [
      {
        text: 'Tiếp tục nhập',
        style: 'cancel',
        onPress: onContinue,
      },
      {
        text: 'Bỏ đơn',
        style: 'destructive',
        onPress: onDiscard,
      },
    ],
    { cancelable: true },
  );
}
