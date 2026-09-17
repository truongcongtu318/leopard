import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ConfirmDiscardParams {
  onDiscard: () => void;
  onContinue?: () => void;
}

export function showDiscardBookingActionSheet({
  onDiscard,
  onContinue,
}: ConfirmDiscardParams) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Bỏ đơn đang nhập?',
        message: 'Thông tin lộ trình và người nhận sẽ không được lưu.',
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
  } else {
    Alert.alert(
      'Bỏ đơn đang nhập?',
      'Thông tin lộ trình và người nhận sẽ không được lưu.',
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
}
