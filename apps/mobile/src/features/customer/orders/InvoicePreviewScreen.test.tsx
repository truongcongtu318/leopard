import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="invoice-webview" {...props} /> };
});

import { InvoicePreviewScreen } from './InvoicePreviewScreen';

describe('InvoicePreviewScreen', () => {
  it('renders a WebView pointed at the download endpoint with an Authorization header', async () => {
    await render(<InvoicePreviewScreen invoiceId="invoice-1" onBack={jest.fn()} />);

    const webview = screen.getByTestId('invoice-webview');
    expect(webview.props.source.uri).toContain('/invoices/invoice-1/download');
  });

  it('opens the resolved signed URL in the external browser via the fallback button', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const resolveUrl = jest.fn(async () => 'https://signed.example/invoice-1.pdf');

    await render(
      <InvoicePreviewScreen invoiceId="invoice-1" onBack={jest.fn()} resolveDownloadUrl={resolveUrl} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Mở trong trình duyệt' }));

    await waitFor(() => expect(openURLSpy).toHaveBeenCalledWith('https://signed.example/invoice-1.pdf'));
    openURLSpy.mockRestore();
  });

  it('calls onBack when the back button is pressed', async () => {
    const onBack = jest.fn();
    await render(<InvoicePreviewScreen invoiceId="invoice-1" onBack={onBack} />);

    fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('renders VAT 8% invoice compliance layout with QR check and download PDF button', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const resolveUrl = jest.fn(async () => 'https://signed.example/invoice-1.pdf');

    await render(
      <InvoicePreviewScreen
        invoiceId="invoice-1"
        onBack={jest.fn()}
        resolveDownloadUrl={resolveUrl}
      />,
    );

    expect(screen.getByText('Hóa đơn điện tử VAT (Thuế suất 8%)')).toBeTruthy();
    expect(screen.getByText('Cục Thuế TP. Hồ Chí Minh · Tra cứu mã QR')).toBeTruthy();
    expect(screen.getByLabelText('Tra cứu mã QR hóa đơn')).toBeTruthy();

    const downloadBtn = screen.getByLabelText('Tải hóa đơn VAT PDF');
    fireEvent.press(downloadBtn);

    await waitFor(() => expect(openURLSpy).toHaveBeenCalledWith('https://signed.example/invoice-1.pdf'));
    openURLSpy.mockRestore();
  });
});
