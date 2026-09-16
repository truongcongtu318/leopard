import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppText,
  colors,
  httpClient,
  iconSize,
  radius,
  spacing,
  typeScale,
  ScreenScaffold,
  ScreenState,
  IconPhone,
} from '@leopard/mobile-core';
import { callPhoneNumber } from '../orders/components/detail/CargoAndContactCard';

type DriverChatMessage = {
  id: string;
  sender: 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
  text: string;
  time: string;
};

type ApiOrderMessage = {
  id: string;
  orderId: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderRole?: 'CUSTOMER' | 'DRIVER';
};

const driverQuickReplies = [
  'Tôi đang tới điểm lấy hàng',
  'Tôi đã tới nơi, vui lòng ra nhận hàng',
  'Đang kẹt xe nhẹ, tới sau 5 phút nữa',
  'Đã giao xong kiện hàng an toàn',
];

export function DriverChatScreen() {
  const router = useRouter();
  const { id, customerContact } = useLocalSearchParams<{ id?: string; customerContact?: string }>();
  const [messages, setMessages] = useState<DriverChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function fetchMessages() {
      try {
        const data = await httpClient.get<ApiOrderMessage[]>(`/orders/${id}/messages`);
        if (isMounted && Array.isArray(data)) {
          const mapped: DriverChatMessage[] = data.map((msg) => ({
            id: msg.id,
            sender: msg.senderRole === 'DRIVER' ? 'DRIVER' : 'CUSTOMER',
            text: msg.body,
            time: msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '',
          }));
          setMessages(mapped);
        }
      } catch {
        // Keep empty state on fetch failure
      }
    }

    void fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !id) return;

    const newMsg: DriverChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'DRIVER',
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');

    try {
      await httpClient.post(`/orders/${id}/messages`, { body: text });
    } catch {
      // Retain optimistic message in local state
    }
  };

  const handleCall = () => {
    callPhoneNumber(customerContact ?? null);
  };

  const callButton = (
    <Pressable
      accessibilityLabel="Gọi cho khách hàng"
      accessibilityRole="button"
      onPress={handleCall}
      style={styles.callBtn}
    >
      <IconPhone color="#FFFFFF" size={iconSize.sm} />
      <AppText variant="footnote" style={styles.callBtnText}>
        Gọi khách
      </AppText>
    </Pressable>
  );

  if (!id) {
    return (
      <ScreenScaffold
        headerTone="ink"
        onBack={() => router.back()}
        subtitle="Nhắn tin chỉ khả dụng khi bạn có chuyến đang thực hiện."
        title="Nhắn tin với khách"
      >
        <ScreenState
          message="Chưa có chuyến đang hoạt động để nhắn tin với khách."
          state="empty"
          title="Chưa có cuộc trò chuyện"
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      eyebrow={`DRIVER · CHAT · ${id}`}
      headerRight={callButton}
      headerTone="ink"
      onBack={() => router.back()}
      subtitle="Liên hệ trao đổi với khách hàng về chuyến hàng."
      title="Nhắn tin với khách"
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
                  <AppText variant="caption1" style={styles.systemMsgText}>
                    {item.text}
                  </AppText>
                </View>
              );
            }

            const isDriver = item.sender === 'DRIVER';
            return (
              <View style={[styles.bubbleWrap, isDriver ? styles.bubbleDriver : styles.bubbleCustomer]}>
                <AppText
                  variant="callout"
                  style={[
                    styles.bubbleText,
                    isDriver ? styles.bubbleTextDriver : styles.bubbleTextCustomer,
                  ]}
                >
                  {item.text}
                </AppText>
                <AppText
                  variant="caption2"
                  style={[styles.bubbleTime, isDriver ? styles.bubbleTimeDriver : null]}
                >
                  {item.time}
                </AppText>
              </View>
            );
          }}
        />

        <View style={styles.quickReplyRow}>
          <FlatList
            data={driverQuickReplies}
            horizontal
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleSend(item)} style={styles.quickChip}>
                <AppText variant="caption1" style={styles.quickChipText}>
                  {item}
                </AppText>
              </Pressable>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <View style={styles.inputBar}>
          <TextInput
            onChangeText={setInputText}
            placeholder="Nhập tin nhắn cho khách..."
            placeholderTextColor={colors.neutral.subtleText}
            style={[styles.textInput, typeScale.callout]}
            value={inputText}
          />
          <Pressable
            disabled={!inputText.trim()}
            onPress={() => handleSend()}
            style={[styles.sendBtn, !inputText.trim() ? styles.sendBtnDisabled : null]}
          >
            <AppText variant="footnote" style={styles.sendBtnText}>
              Gửi
            </AppText>
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
    alignItems: 'center',
    backgroundColor: colors.brand.background,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callBtnText: {
    color: colors.neutral.background,
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
    textAlign: 'center',
  },
  bubbleWrap: {
    borderRadius: 14,
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleDriver: {
    alignSelf: 'flex-end',
    backgroundColor: colors.active.border,
    borderBottomRightRadius: 2,
  },
  bubbleCustomer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderWidth: 1,
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    flexShrink: 1,
  },
  bubbleTextDriver: {
    color: colors.neutral.background,
  },
  bubbleTextCustomer: {
    color: colors.neutral.text,
  },
  bubbleTime: {
    color: colors.neutral.subtleText,
    marginTop: spacing.xxs,
    textAlign: 'right',
  },
  bubbleTimeDriver: {
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
    fontWeight: '700',
  },
});
