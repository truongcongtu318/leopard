import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, leopardPalette, leopardRadius, pastelTheme, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { EtaIndicator } from '../../../ui/EtaIndicator';
import { FormField } from '../../../ui/FormField';
import { RouteSpine } from '../../../ui/RouteSpine';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { SkeletonBar } from '../../../ui/Skeleton';
import type { CustomerActionView, CustomerCreateFormScreenView, CustomerCreateView } from './model';

export type CustomerCreateOrderScreenProps = Readonly<{
  view: CustomerCreateView;
  onFieldChange?: (field: string, value: string) => void;
  onAddStop?: () => void;
  onRemoveStop?: (stopId: string) => void;
  onSelectVehicle?: (vehicle: 'MOTORBIKE' | 'VAN' | 'TRUCK') => void;
  onPrimaryAction?: (actionId: string) => void;
  onRetry?: () => void;
  onBack?: () => void;
}>;

const vehicleOptions = [
  { value: 'MOTORBIKE', label: 'Xe máy', desc: 'Bưu phẩm, kiện nhỏ < 20 kg' },
  { value: 'VAN', label: 'Xe van', desc: 'Hàng đóng thùng, tải trọng vừa' },
  { value: 'TRUCK', label: 'Xe tải', desc: 'Hàng cồng kềnh, tải trọng lớn' },
] as const;

function ActionButton({
  action,
  onPress,
}: Readonly<{ action: CustomerActionView; onPress?: () => void }>) {
  return (
    <Button
      disabled={action.disabled}
      disabledLabel={
        action.disabledReason ? `${action.label} — ${action.disabledReason}` : undefined
      }
      isLoading={action.isPending}
      label={action.label}
      loadingLabel={action.pendingLabel}
      onPress={onPress}
    />
  );
}

function EstimatePanel({
  onRetry,
  view,
}: Readonly<{ view: CustomerCreateFormScreenView; onRetry?: () => void }>) {
  const estimate = view.estimate;

  if (estimate.kind === 'loading') {
    return (
      <View style={styles.estimatePanel}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>03</Text>
          <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
        </View>
        <View style={styles.estimateBox}>
          <SkeletonBar height={14} width="50%" />
          <SkeletonBar height={28} width="70%" />
          <SkeletonBar height={14} width="40%" />
        </View>
      </View>
    );
  }

  if (estimate.kind === 'error') {
    return (
      <View style={styles.estimatePanel}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>03</Text>
          <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
        </View>
        <View style={[styles.estimateBox, styles.estimateBoxError]}>
          <Text style={styles.estimateErrorTitle}>Không thể tính giá và ETA</Text>
          <Text style={styles.estimateErrorMessage}>{estimate.message}</Text>
          {onRetry ? (
            <Button label="Thử lại" onPress={onRetry} variant="secondary" />
          ) : null}
        </View>
      </View>
    );
  }

  if (estimate.kind === 'ready') {
    const isDemo = estimate.source === 'DEMO';
    return (
      <View style={styles.estimatePanel}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>03</Text>
          <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
        </View>
        <View style={styles.estimateBox}>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateRowLabel}>Khoảng cách</Text>
            <Text style={styles.estimateRowValue}>{estimate.distanceLabel}</Text>
          </View>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateRowLabel}>Giá dự kiến</Text>
            <Text style={styles.estimatePrice}>{estimate.priceLabel}</Text>
          </View>
          <View style={styles.estimateRow}>
            <Text style={styles.estimateRowLabel}>ETA dự kiến</Text>
            <Text style={styles.estimateRowValue}>
              {Math.round(estimate.durationSeconds / 60)} phút
            </Text>
          </View>
          {isDemo ? (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Dữ liệu mô phỏng</Text>
            </View>
          ) : null}
          <Text style={styles.estimateCalcTime}>Tính lúc {estimate.calculatedAtLabel}</Text>
        </View>
      </View>
    );
  }

  const message =
    estimate.kind === 'expired'
      ? 'Estimate đã hết hiệu lực; hãy tính lại giá và ETA dự kiến.'
      : estimate.kind === 'outdated'
        ? 'Lộ trình đã thay đổi; estimate cũ không còn dùng được.'
        : 'Hoàn tất lộ trình và phương tiện để tính giá và ETA dự kiến.';

  return (
    <View style={styles.estimatePanel}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionIndex}>03</Text>
        <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
      </View>
      <View style={styles.estimateBox}>
        <Text style={styles.estimateEmptyMessage}>{message}</Text>
      </View>
    </View>
  );
}

function Notice({ isAlert, message }: Readonly<{ message: string | null; isAlert: boolean }>) {
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, isAlert ? styles.noticeError : styles.noticeInfo]}
    >
      <Text accessibilityRole={isAlert ? 'alert' : undefined} style={styles.noticeText}>
        {message}
      </Text>
    </View>
  );
}

