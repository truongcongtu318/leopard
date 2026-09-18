import { useEffect, useState } from 'react';
import {
  Alert,
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

import {
  Badge,
  Box,
  Card,
  Divider,
  HStack,
  IconCamera,
  IconChevronRight,
  IconPhone,
  IconRoleDriver,
  IconStar,
  ScreenScaffold,
  VStack,
  colors,
  customerPalette,
  httpClient,
  leopardPalette,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export interface OrderChatScreenProps {
  orderId?: string;
  currentUserId?: string;
  assignedDriver?: {
    id?: string | null;
    name?: string | null;
    phone?: string | null;
    licensePlate?: string | null;
    vehicleType?: string | null;
    rating?: number | null;
  } | null;
}

type ChatMessage = {
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

const quickReplies = [
  'Tôi đã đến điểm bốc',
  'Hàng đã sẵn sàng',
  'Vui lòng gọi khi đến',
  'Cảm ơn tài xế nhiều',
];

export function OrderChatScreen(props?: OrderChatScreenProps) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    id?: string;
    driverName?: string;
    driverPhone?: string;
    licensePlate?: string;
    vehicleType?: string;
    rating?: string;
  }>();

  const orderId = props?.orderId ?? searchParams.id ?? 'LP-260815-001';
  const driverName =
    props?.assignedDriver?.name ??
    searchParams.driverName ??
    'Nguyễn Văn Hùng';
  const driverPhone =
    props?.assignedDriver?.phone ??
    searchParams.driverPhone ??
    '0901234567';
  const licensePlate =
    props?.assignedDriver?.licensePlate ??
    searchParams.licensePlate ??
    '59C-882.14';
  const ratingText =
    props?.assignedDriver?.rating != null
      ? props.assignedDriver.rating.toFixed(2)
      : searchParams.rating ?? '4.98';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  const displayPhone =
    driverPhone.length >= 10
      ? `${driverPhone.slice(0, 4)} *** ${driverPhone.slice(-3)}`
      : driverPhone;

  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      try {
        const data = await httpClient.get<ApiOrderMessage[]>(`/orders/${orderId}/messages`);
        if (isMounted && Array.isArray(data)) {
          const mapped: ChatMessage[] = data.map((msg) => {
            const isCustomer =
              msg.senderRole === 'CUSTOMER' ||
              (Boolean(props?.currentUserId) && msg.senderId === props?.currentUserId);
            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            return {
              id: msg.id,
              sender: isCustomer ? 'CUSTOMER' : 'DRIVER',
              text: msg.body,
              time: timeStr,
            };
          });
          setMessages(mapped);
        }
      } catch {
        // Ignore fetch error in chat screen
      }
    }

    void fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [orderId, props?.currentUserId]);

  const handleSend = async (textToSend?: string) => {
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

    try {
      await httpClient.post(`/orders/${orderId}/messages`, { body: text });
    } catch {
      // Retain optimistic message in local state
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${driverPhone}`).catch(() => {
      Alert.alert('Gọi tài xế', `Số điện thoại: ${displayPhone}`);
    });
  };

  const handleAttach = () => {
    Alert.alert('Đính kèm ảnh', 'Chọn ảnh kiện hàng hoặc giấy tờ giao nhận từ thư viện.');
  };

  const callButton = (
    <Pressable
      accessibilityLabel="Gọi điện tài xế"
      accessibilityRole="button"
      onPress={handleCall}
      style={({ pressed }) => [styles.callBtn, pressed ? styles.pressed : null]}
    >
      <IconPhone color={colors.neutral.surface} size={15} strokeWidth={2} />
      <Text style={styles.callBtnText}>Gọi</Text>
    </Pressable>
  );

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${orderId}`}
      headerRight={callButton}
      onBack={() => router.back()}
      subtitle="Trò chuyện trực tiếp với tài xế phụ trách."
      title="Nhắn tin với tài xế"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* ── Driver Header Info Card (Double-Bezel) ──────── */}
        <Card style={styles.driverHeaderOuter}>
          <HStack style={styles.driverHeaderInner}>
            <Box style={styles.driverAvatarBox}>
              <IconRoleDriver color={customerPalette.primary} size={20} />
            </Box>
            <VStack style={styles.driverTextWrap}>
              <Text style={styles.driverName}>{driverName}</Text>
              <HStack style={styles.driverMetaRow}>
                <Badge action="muted" size="sm" style={styles.plateBadge}>
                  <Badge.Text style={styles.plateText}>{licensePlate}</Badge.Text>
                </Badge>
                <Badge action="warning" size="sm" style={styles.ratingBadge}>
                  <IconStar color={leopardPalette.accentYellow} fill={leopardPalette.accentYellow} size={12} strokeWidth={1.8} />
                  <Badge.Text style={styles.ratingText}>{ratingText}</Badge.Text>
                </Badge>
                <Text style={styles.driverPhone}>{displayPhone}</Text>
              </HStack>
            </VStack>
          </HStack>
        </Card>

        {/* ── Message List ────────────────────────────────── */}
        <FlatList
          contentContainerStyle={styles.messageList}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.sender === 'SYSTEM') {
              return (
                <Box style={styles.systemMsgWrap}>
                  <Text style={styles.systemMsgText}>{item.text}</Text>
                </Box>
              );
            }

            const isCustomer = item.sender === 'CUSTOMER';
            const senderLabel = isCustomer ? 'Bạn' : 'Tài xế';
            return (
              <Box
                accessibilityLabel={`${senderLabel} gửi lúc ${item.time}: ${item.text}`}
                accessible={true}
                style={[styles.bubbleWrap, isCustomer ? styles.bubbleCustomer : styles.bubbleDriver]}
              >
                <Text style={[styles.bubbleText, isCustomer ? styles.bubbleTextCustomer : styles.bubbleTextDriver]}>
                  {item.text}
                </Text>
                <Text style={[styles.bubbleTime, isCustomer ? styles.bubbleTimeCustomer : styles.bubbleTimeDriver]}>
                  {item.time}
                </Text>
              </Box>
            );
          }}
        />

        {/* ── Quick Message Suggestions (>= 44px touch target) ── */}
        <Box style={styles.quickReplyRow}>
          <FlatList
            data={quickReplies}
            horizontal
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                accessibilityLabel={`Gợi ý tin nhắn: ${item}`}
                accessibilityRole="button"
                onPress={() => void handleSend(item)}
                style={({ pressed }) => [styles.quickChip, pressed ? styles.pressed : null]}
              >
                <Text style={styles.quickChipText}>{item}</Text>
              </Pressable>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </Box>

        {/* ── Input Bar (>= 44px touch targets) ───────────── */}
        <HStack style={styles.inputBar}>
          <Pressable
            accessibilityLabel="Đính kèm ảnh kiện hàng"
            accessibilityRole="button"
            onPress={handleAttach}
            style={({ pressed }) => [styles.attachBtn, pressed ? styles.pressed : null]}
          >
            <IconCamera color={customerPalette.primary} size={20} strokeWidth={2} />
          </Pressable>

          <TextInput
            accessibilityLabel="Nhập tin nhắn trao đổi"
            onChangeText={setInputText}
            placeholder="Nhập tin nhắn trao đổi..."
            placeholderTextColor={colors.neutral.subtleText}
            style={styles.textInput}
            value={inputText}
          />

          <Pressable
            accessibilityLabel="Gửi tin nhắn"
            accessibilityRole="button"
            disabled={!inputText.trim()}
            onPress={() => void handleSend()}
            style={({ pressed }) => [
              styles.sendBtn,
              !inputText.trim() ? styles.sendBtnDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <IconChevronRight
              color={inputText.trim() ? colors.neutral.surface : customerPalette.offlineGray}
              size={18}
              strokeWidth={2.5}
            />
          </Pressable>
        </HStack>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xs,
  },

  // Driver Header (Double-Bezel: 24px outer, 18px inner)
  driverHeaderOuter: {
    backgroundColor: colors.neutral.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 8,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  driverHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    padding: 10,
    gap: 10,
  },
  driverAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  driverTextWrap: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plateBadge: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.subtleBorder,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  plateText: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
    color: colors.neutral.text,
    fontVariant: ['tabular-nums'],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  ratingText: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
    color: colors.warning.text,
    fontVariant: ['tabular-nums'],
  },
  driverPhone: {
    fontSize: typeScale.caption2.fontSize,
    color: colors.neutral.subtleText,
    fontVariant: ['tabular-nums'],
  },

  // Call button
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: customerPalette.primary,
    borderRadius: 14,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callBtnText: {
    color: colors.neutral.surface,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },

  // Message list
  messageList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingBottom: spacing.md,
  },
  systemMsgWrap: {
    alignSelf: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: '90%',
  },
  systemMsgText: {
    color: colors.neutral.subtleText,
    fontSize: typeScale.caption1.fontSize,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  bubbleWrap: {
    borderRadius: 16,
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleCustomer: {
    alignSelf: 'flex-end',
    backgroundColor: customerPalette.primary,
    borderBottomRightRadius: 4,
  },
  bubbleDriver: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: typeScale.footnote.fontSize,
    lineHeight: 19,
  },
  bubbleTextCustomer: {
    color: colors.neutral.surface,
  },
  bubbleTextDriver: {
    color: colors.neutral.text,
  },
  bubbleTime: {
    fontSize: typeScale.caption2.fontSize,
    fontVariant: ['tabular-nums'],
  },
  bubbleTimeCustomer: {
    alignSelf: 'flex-end',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bubbleTimeDriver: {
    alignSelf: 'flex-start',
    color: colors.neutral.subtleText,
  },

  // Quick replies
  quickReplyRow: {
    paddingVertical: 4,
  },
  quickChip: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickChipText: {
    color: colors.neutral.text,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  attachBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    color: colors.neutral.text,
    fontSize: typeScale.footnote.fontSize,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.neutral.surfaceMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
