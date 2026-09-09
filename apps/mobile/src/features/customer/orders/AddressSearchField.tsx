import { useEffect, useId, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, leopardPalette, radius, spacing, typography, IconLocationPin } from '@leopard/mobile-core';
import type { AddressCandidate } from './model';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

export type AddressSearchFieldProps = Readonly<{
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
  onSelect: (candidate: AddressCandidate) => void;
  search: (query: string) => Promise<readonly AddressCandidate[]>;
  testID?: string;
  onOpenMapModal?: () => void;
  mapActionLabel?: string;
  contactInfoText?: string | null;
  pinColor?: string;
  isStop?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}>;

export function AddressSearchField({
  contactInfoText,
  error,
  isStop,
  label,
  mapActionLabel,
  onChangeText,
  onOpenMapModal,
  onRemove,
  onSelect,
  pinColor = '#0B1E42',
  placeholder,
  removeLabel,
  search,
  testID,
  value,
}: AddressSearchFieldProps) {
  const [results, setResults] = useState<readonly AddressCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const requestIdRef = useRef(0);
  const hasUserTypedRef = useRef(false);
  const fieldId = useId();
  const labelId = `${fieldId}-label`;

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current += 1;
      setResults([]);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    // Do not auto-search or pop open dropdown for prefilled values until user types
    if (!hasUserTypedRef.current) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);

    const timer = setTimeout(() => {
      void search(trimmed).then((candidates) => {
        if (requestIdRef.current !== requestId) return;
        setResults(candidates);
        setIsSearching(false);
        if (hasUserTypedRef.current) {
          setIsOpen(true);
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, search]);

  function handleChangeText(text: string) {
    hasUserTypedRef.current = true;
    onChangeText(text);
  }

  function handleSelect(candidate: AddressCandidate) {
    hasUserTypedRef.current = false;
    onSelect(candidate);
    setIsOpen(false);
    setResults([]);
  }

  const isDropoff = pinColor === '#DC2626';

  return (
    <View style={styles.container}>
      {/* Route Input Wrapper: Nhấn vào bất kỳ đâu trên ô để mở modal bản đồ nếu có onOpenMapModal */}
      <Pressable
        disabled={!onOpenMapModal}
        onPress={onOpenMapModal}
        style={({ pressed }) => [
          styles.routeInputWrapper,
          isFocused && styles.routeInputWrapperFocused,
          error ? styles.routeInputWrapperError : null,
          onOpenMapModal && pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.inputInnerColumn}>
          {/* Header trong ô nhập: Nhãn uppercase + Badge liên hệ / Nút xóa điểm dừng */}
          <View style={styles.locationFieldHeader}>
            <Text style={styles.locationFieldLabel}>{label}</Text>

            {contactInfoText ? (
              <Pressable
                accessibilityLabel={`Người liên hệ: ${contactInfoText}`}
                hitSlop={4}
                onPress={onOpenMapModal}
                style={[
                  styles.contactBadge,
                  isDropoff ? styles.contactBadgeDropoff : styles.contactBadgePickup,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.contactBadgeText,
                    isDropoff ? styles.contactBadgeTextDropoff : styles.contactBadgeTextPickup,
                  ]}
                >
                  {contactInfoText}
                </Text>
              </Pressable>
            ) : null}

            {isStop && onRemove ? (
              <Pressable
                accessibilityLabel={removeLabel || `Xóa ${label.toLowerCase()}`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={onRemove}
                style={styles.removeStopInlineBtn}
              >
                <Text style={styles.removeStopInlineBtnText}>✕ Xóa</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Ô nhập text địa chỉ */}
          <TextInput
            accessibilityHint={error || undefined}
            accessibilityLabel={label}
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setIsOpen(false), 200);
            }}
            onChangeText={handleChangeText}
            onFocus={() => {
              if (!onOpenMapModal) {
                setIsFocused(true);
                if (results.length > 0 && hasUserTypedRef.current) setIsOpen(true);
              }
            }}
            placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
            placeholderTextColor="#94A3B8"
            pointerEvents={onOpenMapModal ? 'none' : 'auto'}
            showSoftInputOnFocus={!onOpenMapModal}
            style={[
              styles.locationTextInput,
              !value ? styles.locationTextInputPlaceholder : null,
            ]}
            testID={testID}
            value={value}
          />
        </View>

        {/* Nút xóa nhanh nội dung text khi đã có chữ */}
        {value.length > 0 ? (
          <Pressable
            accessibilityLabel={`Xóa nội dung ${label.toLowerCase()}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              hasUserTypedRef.current = false;
              onChangeText('');
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        ) : null}

        {/* Nút mở bản đồ ghim vị trí chuẩn như Home */}
        {onOpenMapModal ? (
          <Pressable
            accessibilityLabel={mapActionLabel || `Mở bản đồ chọn ${label.toLowerCase()}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onOpenMapModal}
            style={[
              styles.inputMapPinBtn,
              isDropoff ? styles.inputMapPinBtnDropoff : styles.inputMapPinBtnPickup,
            ]}
          >
            <IconLocationPin color={pinColor} size={16} />
          </Pressable>
        ) : null}
      </Pressable>

      {/* Thông báo lỗi validation nếu có */}
      {error ? (
        <View style={styles.errorArea} testID="field-error-area">
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        </View>
      ) : null}

      {/* Trạng thái đang tìm kiếm */}
      {isSearching ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={leopardPalette.primary} size="small" />
          <Text style={styles.statusText}>Đang tìm địa chỉ...</Text>
        </View>
      ) : null}

      {/* Dropdown danh sách gợi ý địa chỉ chuẩn như Home */}
      {isOpen && results.length > 0 ? (
        <View style={styles.dropdown} testID={testID ? `${testID}-results` : undefined}>
          {results.map((candidate) => (
            <Pressable
              accessibilityLabel={candidate.label}
              accessibilityRole="button"
              key={candidate.placeId}
              onPress={() => handleSelect(candidate)}
              style={({ pressed }) => [styles.resultRow, pressed ? styles.resultRowPressed : null]}
            >
              <View style={styles.resultIconWrap}>
                <IconLocationPin color="#0B1E42" size={14} />
              </View>
              <View style={styles.resultTextCol}>
                <Text numberOfLines={1} style={styles.resultLabel}>
                  {candidate.label}
                </Text>
                {candidate.address ? (
                  <Text numberOfLines={1} style={styles.resultAddress}>
                    {candidate.address}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: 2,
  },
  routeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 52,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  routeInputWrapperFocused: {
    borderColor: '#0B1E42',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  routeInputWrapperError: {
    borderColor: colors.danger.border,
    backgroundColor: '#FEF2F2',
  },
  inputInnerColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  locationFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  locationFieldLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  contactBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: '65%',
  },
  contactBadgePickup: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  contactBadgeDropoff: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  contactBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  contactBadgeTextPickup: {
    color: '#15803D',
  },
  contactBadgeTextDropoff: {
    color: '#B91C1C',
  },
  removeStopInlineBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  removeStopInlineBtnText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  locationTextInput: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '600',
    padding: 0,
    marginTop: 1,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  locationTextInputPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 13,
  },
  inputMapPinBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  inputMapPinBtnPickup: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
  },
  inputMapPinBtnDropoff: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  errorArea: {
    minHeight: 16,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  error: {
    ...typography.caption,
    color: colors.danger.text,
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 2,
  },
  statusText: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 50,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  resultRowPressed: {
    backgroundColor: '#F0F4F9',
  },
  resultIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextCol: {
    flex: 1,
    gap: 2,
  },
  resultLabel: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  resultAddress: {
    fontSize: 11.5,
    color: '#64748B',
  },
  pressed: {
    opacity: 0.85,
  },
});
