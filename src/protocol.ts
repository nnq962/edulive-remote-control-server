import { z } from "zod";

// Android đăng ký publisher
export const RegisterPublisher = z.object({
  type: z.literal("pub.register"),
  deviceId: z.string().min(3),
  deviceName: z.string().optional(), // device name
  codec: z.literal("avc"),        // H.264/AVC
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive().max(120),
  token: z.string().optional()    // để sau nếu cần
});
export type RegisterPublisher = z.infer<typeof RegisterPublisher>;

// Viewer đăng ký (để sau bạn build web viewer)
export const RegisterViewer = z.object({
  type: z.literal("viewer.register"),
  deviceId: z.string().min(3),
  token: z.string().optional()
});
export type RegisterViewer = z.infer<typeof RegisterViewer>;

export type ControlMessage = RegisterPublisher | RegisterViewer;

// Binary kind
export const BIN_INIT  = 1; // fMP4 init segment
export const BIN_MEDIA = 2; // fMP4 media segment
export const BIN_META  = 3; // optional: JSON metadata (utf-8)