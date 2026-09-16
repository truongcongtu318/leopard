import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from './DriverLoginScreen.styles';
import {
  IconCheck,
  iconSize,
  OtpPhoneHeroIcon,
  OtpSixCellInput,
  toE164Vn,
  TruckLoader,
} from '@leopard/mobile-core';

export type DriverOtpModalProps = Readonly<{
  otpCode: string;
  phone?: string;
  isSubmitting: boolean;
  errorMsg: string | null;
  resendSeconds: number;
  isVerified: boolean;
  resendSuccessMsg?: string | null;
  onChangeCode: (code: string) => void;
  onVerify: (code?: string) => void;
  onResend: () => void;
  onClose: () => void;
}>;

export function DriverOtpModal({
  otpCode,
  phone = '',
  isSubmitting,
  errorMsg,
  resendSeconds,
  isVerified,
  resendSuccessMsg = null,
  onChangeCode,
  onVerify,
  onResend,
  onClose,
}: DriverOtpModalProps) {
  return (
    <View style={styles.otpModalOverlay}>
      <Pressable
        accessibilityLabel="Đóng modal xác thực"
        onPress={onClose}
        style={styles.otpBackdrop}
      />

      <View style={styles.otpModalCard}>
        <View style={styles.otpHeaderNav}>
          <Pressable
            accessibilityLabel="Đổi số điện thoại"
            accessibilityRole="button"
            disabled={isSubmitting}
            hitSlop={12}
            onPress={onClose}
            style={styles.otpNavBack}
          >
            <Text style={styles.otpNavBackText}>← Quay lại</Text>
          </Pressable>
          <Text style={styles.otpNavStatus}>Bảo mật 2 lớp</Text>
        </View>

        <View style={styles.otpCenterHero}>
          <View style={[styles.otpBadge, isVerified ? styles.otpBadgeSuccess : null]}>
            <OtpPhoneHeroIcon isVerified={isVerified} size={36} />
          </View>
          <Text style={styles.otpModalTitle}>
            {isVerified ? 'Xác thực thành công' : 'Nhập mã xác nhận OTP'}
          </Text>
          <Text style={styles.otpModalDesc}>
            {isVerified
              ? `Số điện thoại ${toE164Vn(phone)} đã được xác minh.`
              : 'Nhập mã 6 chữ số đã gửi tới số điện thoại '}
            {!isVerified ? <Text style={styles.phoneHighlight}>{toE164Vn(phone)}</Text> : null}
          </Text>
        </View>

        <OtpSixCellInput
          autoFocus
          editable={!isSubmitting && !isVerified}
          hasError={Boolean(errorMsg)}
          isSubmitting={isSubmitting}
          onChangeText={(text) => {
            onChangeCode(text);
          }}
          onComplete={(code) => {
            onVerify(code);
          }}
          value={otpCode}
        />

        {isSubmitting ? (
          <View style={styles.verifyingWrap}>
            <TruckLoader showRoad={true} showText={false} size="sm" />
            <Text style={styles.verifyingText}>Đang xác nhận mã OTP...</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={styles.otpErrorBox} testID="otp-error-banner">
            <Text accessibilityRole="alert" style={styles.otpErrorText}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {resendSuccessMsg ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.otpSuccessBox}
          >
            <IconCheck color="#167A3A" size={iconSize.sm} />
            <Text style={styles.otpSuccessText}>{resendSuccessMsg}</Text>
          </View>
        ) : null}

        {!isVerified ? (
          <View style={styles.otpFooter}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || resendSeconds > 0}
              onPress={onResend}
              style={styles.resendBtn}
            >
              <Text
                style={[
                  styles.resendBtnText,
                  resendSeconds > 0 ? styles.resendBtnDisabledText : null,
                ]}
              >
                {resendSeconds > 0 ? `Gửi lại mã sau (${resendSeconds}s)` : 'Gửi lại mã OTP'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
