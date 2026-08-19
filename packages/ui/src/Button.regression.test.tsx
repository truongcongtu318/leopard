import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { Button } from './Button';

describe('Button native control regressions', () => {
  it('honors native disabled and blocks both callback APIs', () => {
    const onPress = jest.fn();
    const onClick = jest.fn();

    render(
      <Button disabled onPress={onPress} onClick={onClick}>
        Thao tác bị khóa
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Thao tác bị khóa' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stops control transitions and spinner animation for reduced motion', () => {
    render(<Button isLoading>Đang xử lý</Button>);

    const button = screen.getByRole('button', { name: 'Đang xử lý' });
    const spinner = button.querySelector('[role="status"]');

    expect(button).toHaveClass('motion-reduce:transition-none');
    expect(spinner).toHaveClass('motion-reduce:animate-none');
  });

  it('uses semantic secondary hover styling without a raw gray utility', () => {
    render(<Button variant="secondary">Xem chi tiết</Button>);

    const button = screen.getByRole('button', { name: 'Xem chi tiết' });
    expect(button).toHaveClass('hover:brightness-95');
    expect(button).not.toHaveClass('hover:bg-gray-200');
  });
});
