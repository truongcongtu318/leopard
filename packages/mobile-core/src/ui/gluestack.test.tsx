import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Card,
  Badge,
  Input,
  Divider,
  Avatar,
  Progress,
  Spinner,
  Switch,
  Modal,
  Actionsheet,
  Textarea,
  Checkbox,
  RadioGroup,
  Radio,
  Alert,
  Toast,
} from './gluestack';

describe('Gluestack UI Core Components Suite', () => {
  it('renders Box with spacing and layout correctly', async () => {
    const screen = await render(
      <Box testID="test-box" p="md" m="sm" bg="#FFFFFF" rounded="card" />
    );
    const box = screen.getByTestId('test-box');
    expect(box).toBeTruthy();
    const flatStyle = StyleSheet.flatten(box.props.style);
    expect(flatStyle.padding).toBe(16);
    expect(flatStyle.margin).toBe(12);
    expect(flatStyle.backgroundColor).toBe('#FFFFFF');
    expect(flatStyle.borderRadius).toBe(14);
    await screen.unmount();
  });

  it('renders VStack and HStack with gap tokens', async () => {
    const screen = await render(
      <VStack testID="test-vstack" space="md">
        <HStack testID="test-hstack" space="xs">
          <Box testID="child-1" />
        </HStack>
      </VStack>
    );
    const vstack = screen.getByTestId('test-vstack');
    const hstack = screen.getByTestId('test-hstack');
    expect(StyleSheet.flatten(vstack.props.style).gap).toBe(16);
    expect(StyleSheet.flatten(hstack.props.style).gap).toBe(8);
    await screen.unmount();
  });

  it('renders Card with elevated variant and Apple HIG continuous curve', async () => {
    const screen = await render(
      <Card testID="test-card" variant="elevated" size="md" />
    );
    const card = screen.getByTestId('test-card');
    expect(card).toBeTruthy();
    const flatStyle = StyleSheet.flatten(card.props.style);
    expect(flatStyle.borderRadius).toBe(14);
    expect(flatStyle.borderCurve).toBe('continuous');
    await screen.unmount();
  });

  it('renders Badge with text and status action', async () => {
    const screen = await render(
      <Badge action="success" variant="solid">
        <Badge.Text>Hoàn thành</Badge.Text>
      </Badge>
    );
    expect(screen.getByText('Hoàn thành')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Input compound component correctly', async () => {
    const screen = await render(
      <Input size="md">
        <Input.Field placeholder="Nhập địa chỉ" />
      </Input>
    );
    expect(screen.getByPlaceholderText('Nhập địa chỉ')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Divider horizontally and vertically', async () => {
    const screen = await render(
      <Box>
        <Divider testID="divider-h" orientation="horizontal" />
        <Divider testID="divider-v" orientation="vertical" />
      </Box>
    );
    const divH = screen.getByTestId('divider-h');
    const divV = screen.getByTestId('divider-v');
    expect(StyleSheet.flatten(divH.props.style).width).toBe('100%');
    expect(StyleSheet.flatten(divV.props.style).height).toBe('100%');
    await screen.unmount();
  });

  it('renders Avatar with fallback text and online badge', async () => {
    const screen = await render(
      <Avatar size="md">
        <Avatar.FallbackText>TX</Avatar.FallbackText>
        <Avatar.Badge action="success" testID="avatar-badge" />
      </Avatar>
    );
    expect(screen.getByText('TX')).toBeTruthy();
    expect(screen.getByTestId('avatar-badge')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Progress with filled track percentage', async () => {
    const screen = await render(
      <Progress value={65} size="md">
        <Progress.FilledTrack testID="progress-track" />
      </Progress>
    );
    const track = screen.getByTestId('progress-track');
    expect(StyleSheet.flatten(track.props.style).width).toBe('65%');
    await screen.unmount();
  });

  it('renders Spinner with activity indicator', async () => {
    const screen = await render(<Spinner testID="spinner" />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Switch toggle', async () => {
    const screen = await render(<Switch value={true} testID="switch-toggle" />);
    expect(screen.getByTestId('switch-toggle')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Modal open with title and content', async () => {
    const screen = await render(
      <Modal isOpen={true} onClose={() => {}}>
        <Modal.Backdrop />
        <Modal.Content>
          <Modal.Header>
            <Text>Tiêu đề Modal</Text>
          </Modal.Header>
          <Modal.Body>
            <Text>Nội dung Modal</Text>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
    expect(screen.getByText('Tiêu đề Modal')).toBeTruthy();
    expect(screen.getByText('Nội dung Modal')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Actionsheet open with item options', async () => {
    const screen = await render(
      <Actionsheet isOpen={true} onClose={() => {}}>
        <Actionsheet.Backdrop />
        <Actionsheet.Content>
          <Actionsheet.Item>
            <Actionsheet.ItemText>Tuỳ chọn 1</Actionsheet.ItemText>
          </Actionsheet.Item>
        </Actionsheet.Content>
      </Actionsheet>
    );
    expect(screen.getByText('Tuỳ chọn 1')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Textarea with input field', async () => {
    const screen = await render(
      <Textarea>
        <Textarea.Input placeholder="Ghi chú thêm" />
      </Textarea>
    );
    expect(screen.getByPlaceholderText('Ghi chú thêm')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Checkbox with label and checks', async () => {
    const screen = await render(
      <Checkbox isChecked={true} value="opt1">
        <Checkbox.Indicator />
        <Checkbox.Label>Bốc xếp hàng hoá</Checkbox.Label>
      </Checkbox>
    );
    expect(screen.getByText('Bốc xếp hàng hoá')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Radio group with options', async () => {
    const screen = await render(
      <RadioGroup value="bank">
        <Radio value="cash">
          <Radio.Label>Tiền mặt</Radio.Label>
        </Radio>
        <Radio value="bank">
          <Radio.Label>Chuyển khoản</Radio.Label>
        </Radio>
      </RadioGroup>
    );
    expect(screen.getByText('Tiền mặt')).toBeTruthy();
    expect(screen.getByText('Chuyển khoản')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Alert and Toast messages', async () => {
    const screen = await render(
      <Box>
        <Alert action="warning">
          <Alert.Text>Cảnh báo đường cấm</Alert.Text>
        </Alert>
        <Toast action="success">
          <Toast.Title>Hoàn thành</Toast.Title>
          <Toast.Description>Đã gửi yêu cầu rút tiền</Toast.Description>
        </Toast>
      </Box>
    );
    expect(screen.getByText('Cảnh báo đường cấm')).toBeTruthy();
    expect(screen.getByText('Hoàn thành')).toBeTruthy();
    expect(screen.getByText('Đã gửi yêu cầu rút tiền')).toBeTruthy();
    await screen.unmount();
  });
});
