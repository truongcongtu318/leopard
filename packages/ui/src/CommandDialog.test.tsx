import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { CommandDialog, type CommandDialogProps, type CommandDialogState } from './CommandDialog';

const privateTarget = [
  { id: 'order', label: 'Đơn hàng', value: 'LP-PRIVATE-001' },
  { id: 'customer', label: 'Khách hàng', value: 'Khách hàng riêng tư' },
] as const;

const baseProps = {
  isOpen: true,
  state: 'idle',
  title: 'Hủy đơn LP-PRIVATE-001',
  commandLabel: 'Hủy đơn hàng',
  targetItems: privateTarget,
  consequence: 'Đơn hàng sẽ không thể tiếp tục vận chuyển.',
  reasonLabel: 'Lý do hủy',
  reasonValue: '',
  reasonPolicy: {
    required: true,
    minLength: 5,
    maxLength: 500,
    hint: 'Nhập từ 5 đến 500 ký tự.',
  },
  onReasonChange: () => {},
  onSubmit: () => {},
  onClose: () => {},
} satisfies CommandDialogProps;

function renderDialog(overrides: Partial<CommandDialogProps> = {}) {
  return render(<CommandDialog {...baseProps} {...overrides} />);
}

describe('CommandDialog', () => {
  it('does not mount dialog content while closed', () => {
    renderDialog({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('LP-PRIVATE-001')).not.toBeInTheDocument();
  });

  it('opens with labelled modal semantics and focuses the heading first', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', {
      name: 'Hủy đơn LP-PRIVATE-001',
    });
    const heading = screen.getByRole('heading', {
      name: 'Hủy đơn LP-PRIVATE-001',
    });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(heading).toHaveFocus();
    expect(screen.getByText('Đơn hàng sẽ không thể tiếp tục vận chuyển.')).toBeInTheDocument();
  });

  it('uses an explicit dialog max width that cannot collide with the xl spacing token', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('max-w-[36rem]');
    expect(dialog).not.toHaveClass('max-w-xl');
  });

  it('connects the visible reason label, hint, count and invalid feedback', () => {
    renderDialog({
      state: 'invalid',
      reasonValue: 'abc',
      reasonError: 'Lý do phải có ít nhất 5 ký tự.',
    });

    const textarea = screen.getByRole('textbox', { name: /Lý do hủy/ });
    const describedBy = textarea.getAttribute('aria-describedby') ?? '';

    expect(textarea).toHaveAttribute('aria-required', 'true');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('maxlength', '500');
    expect(describedBy.split(' ')).toHaveLength(3);
    expect(screen.getByText('Nhập từ 5 đến 500 ký tự.')).toBeInTheDocument();
    expect(screen.getByText('3/500 ký tự')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Lý do phải có ít nhất 5 ký tự.');
    expect(textarea).toHaveFocus();
  });

  it('validates the supplied reason policy before invoking the callback', () => {
    const onSubmit = jest.fn();
    renderDialog({ reasonValue: 'abc', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn hàng' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /Lý do hủy/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('Lý do hủy phải có ít nhất 5 ký tự.')).toBeInTheDocument();
  });

  it('submits only the current reason through the callback', () => {
    const onSubmit = jest.fn();
    renderDialog({ reasonValue: 'Địa chỉ nhận không còn hợp lệ', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Hủy đơn hàng' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Địa chỉ nhận không còn hợp lệ');
  });

  it('uses a non-destructive primary action when the command requests it', () => {
    renderDialog({
      commandLabel: 'Kích hoạt lại người dùng',
      commandVariant: 'primary',
      reasonValue: 'Đã xác minh yêu cầu kích hoạt lại',
    });

    const command = screen.getByRole('button', { name: 'Kích hoạt lại người dùng' });
    expect(command).toHaveClass('bg-brand');
    expect(command).not.toHaveClass('bg-danger');
  });

  it('blocks duplicate submission and Escape while pending', () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    renderDialog({
      state: 'pending',
      reasonValue: 'Địa chỉ nhận không còn hợp lệ',
      onClose,
      onSubmit,
    });

    const dialog = screen.getByRole('dialog');
    const pendingButton = screen.getByRole('button', { name: 'Đang xử lý…' });

    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(pendingButton);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Đang xử lý yêu cầu');
  });

  it('preserves the reason and focuses a safe error summary', () => {
    renderDialog({
      state: 'error',
      reasonValue: 'Địa chỉ nhận không còn hợp lệ',
      message: 'Không thể hoàn tất thao tác. Mã yêu cầu req-demo-001.',
    });

    expect(screen.getByRole('textbox', { name: /Lý do hủy/ })).toHaveValue(
      'Địa chỉ nhận không còn hợp lệ',
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Không thể hoàn tất thao tác');
    expect(error).toHaveFocus();
  });

  it('disables stale input and exposes only the canonical conflict recovery', () => {
    const onResolveConflict = jest.fn();
    const onClose = jest.fn();
    renderDialog({
      state: 'conflict',
      message: 'Dữ liệu đã thay đổi trong khi bạn thao tác.',
      onResolveConflict,
      onClose,
    });

    expect(screen.queryByRole('textbox', { name: /Lý do hủy/ })).not.toBeInTheDocument();
    const recovery = screen.getByRole('button', {
      name: 'Tải dữ liệu mới nhất',
    });
    fireEvent.click(recovery);
    expect(onResolveConflict).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('announces persisted success without remounting the reason field', () => {
    renderDialog({
      state: 'success',
      message: 'Đã hủy đơn hàng lúc 14:35, 15/08/2026.',
      reasonValue: 'Nội dung vận hành nhạy cảm',
    });

    expect(screen.getByRole('status')).toHaveTextContent('Đã hủy đơn hàng lúc 14:35, 15/08/2026.');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thao tác đã hoàn tất' })).toHaveFocus();
  });

  it.each(['permission-denied', 'session-expired'] as const)(
    'scrubs private target, title, consequence and reason for %s',
    (state: CommandDialogState) => {
      renderDialog({
        state,
        reasonValue: 'Nội dung vận hành nhạy cảm',
        message: 'LP-PRIVATE-001 không còn được phép thao tác.',
      });

      expect(screen.queryByText('Hủy đơn LP-PRIVATE-001')).not.toBeInTheDocument();
      expect(screen.queryByText('LP-PRIVATE-001')).not.toBeInTheDocument();
      expect(screen.queryByText('Khách hàng riêng tư')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Đơn hàng sẽ không thể tiếp tục vận chuyển.'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Nội dung vận hành nhạy cảm')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    },
  );

  it('traps Tab and Shift+Tab inside the dialog', () => {
    renderDialog({ reasonValue: 'Địa chỉ nhận không còn hợp lệ' });

    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', {
      name: 'Hủy đơn LP-PRIVATE-001',
    });
    const textarea = screen.getByRole('textbox', { name: /Lý do hủy/ });
    const command = screen.getByRole('button', { name: 'Hủy đơn hàng' });

    expect(heading).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(textarea).toHaveFocus();

    command.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(textarea).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(command).toHaveFocus();
  });

  it('closes with safe Escape and restores focus to the trigger', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Mở hủy đơn
          </button>
          <CommandDialog
            {...baseProps}
            isOpen={open}
            reasonValue="Địa chỉ nhận không còn hợp lệ"
            onClose={() => setOpen(false)}
          />
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Mở hủy đơn' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('restores the fallback when the original trigger no longer exists', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      const [showTrigger, setShowTrigger] = React.useState(true);
      const fallbackRef = React.useRef<HTMLHeadingElement>(null);

      return (
        <>
          <h1 ref={fallbackRef} tabIndex={-1}>
            Kết quả đơn hàng
          </h1>
          {showTrigger ? (
            <button type="button" onClick={() => setOpen(true)}>
              Mở kết quả
            </button>
          ) : null}
          <CommandDialog
            {...baseProps}
            isOpen={open}
            state="success"
            fallbackFocusRef={fallbackRef}
            onClose={() => {
              setShowTrigger(false);
              setOpen(false);
            }}
          />
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Mở kết quả' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));

    expect(screen.getByRole('heading', { name: 'Kết quả đơn hàng' })).toHaveFocus();
  });
});
