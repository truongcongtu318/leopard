import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

type ChatMessage = {
  id: string;
  sender: 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
  text: string;
  time: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 'm-1',
    sender: 'SYSTEM',
    text: 'Tài xế Nguyễn Văn Tài đã nhận đơn hàng LP-D-260815-001.',
    time: '14:20',
  },
  {
    id: 'm-2',
    sender: 'DRIVER',
    text: 'Chào bạn, mình đang trên đường qua kho lấy hàng, khoảng 10 phút nữa tới nhé.',
    time: '14:22',
  },
  {
    id: 'm-3',
    sender: 'CUSTOMER',
    text: 'Dạ vâng, hàng đã đóng gói sẵn ở cổng số 2 rồi ạ.',
    time: '14:25',
  },
];

const quickReplies = [
  'Tôi đã chuẩn bị xong hàng',
  'Đến nơi hãy bấm chuông nhé',
  'Gọi trước khi giao 10 phút',
  'Cảm ơn tài xế nhiều',
];

export function OrderChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'CUSTOMER',
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');
  };

  const handleCall = () => {
    Linking.openURL('tel:0900000002');
  };

  const callButton = (
    <Pressable
      accessibilityLabel="Gọi cho tài xế"
      accessibilityRole="button"
      onPress={handleCall}
      style={styles.callBtn}
    >
      <Text style={styles.callBtnText}>📞 Gọi</Text>
    </Pressable>
  );

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${id ?? 'LP-D-260815-001'}`}
      headerRight={callButton}
      onBack={() => router.back()}
      subtitle="Trò chuyện trực tiếp với tài xế phụ trách."
      title="Nhắn tin với tài xế"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <FlatList
          contentContainerStyle={styles.messageList}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.sender === 'SYSTEM') {
              return (
                <View style={styles.systemMsgWrap}>
                  <Text style={styles.systemMsgText}>{item.text}</Text>
                </View>
              );
            }

            const isCustomer = item.sender === 'CUSTOMER';
            return (
              <View style={[styles.bubbleWrap, isCustomer ? styles.bubbleCustomer : styles.bubbleDriver]}>
                <Text style={[styles.bubbleText, isCustomer ? styles.bubbleTextCustomer : styles.bubbleTextDriver]}>
                  {item.text}
                </Text>
                <Text style={[styles.bubbleTime, isCustomer ? styles.bubbleTimeCustomer : null]}>
                  {item.time}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.quickReplyRow}>
          <FlatList
            data={quickReplies}
            horizontal
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleSend(item)} style={styles.quickChip}>
                <Text style={styles.quickChipText}>{item}</Text>
              </Pressable>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <View style={styles.inputBar}>
          <TextInput
            onChangeText={setInputText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.neutral.subtleText}
            style={styles.textInput}
            value={inputText}
          />
          <Pressable
            disabled={!inputText.trim()}
            onPress={() => handleSend()}
            style={[styles.sendBtn, !inputText.trim() ? styles.sendBtnDisabled : null]}
          >
            <Text style={styles.sendBtnText}>Gửi</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xs,
  },
  callBtn: {
    backgroundColor: colors.brand.background,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callBtnText: {
    color: colors.neutral.background,
    fontSize: 12.5,
    fontWeight: '700',
  },
  messageList: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  systemMsgWrap: {
    alignSelf: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  systemMsgText: {
    color: colors.neutral.mutedText,
    fontSize: 11.5,
    textAlign: 'center',
  },
  bubbleWrap: {
    borderRadius: 14,
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleCustomer: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand.background,
    borderBottomRightRadius: 2,
  },
  bubbleDriver: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderWidth: 1,
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  bubbleTextCustomer: {
    color: colors.neutral.background,
  },
  bubbleTextDriver: {
    color: colors.neutral.text,
  },
  bubbleTime: {
    color: colors.neutral.subtleText,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeCustomer: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  quickReplyRow: {
    paddingVertical: 4,
  },
  quickChip: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickChipText: {
    color: colors.neutral.text,
    fontSize: 12,
  },
  inputBar: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  textInput: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 13.5,
    minHeight: 40,
    paddingVertical: 0,
  },
  sendBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.background,
    borderRadius: radius.control,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  sendBtnDisabled: {
    backgroundColor: colors.neutral.border,
  },
  sendBtnText: {
    color: colors.neutral.background,
    fontSize: 13,
    fontWeight: '700',
  },
});
