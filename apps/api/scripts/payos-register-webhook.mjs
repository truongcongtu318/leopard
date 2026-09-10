#!/usr/bin/env node

/**
 * Script CLI hỗ trợ đăng ký & xác nhận Webhook URL với payOS.
 *
 * payOS yêu cầu Webhook URL phải là HTTPS công khai và sẽ gửi 1 request test
 * đến URL này để kiểm tra (endpoint phải trả về 200 OK) trước khi lưu.
 *
 * Cách sử dụng khi test local (ví dụ dùng ngrok):
 *   1. Chạy ngrok: ngrok http 3000
 *   2. Chạy lệnh: node scripts/payos-register-webhook.mjs https://<ngrok-id>.ngrok-free.app/api/v1/payments/webhook/payos
 */

import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PayOS } from '@payos/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const envFilePath = path.resolve(__dirname, '../.env');
const fileEnv = loadEnvFile(envFilePath);

const clientId = process.env.PAYOS_CLIENT_ID || fileEnv.PAYOS_CLIENT_ID;
const apiKey = process.env.PAYOS_API_KEY || fileEnv.PAYOS_API_KEY;
const checksumKey = process.env.PAYOS_CHECKSUM_KEY || fileEnv.PAYOS_CHECKSUM_KEY;

if (!clientId || !apiKey || !checksumKey) {
  console.error('[payOS] Lỗi: Thiếu PAYOS_CLIENT_ID, PAYOS_API_KEY hoặc PAYOS_CHECKSUM_KEY trong .env');
  process.exit(1);
}

const webhookUrl = process.argv[2]?.trim();

if (!webhookUrl) {
  console.log('Cách sử dụng:');
  console.log('  node scripts/payos-register-webhook.mjs <WEBHOOK_URL>');
  console.log('');
  console.log('Ví dụ:');
  console.log('  node scripts/payos-register-webhook.mjs https://abc12345.ngrok-free.app/api/v1/payments/webhook/payos');
  process.exit(1);
}

if (!webhookUrl.startsWith('https://')) {
  console.error('[payOS] Cảnh báo: payOS yêu cầu Webhook URL phải có giao thức https://');
}

console.log(`[payOS] Đang xác thực Webhook URL với payOS: ${webhookUrl}...`);

const payos = new PayOS({
  clientId,
  apiKey,
  checksumKey,
});

try {
  const result = await payos.webhooks.confirm(webhookUrl);
  console.log(' [payOS] Đăng ký Webhook thành công!');
  if (result) {
    console.log('Kết quả từ payOS:', JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error('❌ [payOS] Đăng ký Webhook thất bại:');
  console.error(error?.message || error);
  console.log('\nLưu ý:');
  console.log('1. Đảm bảo server LEOPARD API đang chạy và route /api/v1/payments/webhook/payos phản hồi 200.');
  console.log('2. Đảm bảo ngrok / tunnel đang trỏ đúng vào port của API (mặc định 3000).');
  process.exit(1);
}