export function CustomerCreateOrderScreen({
  onAddStop,
  onBack,
  onFieldChange,
  onPrimaryAction,
  onRemoveStop,
  onRetry,
  onSelectVehicle,
  view,
}: CustomerCreateOrderScreenProps) {
  if (view.kind === 'permission-denied') {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Tạo đơn">
        <ScreenState message={view.message} state="permission-denied" title={view.title} />
      </ScreenScaffold>
    );
  }

  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const isFormDirty = Boolean(
    view.form.pickup ||
    view.form.dropoff ||
    view.form.stops.some((s) => s.value) ||
    view.form.cargoWeight ||
    view.form.cargoNote
  );

  const handleBackPress = () => {
    if (isFormDirty) {
      setShowLeaveModal(true);
    } else {
      onBack?.();
    }
  };

  const primaryAction = view.actions[0];
  const routeStops = view.form.stops.map((stop) => ({
    id: stop.id,
    label: stop.value || 'Chưa chọn',
  }));
  const isAlert =
    view.phase === 'invalid' ||
    view.phase.endsWith('error') ||
    view.phase === 'submit-conflict' ||
    view.phase === 'media-invalid';

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · JOURNEY SHEET"
      onBack={onBack ? handleBackPress : undefined}
      stickyFooter={
        primaryAction ? (
          <ActionButton
            action={primaryAction}
            onPress={
              onPrimaryAction && !primaryAction.disabled && !primaryAction.isPending
                ? () => onPrimaryAction(primaryAction.id)
                : undefined
            }
          />
        ) : null
      }
      subtitle="Nhập lộ trình, chọn xe và xác nhận báo giá."
      title="Tạo đơn"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepProgressRow}>
            <View style={[styles.stepBar, styles.stepBarActive]} />
            <View style={[styles.stepBar, (view.form.pickup && view.form.dropoff) ? styles.stepBarActive : null]} />
            <View style={[styles.stepBar, view.estimate.kind === 'ready' ? styles.stepBarActive : null]} />
          </View>

          <Notice isAlert={isAlert} message={view.notice} />

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIndex}>01</Text>
              <Text style={styles.sectionLabel}>LỘ TRÌNH VẬN CHUYỂN</Text>
            </View>
            <RouteSpine
              destination={{ id: 'draft-dropoff', label: view.form.dropoff || 'Chưa chọn' }}
              origin={{ id: 'draft-pickup', label: view.form.pickup || 'Chưa chọn' }}
              stops={routeStops}
            />
            <FormField
              error={view.form.fieldErrors.pickup}
              label="Điểm lấy hàng"
              onChangeText={
                onFieldChange ? (value) => onFieldChange('pickup', value) : undefined
              }
              placeholder="Nhập địa chỉ lấy hàng"
              value={view.form.pickup}
            />
            {view.form.stops.map((stop, index) => (
              <View key={stop.id} style={styles.stopField}>
                <FormField
                  label={`Điểm dừng ${index + 1}`}
                  onChangeText={
                    onFieldChange
                      ? (value) => onFieldChange(`stop:${stop.id}`, value)
                      : undefined
                  }
                  placeholder="Nhập địa chỉ điểm dừng"
                  value={stop.value}
                />
                <Button
                  label={`Xóa điểm dừng ${index + 1}`}
                  onPress={onRemoveStop ? () => onRemoveStop(stop.id) : undefined}
                  variant="secondary"
                />
              </View>
            ))}
            {view.form.stops.length < 3 ? (
              <Pressable
                accessibilityRole="button"
                onPress={onAddStop}
                style={styles.addStopBtn}
              >
                <Text style={styles.addStopBtnText}>+ Thêm điểm dừng (0–3)</Text>
              </Pressable>
            ) : (
              <Text style={styles.helper}>Đã đạt tối đa 3 điểm dừng.</Text>
            )}
            <FormField
              error={view.form.fieldErrors.dropoff}
              label="Điểm giao hàng"
              onChangeText={
                onFieldChange ? (value) => onFieldChange('dropoff', value) : undefined
              }
              placeholder="Nhập địa chỉ giao hàng"
              value={view.form.dropoff}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIndex}>02</Text>
              <Text style={styles.sectionLabel}>PHƯƠNG TIỆN & HÀNG HÓA</Text>
            </View>
            <View accessibilityRole="radiogroup" style={styles.vehicleGroup}>
              {vehicleOptions.map((option) => {
                const selected = view.form.vehicleType === option.value;
                return (
                  <Pressable
                    accessibilityLabel={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={option.value}
                    onPress={
                      onSelectVehicle ? () => onSelectVehicle(option.value) : undefined
                    }
                    style={[
                      styles.vehicleCard,
                      selected ? styles.vehicleCardSelected : null,
                    ]}
                  >
                    <View style={styles.vehicleHeader}>
                      <Text
                        style={[
                          styles.vehicleTitle,
                          selected ? styles.vehicleTitleSelected : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selected ? <Text style={styles.checkIcon}>✓</Text> : null}
                    </View>
                    <Text style={styles.vehicleDesc}>{option.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
            <FormField
              error={view.form.fieldErrors.cargoWeight}
              keyboardType="decimal-pad"
              label="Khối lượng dự kiến (kg)"
              onChangeText={
                onFieldChange ? (value) => onFieldChange('cargoWeight', value) : undefined
              }
              value={view.form.cargoWeight}
            />
            <FormField
              label="Ghi chú hàng hóa"
              multiline
              onChangeText={
                onFieldChange ? (value) => onFieldChange('cargoNote', value) : undefined
              }
              placeholder="Mô tả loại hàng, yêu cầu bảo quản, người liên hệ..."
              value={view.form.cargoNote}
            />
            <Text style={styles.helper}>Ảnh hàng hóa: JPEG, PNG hoặc WebP tối đa 10 MB.</Text>
          </View>

          <View style={styles.card}>
            <EstimatePanel onRetry={onRetry} view={view} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Cảnh báo rời trang khi đang tạo đơn (Stitch Screens 19, 20, 21) */}
      <Modal animationType="fade" transparent visible={showLeaveModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.leaveModalCard}>
            <Text style={styles.leaveModalIcon}>⚠️</Text>
            <Text style={styles.leaveModalTitle}>Rời khỏi trang tạo đơn?</Text>
            <Text style={styles.leaveModalDesc}>
              Thông tin lộ trình và hàng hóa bạn đã nhập sẽ không được lưu lại.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                accessibilityLabel="Ở lại tiếp tục tạo đơn"
                accessibilityRole="button"
                onPress={() => setShowLeaveModal(false)}
                style={[styles.modalBtn, styles.modalBtnStay]}
              >
                <Text style={styles.modalBtnStayText}>Ở lại</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Xác nhận rời khỏi trang"
                accessibilityRole="button"
                onPress={() => {
                  setShowLeaveModal(false);
                  onBack?.();
                }}
                style={[styles.modalBtn, styles.modalBtnLeave]}
              >
                <Text style={styles.modalBtnLeaveText}>Rời đi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  stepProgressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.xxs,
  },
  stepBar: {
    backgroundColor: '#DDE7EA',
    borderRadius: radius.pill,
    flex: 1,
    height: 5,
  },
  stepBarActive: {
    backgroundColor: leopardPalette.primarySoft,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: leopardPalette.textSlateDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionIndex: {
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: radius.pill,
    color: leopardPalette.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionLabel: {
    color: leopardPalette.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stopField: {
    gap: spacing.xs,
  },
  addStopBtn: {
    alignSelf: 'flex-start',
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addStopBtnText: {
    color: leopardPalette.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleGroup: {
    gap: spacing.xs,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: leopardPalette.inputBorder,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 2,
    padding: 12,
  },
  vehicleCardSelected: {
    backgroundColor: pastelTheme.blueCard.bg,
    borderColor: pastelTheme.blueCard.accent,
  },
  vehicleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 14.5,
    fontWeight: '700',
  },
  vehicleTitleSelected: {
    color: leopardPalette.primaryDark,
  },
  checkIcon: {
    color: leopardPalette.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  vehicleDesc: {
    color: colors.neutral.mutedText,
    fontSize: 12.5,
  },
  estimatePanel: {
    gap: spacing.xs,
  },
  estimateBox: {
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.control,
    gap: spacing.xs,
    padding: 16,
  },
  estimateBoxError: {
    backgroundColor: colors.danger.background,
  },
  estimateRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estimateRowLabel: {
    color: colors.brand.softText,
    fontSize: 13,
    fontWeight: '600',
  },
  estimateRowValue: {
    color: colors.brand.softText,
    fontSize: 14,
    fontWeight: '700',
  },
  estimatePrice: {
    color: colors.brand.background,
    fontSize: 24,
    fontWeight: '800',
  },
  demoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning.background,
    borderRadius: radius.pill,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  demoBadgeText: {
    color: colors.warning.text,
    fontSize: 10.5,
    fontWeight: '800',
  },
  estimateCalcTime: {
    color: colors.brand.border,
    fontSize: 11,
    marginTop: 2,
  },
  estimateEmptyMessage: {
    color: colors.brand.softText,
    fontSize: 13.5,
    lineHeight: 19,
  },
  estimateErrorTitle: {
    color: colors.danger.text,
    fontSize: 14,
    fontWeight: '700',
  },
  estimateErrorMessage: {
    color: colors.danger.text,
    fontSize: 13,
  },
  notice: {
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeInfo: {
    backgroundColor: colors.info.background,
  },
  noticeError: {
    backgroundColor: colors.danger.background,
  },
  noticeText: {
    ...typography.caption,
    color: colors.neutral.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  helper: {
    ...typography.caption,
    color: colors.neutral.mutedText,
  },
  footerContainer: {
    gap: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  leaveModalCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: leopardPalette.textSlateDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  leaveModalIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  leaveModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
    textAlign: 'center',
  },
  leaveModalDesc: {
    fontSize: 14,
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: leopardRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnStay: {
    backgroundColor: leopardPalette.bgMuted,
  },
  modalBtnStayText: {
    color: leopardPalette.textSlateDark,
    fontWeight: '700',
    fontSize: 14,
  },
  modalBtnLeave: {
    backgroundColor: colors.danger.border,
  },
  modalBtnLeaveText: {
    color: colors.brand.text,
    fontWeight: '700',
    fontSize: 14,
  },
});
