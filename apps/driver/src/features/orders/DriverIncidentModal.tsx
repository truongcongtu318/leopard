import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, leopardPalette, radius, spacing, typography, Button, IconShieldAlert, IconTrash } from '@leopard/mobile-core';

export const INCIDENT_REASONS = [
  { id: 'VEHICLE_BREAKDOWN', label: 'Phương tiện gặp sự cố / Hỏng xe / Tai nạn' },
  { id: 'SENDER_NO_SHOW', label: 'Người gửi không có mặt tại điểm lấy hàng' },
  { id: 'SENDER_CANCELLED', label: 'Người gửi hủy tại chỗ / hàng cấm, sai quy cách' },
  { id: 'RECIPIENT_REJECTED', label: 'Người nhận từ chối nhận hàng / không nghe máy' },
  { id: 'WRONG_ADDRESS', label: 'Địa chỉ giao hàng sai hoặc không tồn tại' },
  { id: 'FORCE_MAJEURE', label: 'Thời tiết xấu / Bất khả kháng' },
  { id: 'OTHER', label: 'Sự cố khác' },
] as const;

const REASONS_REQUIRING_NOTE: ReadonlySet<string> = new Set(['OTHER']);

export type IncidentReasonCode = (typeof INCIDENT_REASONS)[number]['id'];

export type DriverIncidentSubmitPayload = Readonly<{
  reason: string;
  note?: string;
  evidenceMediaId?: string;
}>;

export type DriverIncidentModalProps = Readonly<{
  visible: boolean;
  orderReference?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: DriverIncidentSubmitPayload) => void | Promise<void>;
}>;

export function DriverIncidentModal({
  visible,
  orderReference,
  isSubmitting = false,
  onClose,
  onSubmit,
}: DriverIncidentModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(INCIDENT_REASONS[0].id);
  const [note, setNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selectedReason) {
      setErrorMessage('Vui lòng chọn lý do sự cố');
      return;
    }
    if (REASONS_REQUIRING_NOTE.has(selectedReason) && note.trim().length === 0) {
      setErrorMessage('Vui lòng mô tả chi tiết khi chọn "Sự cố khác"');
      return;
    }
    setErrorMessage(null);
    onSubmit({
      reason: selectedReason,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer} testID="driver-incident-sheet">
          <View style={styles.grabBar} />

          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <IconShieldAlert color="#DC2626" size={22} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>Báo cáo sự cố chuyến đi</Text>
              <Text style={styles.subtitle}>
                {orderReference ? `Đơn hàng ${orderReference}` : 'Báo cáo khẩn cấp đến trung tâm điều hành'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollArea}>
            <Text style={styles.sectionLabel}>LÝ DO SỰ CỐ</Text>
            <View style={styles.reasonList}>
              {INCIDENT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason.id;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    key={reason.id}
                    onPress={() => setSelectedReason(reason.id)}
                    style={[
                      styles.reasonOption,
                      isSelected ? styles.reasonOptionSelected : null,
                    ]}
                    testID={`incident-reason-${reason.id}`}
                  >
                    <View
                      style={[
                        styles.radioDotOuter,
                        isSelected ? styles.radioDotOuterSelected : null,
                      ]}
                    >
                      {isSelected ? <View style={styles.radioDotInner} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected ? styles.reasonTextSelected : null,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>CHI TIẾT BỔ SUNG</Text>
            <TextInput
              accessibilityLabel="Mô tả chi tiết sự cố"
              multiline
              numberOfLines={3}
              onChangeText={setNote}
              placeholder="Mô tả thêm tình trạng thực tế tại hiện trường..."
              placeholderTextColor="#94A3B8"
              style={styles.textInput}
              testID="input-incident-note"
              value={note}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityLabel="Đóng và hủy báo cáo sự cố"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onClose}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Xác nhận gửi báo cáo sự cố"
              accessibilityRole="button"
              disabled={isSubmitting || !selectedReason}
              onPress={handleSubmit}
              style={[
                styles.submitBtn,
                isSubmitting ? styles.submitBtnDisabled : null,
              ]}
              testID="btn-confirm-incident-report"
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo sự cố'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 30, 66, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  scrollArea: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  reasonList: {
    gap: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  reasonOptionSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  radioDotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotOuterSelected: {
    borderColor: '#DC2626',
  },
  radioDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  reasonText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#991B1B',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
