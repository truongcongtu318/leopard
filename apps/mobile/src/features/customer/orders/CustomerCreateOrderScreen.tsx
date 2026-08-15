import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, control, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { EtaIndicator } from '../../../ui/EtaIndicator';
import { FormField } from '../../../ui/FormField';
import { RouteSpine } from '../../../ui/RouteSpine';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import type { CustomerActionView, CustomerCreateFormScreenView, CustomerCreateView } from './model';

export type CustomerCreateOrderScreenProps = Readonly<{
  view: CustomerCreateView;
  onFieldChange?: (field: string, value: string) => void;
  onAddStop?: () => void;
  onRemoveStop?: (stopId: string) => void;
  onSelectVehicle?: (vehicle: 'MOTORBIKE' | 'VAN' | 'TRUCK') => void;
  onPrimaryAction?: (actionId: string) => void;
  onRetry?: () => void;
}>;

const vehicleOptions = [
  { value: 'MOTORBIKE', label: 'Xe máy' },
  { value: 'VAN', label: 'Xe van' },
  { value: 'TRUCK', label: 'Xe tải' },
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
  view,
  onRetry,
}: Readonly<{ view: CustomerCreateFormScreenView; onRetry?: () => void }>) {
  const estimate = view.estimate;
  if (estimate.kind === 'ready') {
    return (
      <View style={styles.section}>
        <SectionHeading
          description={`Khoảng cách ${estimate.distanceLabel} · tính lúc ${estimate.calculatedAtLabel}`}
          title="Giá và thời gian"
        />
        <View style={styles.priceRow}>
          <Text style={styles.fieldLabel}>Giá dự kiến</Text>
          <Text style={styles.price}>{estimate.priceLabel}</Text>
        </View>
        <EtaIndicator durationSeconds={estimate.durationSeconds} source={estimate.source} />
      </View>
    );
  }
  if (estimate.kind === 'loading') {
    return <EtaIndicator durationSeconds={null} isLoading source={estimate.source} />;
  }
  if (estimate.kind === 'error') {
    return (
      <EtaIndicator
        durationSeconds={null}
        error={estimate.message}
        onRetry={onRetry}
        source={estimate.source}
      />
    );
  }
  const message =
    estimate.kind === 'expired'
      ? 'Estimate đã hết hiệu lực; hãy tính lại giá và ETA dự kiến.'
      : estimate.kind === 'outdated'
        ? 'Lộ trình đã thay đổi; estimate cũ không còn dùng được.'
        : 'Hoàn tất lộ trình để tính giá và ETA dự kiến.';
  return (
    <View style={styles.estimatePlaceholder}>
      <Text style={styles.body}>{message}</Text>
    </View>
  );
}

function Notice({ message, isAlert }: Readonly<{ message: string | null; isAlert: boolean }>) {
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, isAlert ? styles.noticeError : styles.noticeInfo]}
    >
      <Text accessibilityRole={isAlert ? 'alert' : undefined} style={styles.body}>
        {message}
      </Text>
    </View>
  );
}

export function CustomerCreateOrderScreen({
  view,
  onFieldChange,
  onAddStop,
  onRemoveStop,
  onSelectVehicle,
  onPrimaryAction,
  onRetry,
}: CustomerCreateOrderScreenProps) {
  if (view.kind === 'permission-denied') {
    return (
      <ScreenScaffold title="Tạo đơn">
        <ScreenState message={view.message} state="permission-denied" title={view.title} />
      </ScreenScaffold>
    );
  }

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
      subtitle="Nhập lộ trình trước, sau đó xác nhận giá và ETA dự kiến."
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
          <Notice isAlert={isAlert} message={view.notice} />
          <View style={styles.section}>
            <SectionHeading
              description="Theo thứ tự điểm lấy, tối đa ba điểm dừng và điểm giao."
              title="Lộ trình"
            />
            <RouteSpine
              destination={{ id: 'draft-dropoff', label: view.form.dropoff || 'Chưa chọn' }}
              origin={{ id: 'draft-pickup', label: view.form.pickup || 'Chưa chọn' }}
              stops={routeStops}
            />
            <FormField
              error={view.form.fieldErrors.pickup}
              label="Điểm lấy hàng"
              onChangeText={onFieldChange ? (value) => onFieldChange('pickup', value) : undefined}
              placeholder="Nhập địa chỉ lấy hàng"
              value={view.form.pickup}
            />
            {view.form.stops.map((stop, index) => (
              <View key={stop.id} style={styles.stopField}>
                <FormField
                  label={`Điểm dừng ${index + 1}`}
                  onChangeText={
                    onFieldChange ? (value) => onFieldChange(`stop:${stop.id}`, value) : undefined
                  }
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
              <Button label="Thêm điểm dừng" onPress={onAddStop} variant="secondary" />
            ) : (
              <Text style={styles.helper}>Đã đạt tối đa 3 điểm dừng.</Text>
            )}
            <FormField
              error={view.form.fieldErrors.dropoff}
              label="Điểm giao hàng"
              onChangeText={onFieldChange ? (value) => onFieldChange('dropoff', value) : undefined}
              placeholder="Nhập địa chỉ giao hàng"
              value={view.form.dropoff}
            />
          </View>

          <View style={styles.section}>
            <SectionHeading title="Phương tiện và hàng hóa" />
            <View accessibilityRole="radiogroup" style={styles.vehicleOptions}>
              {vehicleOptions.map((option) => {
                const selected = view.form.vehicleType === option.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={option.value}
                    onPress={onSelectVehicle ? () => onSelectVehicle(option.value) : undefined}
                    style={[styles.vehicleOption, selected ? styles.vehicleOptionSelected : null]}
                  >
                    <Text style={styles.vehicleLabel}>{option.label}</Text>
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
              value={view.form.cargoNote}
            />
            <Text style={styles.helper}>Ảnh hàng hóa: JPEG, PNG hoặc WebP; tối đa 10 MB.</Text>
          </View>

          <EstimatePanel onRetry={onRetry} view={view} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  stopField: {
    gap: spacing.xs,
  },
  vehicleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  vehicleOption: {
    alignItems: 'center',
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: control.minimumTouchHeight,
    paddingHorizontal: spacing.md,
  },
  vehicleOptionSelected: {
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.background,
  },
  vehicleLabel: {
    ...typography.label,
    color: colors.neutral.text,
  },
  estimatePlaceholder: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  priceRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...typography.label,
    color: colors.neutral.mutedText,
  },
  price: {
    ...typography.sectionTitle,
    color: colors.neutral.text,
  },
  notice: {
    borderLeftWidth: 4,
    padding: spacing.sm,
  },
  noticeInfo: {
    backgroundColor: colors.info.background,
    borderLeftColor: colors.info.border,
  },
  noticeError: {
    backgroundColor: colors.danger.background,
    borderLeftColor: colors.danger.border,
  },
  body: {
    ...typography.body,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  helper: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
});
