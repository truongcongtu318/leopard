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

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import {
  IconLocationPin,
  IconVehicleHeavyTruck,
  IconVehicleMotorbike,
  IconVehicleVan,
  IconWarningShield,
} from '../../../ui/icons/CoreIcons';
import { RealInteractiveMap } from '../../../ui/RealInteractiveMap';
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
  {
    value: 'MOTORBIKE',
    label: 'Xe máy',
    desc: 'Bưu phẩm, kiện nhỏ < 20 kg',
    renderIcon: (selected: boolean) => (
      <IconVehicleMotorbike color={selected ? '#0284C7' : '#64748B'} size={30} />
    ),
  },
  {
    value: 'VAN',
    label: 'Xe van',
    desc: 'Hàng đóng thùng, tải trọng vừa',
    renderIcon: (selected: boolean) => (
      <IconVehicleVan color={selected ? '#0284C7' : '#64748B'} size={30} />
    ),
  },
  {
    value: 'TRUCK',
    label: 'Xe tải',
    desc: 'Hàng cồng kềnh, tải trọng lớn',
    renderIcon: (selected: boolean) => (
      <IconVehicleHeavyTruck color={selected ? '#0284C7' : '#64748B'} size={30} />
    ),
  },
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
      size="driver-primary"
      variant="primary"
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
          <View style={styles.stepBadge}>
            <Text style={styles.sectionIndex}>03</Text>
          </View>
          <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
        </View>
        <View style={styles.estimateBoxLoading}>
          <SkeletonBar height={16} width="40%" />
          <SkeletonBar height={34} width="65%" />
          <SkeletonBar height={16} width="50%" />
        </View>
      </View>
    );
  }

  if (estimate.kind === 'error') {
    return (
      <View style={styles.estimatePanel}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.sectionIndex}>03</Text>
          </View>
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
          <View style={styles.stepBadge}>
            <Text style={styles.sectionIndex}>03</Text>
          </View>
          <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
        </View>
        <View style={styles.estimateCardReady}>
          <View style={styles.priceHeaderRow}>
            <Text style={styles.estimateRowLabel}>Giá dự kiến</Text>
            <Text style={styles.estimatePrice}>{estimate.priceLabel}</Text>
          </View>

          <View style={styles.metricsBadgeRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>ETA dự kiến</Text>
              <Text style={styles.metricValue}>
                {Math.round(estimate.durationSeconds / 60)} phút
              </Text>
            </View>

            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Khoảng cách</Text>
              <Text style={styles.metricValue}>{estimate.distanceLabel}</Text>
            </View>
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
        <View style={styles.stepBadge}>
          <Text style={styles.sectionIndex}>03</Text>
        </View>
        <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
      </View>
      <View style={styles.estimateBoxEmpty}>
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

  const isRouteDone = Boolean(view.form.pickup && view.form.dropoff);
  const isEstimateDone = view.estimate.kind === 'ready';

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
          {/* 📍 Stepper Thanh tiến trình tạo đơn */}
          <View style={styles.stepProgressRow}>
            <View style={[styles.stepBar, styles.stepBarActive]}>
              <View style={styles.stepDotActive} />
              <Text style={styles.stepBarText}>1. Lộ trình</Text>
            </View>
            <View style={[styles.stepBar, isRouteDone ? styles.stepBarActive : null]}>
              <View style={isRouteDone ? styles.stepDotActive : styles.stepDotInactive} />
              <Text style={[styles.stepBarText, isRouteDone ? styles.stepBarTextActive : null]}>
                2. Xe & Hàng
              </Text>
            </View>
            <View style={[styles.stepBar, isEstimateDone ? styles.stepBarActive : null]}>
              <View style={isEstimateDone ? styles.stepDotActive : styles.stepDotInactive} />
              <Text style={[styles.stepBarText, isEstimateDone ? styles.stepBarTextActive : null]}>
                3. Báo giá
              </Text>
            </View>
          </View>

          <Notice isAlert={isAlert} message={view.notice} />

          {/* 🛣️ Card 01: Lộ Trình Vận Chuyển */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.sectionIndex}>01</Text>
              </View>
              <Text style={styles.sectionLabel}>LỘ TRÌNH VẬN CHUYỂN</Text>
            </View>

            {/* Sơ đồ lộ trình trực quan */}
            <View style={styles.routeSpineWrap}>
              <RouteSpine
                destination={{ id: 'draft-dropoff', label: view.form.dropoff || 'Chưa chọn' }}
                origin={{ id: 'draft-pickup', label: view.form.pickup || 'Chưa chọn' }}
                stops={routeStops}
              />
            </View>

            {/* 🗺️ Bản đồ lộ trình tương tác */}
            {view.form.pickup || view.form.dropoff ? (
              <View style={styles.interactiveMapContainer}>
                <RealInteractiveMap
                  destination={{ label: view.form.dropoff || 'Điểm giao' }}
                  height={180}
                  mode="route"
                  origin={{ label: view.form.pickup || 'Điểm lấy' }}
                  stops={routeStops}
                  testID="create-order-map-preview"
                />
              </View>
            ) : null}

            {/* Các trường nhập điểm lấy & giao */}
            <View style={styles.inputsBlock}>
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
                  accessibilityLabel="+ Thêm điểm dừng (0–3)"
                  accessibilityRole="button"
                  onPress={onAddStop}
                  style={({ pressed }) => [styles.addStopBtn, pressed ? styles.pressed : null]}
                >
                  <IconLocationPin color="#0284C7" size={16} />
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
          </View>

          {/* 🚚 Card 02: Phương Tiện & Hàng Hóa */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.sectionIndex}>02</Text>
              </View>
              <Text style={styles.sectionLabel}>PHƯƠNG TIỆN & HÀNG HÓA</Text>
            </View>

            {/* Danh sách thẻ phương tiện với Icon trực quan */}
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
                    style={({ pressed }) => [
                      styles.vehicleCard,
                      selected ? styles.vehicleCardSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.vehicleIconBox,
                        selected ? styles.vehicleIconBoxSelected : null,
                      ]}
                    >
                      {option.renderIcon(selected)}
                    </View>

                    <View style={styles.vehicleInfo}>
                      <View style={styles.vehicleHeader}>
                        <Text
                          style={[
                            styles.vehicleTitle,
                            selected ? styles.vehicleTitleSelected : null,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                      <Text style={styles.vehicleDesc}>{option.desc}</Text>
                    </View>

                    <View
                      style={[
                        styles.radioIndicator,
                        selected ? styles.radioIndicatorSelected : null,
                      ]}
                    >
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
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

          {/* 💰 Card 03: Giá & Xác Nhận (EstimatePanel) */}
          <View style={styles.card}>
            <EstimatePanel onRetry={onRetry} view={view} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ⚠️ Cảnh báo rời trang khi đang tạo đơn (Thay emoji hoạt hình bằng vector icon) */}
      <Modal animationType="fade" transparent visible={showLeaveModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.leaveModalCard}>
            <View style={styles.leaveIconBox}>
              <IconWarningShield color="#D97706" size={32} />
            </View>
            <Text style={styles.leaveModalTitle}>Rời khỏi trang tạo đơn?</Text>
            <Text style={styles.leaveModalDesc}>
              Thông tin lộ trình và hàng hóa bạn đã nhập sẽ không được lưu lại.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                accessibilityLabel="Ở lại tiếp tục tạo đơn"
                accessibilityRole="button"
                onPress={() => setShowLeaveModal(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnStay,
                  pressed ? styles.pressed : null,
                ]}
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
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnLeave,
                  pressed ? styles.pressed : null,
                ]}
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
    paddingBottom: spacing.xl,
  },
  stepProgressRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: spacing.xxs,
  },
  stepBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 7,
  },
  stepBarActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  stepDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284C7',
  },
  stepDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  stepBarText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
  },
  stepBarTextActive: {
    color: '#0369A1',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    minWidth: 26,
    paddingHorizontal: 6,
  },
  sectionIndex: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  routeSpineWrap: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  interactiveMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputsBlock: {
    gap: spacing.sm,
  },
  stopField: {
    gap: spacing.xs,
    backgroundColor: '#F8FAFC',
    padding: spacing.xs,
    borderRadius: 8,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addStopBtnText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleGroup: {
    gap: spacing.sm,
  },
  vehicleCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  vehicleCardSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  vehicleIconBox: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  vehicleIconBoxSelected: {
    backgroundColor: '#E0F2FE',
  },
  vehicleInfo: {
    flex: 1,
    gap: 2,
  },
  vehicleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleTitleSelected: {
    color: '#0284C7',
  },
  vehicleDesc: {
    color: '#64748B',
    fontSize: 12.5,
  },
  radioIndicator: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioIndicatorSelected: {
    borderColor: '#0284C7',
  },
  radioDot: {
    backgroundColor: '#0284C7',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  estimatePanel: {
    gap: spacing.sm,
  },
  estimateCardReady: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  estimateRowLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  estimatePrice: {
    color: '#0284C7',
    fontSize: 26,
    fontWeight: '800',
  },
  metricsBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  demoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  estimateCalcTime: {
    color: '#94A3B8',
    fontSize: 11,
  },
  estimateBox: {
    borderRadius: radius.control,
    gap: spacing.xs,
    padding: 16,
  },
  estimateBoxLoading: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.control,
    gap: spacing.sm,
    padding: 16,
  },
  estimateBoxEmpty: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.control,
    padding: 16,
  },
  estimateEmptyMessage: {
    color: '#64748B',
    fontSize: 13.5,
    lineHeight: 19,
  },
  estimateBoxError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  estimateErrorTitle: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  estimateErrorMessage: {
    color: '#DC2626',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  leaveModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  leaveIconBox: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  leaveModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  leaveModalDesc: {
    fontSize: 14,
    color: '#64748B',
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
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnStay: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnStayText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBtnLeave: {
    backgroundColor: '#DC2626',
  },
  modalBtnLeaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});

