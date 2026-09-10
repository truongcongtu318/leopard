import { useState } from 'react';
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
  colors,
  radius,
  spacing,
  IconCamera,
  IconChevronLeft,
  IconChevronRight,
  IconPhone,
  IconRoleDriver,
  IconStar,
  ScreenScaffold,
} from '@leopard/mobile-core';

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
    text: 'Tài xế Nguyễn Văn Hùng đã nhận chuyến hàng #LP-260815-001.',
    time: '14:20',
  },
  {
    id: 'm-2',
    sender: 'DRIVER',
    text: 'Chào bạn, mình đang trên đường qua kho lấy hàng, khoảng 10 phút nữa tới nơi nhé.',
    time: '14:22',
  },
  {
    id: 'm-3',
    sender: 'CUSTOMER',
    text: 'Dạ vâng, hàng đã đóng gói sẵn ở cổng số 2 kho Tân Bình rồi ạ.',
    time: '14:25',
  },
];

const quickReplies = [
  'Tôi đã đến điểm bốc',
  'Hàng đã sẵn sàng',
  'Vui lòng gọi khi đến',
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
    Linking.openURL('tel:0901234567').catch(() => {
      Alert.alert('Gọi tài xế', 'Số điện thoại: 0901 *** 567');
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
      <IconPhone color="#FFFFFF" size={15} strokeWidth={2} />
      <Text style={styles.callBtnText}>Gọi</Text>
    </Pressable>
  );

  return (
    <ScreenScaffold
      eyebrow={`ORDER · ${id ?? 'LP-260815-001'}`}
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
        <View style={styles.driverHeaderOuter}>
          <View style={styles.driverHeaderInner}>
            <View style={styles.driverAvatarBox}>
              <IconRoleDriver color="#0B1E42" size={20} />
            </View>
            <View style={styles.driverTextWrap}>
              <Text style={styles.driverName}>Nguyễn Văn Hùng</Text>
              <View style={styles.driverMetaRow}>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>59C-882.14</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <IconStar color="#F59E0B" fill="#F59E0B" size={12} strokeWidth={1.8} />
                  <Text style={styles.ratingText}>4.98</Text>
                </View>
                <Text style={styles.driverPhone}>0901 *** 567</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Message List ────────────────────────────────── */}
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
                <Text style={[styles.bubbleTime, isCustomer ? styles.bubbleTimeCustomer : styles.bubbleTimeDriver]}>
                  {item.time}
                </Text>
              </View>
            );
          }}
        />

        {/* ── Quick Message Suggestions (>= 44px touch target) ── */}
        <View style={styles.quickReplyRow}>
          <FlatList
            data={quickReplies}
            horizontal
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                accessibilityLabel={`Gợi ý tin nhắn: ${item}`}
                accessibilityRole="button"
                onPress={() => handleSend(item)}
                style={({ pressed }) => [styles.quickChip, pressed ? styles.pressed : null]}
              >
                <Text style={styles.quickChipText}>{item}</Text>
              </Pressable>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* ── Input Bar (>= 44px touch targets) ───────────── */}
        <View style={styles.inputBar}>
          <Pressable
            accessibilityLabel="Đính kèm ảnh kiện hàng"
            accessibilityRole="button"
            onPress={handleAttach}
            style={({ pressed }) => [styles.attachBtn, pressed ? styles.pressed : null]}
          >
            <IconCamera color="#0B1E42" size={20} strokeWidth={2} />
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
            onPress={() => handleSend()}
            style={({ pressed }) => [
              styles.sendBtn,
              !inputText.trim() ? styles.sendBtnDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <IconChevronRight
              color={inputText.trim() ? '#FFFFFF' : '#94A3B8'}
              size={18}
              strokeWidth={2.5}
            />
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

  // Driver Header (Double-Bezel: 24px outer, 18px inner)
  driverHeaderOuter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 8,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  driverHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 10,
  },
  driverAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  driverTextWrap: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plateBadge: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  plateText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
    fontVariant: ['tabular-nums'],
  },
  driverPhone: {
    fontSize: 10.5,
    color: '#64748B',
    fontVariant: ['tabular-nums'],
  },

  // Call button
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0B1E42',
    borderRadius: 14,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Message list
  messageList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingBottom: spacing.md,
  },
  systemMsgWrap: {
    alignSelf: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: '90%',
  },
  systemMsgText: {
    color: '#64748B',
    fontSize: 11.5,
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
    backgroundColor: '#0B1E42',
    borderBottomRightRadius: 4,
  },
  bubbleDriver: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  bubbleTextCustomer: {
    color: '#FFFFFF',
  },
  bubbleTextDriver: {
    color: '#0F172A',
  },
  bubbleTime: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  bubbleTimeCustomer: {
    alignSelf: 'flex-end',
    color: '#94A3B8',
  },
  bubbleTimeDriver: {
    alignSelf: 'flex-start',
    color: '#64748B',
  },

  // Quick replies
  quickReplyRow: {
    paddingVertical: 4,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#0B1E42',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13.5,
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
    backgroundColor: '#0B1E42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  pressed: {
    opacity: 0.85,
  },
});
