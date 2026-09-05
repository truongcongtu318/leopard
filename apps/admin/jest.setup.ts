import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream, TransformStream, WritableStream } from "node:stream/web";
import { randomUUID } from "node:crypto";

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: randomUUID,
    writable: true,
    configurable: true,
  });
}

Object.assign(globalThis, {
  ReadableStream,
  TextDecoder,
  TextEncoder,
  TransformStream,
  WritableStream,
});

const {
  File,
  FormData,
  Headers,
  Request,
  Response,
} = require("next/dist/compiled/@edge-runtime/primitives/fetch") as typeof import("next/dist/compiled/@edge-runtime/primitives/fetch");

Object.assign(globalThis, { File, FormData, Headers, Request, Response });

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
