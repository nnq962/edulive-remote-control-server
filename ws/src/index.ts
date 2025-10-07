import http from "http";
import express from "express";
import cors from "cors";
import pino from "pino";
import { WebSocketServer, WebSocket } from "ws";
import {
    BIN_INIT, BIN_MEDIA, BIN_META,
    RegisterPublisher, RegisterViewer, type ControlMessage
} from "./protocol.js";

const log = pino({ level: "info" });
const app = express();
app.use(cors());

type Room = {
    deviceId: string;
    publisher?: WebSocket;
    viewer?: WebSocket;           // chỉ cho 1 viewer
    lastInit?: Buffer;            // nhớ init cho viewer join sau
    lastMeta?: Buffer;            // optional
    lastSeenAt: number;           // mốc heartbeat
};

const rooms = new Map<string, Room>();
const viewers = new Set<WebSocket>();

function getOrCreateRoom(deviceId: string): Room {
    let r = rooms.get(deviceId);
    if (!r) {
        r = { deviceId, lastSeenAt: Date.now() };
        rooms.set(deviceId, r);
    }
    return r;
}

function safeSend(ws: WebSocket | undefined, data: Buffer | string) {
    if (!ws) return;
    if (ws.readyState !== ws.OPEN) return;
    // drop nếu client buffer quá lớn
    if (ws.bufferedAmount > 8 * 1024 * 1024) return;
    ws.send(data, { binary: Buffer.isBuffer(data) });
}

function closeWS(ws?: WebSocket) {
    if (!ws) return;
    try { ws.close(); } catch { }
}

function deviceListPayload() {
    const items = [...rooms.values()]
      .filter(r => !!r.publisher && r.publisher.readyState === r.publisher.OPEN)
      .map(r => ({
          id: r.deviceId,
          deviceName: (r as any).deviceName ?? "unknown"
      }));
    return JSON.stringify({ type: "device-list", items });
}

function broadcastDeviceList() {
    const payload = deviceListPayload();
    viewers.forEach(v => safeSend(v, payload));
}

app.get("/status", (_, res) => {
    res.json({
        ok: true,
        rooms: rooms.size,
        now: Date.now()
    });
});

app.get("/rooms", (_, res) => {
    const data = [...rooms.values()].map(r => ({
        deviceId: r.deviceId,
        hasPublisher: !!r.publisher && r.publisher.readyState === r.publisher.OPEN,
        hasViewer: !!r.viewer && r.viewer.readyState === r.viewer.OPEN,
        lastInit: !!r.lastInit,
        lastSeenAt: r.lastSeenAt
    }));
    res.json(data);
});

// Danh sách device online (publisher đã connect, dù chưa stream)
app.get("/devices", (_, res) => {
    const devs = [...rooms.values()]
        .filter(r => !!r.publisher && r.publisher.readyState === r.publisher.OPEN)
        .map(r => ({ id: r.deviceId, deviceName: (r as any).deviceName ?? "unknown" }));
    res.json(devs);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
    let role: "publisher" | "viewer" | null = null;
    let deviceId: string | null = null;

    // Heartbeat per-connection
    (ws as any)._isAlive = true;
    ws.on("pong", () => (ws as any)._isAlive = true);

    ws.on("message", (data, isBinary) => {
        if (isBinary) {
            // chỉ publisher mới được gửi binary
            if (role !== "publisher" || !deviceId) return;
            const room = getOrCreateRoom(deviceId);
            const buf = Buffer.from(data as Buffer);
            const kind = buf[0];
            const payload = buf.subarray(1);

            room.lastSeenAt = Date.now();

            if (kind === BIN_INIT) {
                room.lastInit = Buffer.concat([Buffer.from([BIN_INIT]), payload]);
                // nếu đã có viewer → gửi init luôn (re-sync)
                safeSend(room.viewer, room.lastInit);
            } else if (kind === BIN_MEDIA) {
                // fanout tới viewer duy nhất
                safeSend(room.viewer, buf);
            } else if (kind === BIN_META) {
                room.lastMeta = Buffer.concat([Buffer.from([BIN_META]), payload]);
                safeSend(room.viewer, room.lastMeta);
            }
            return;
        }

        // Control JSON
        let msg: ControlMessage | undefined;
        try { msg = JSON.parse(data.toString()); } catch { return; }
        if (!msg) return;

        // Viewer discovery handshake: track viewer and send current list
        if ((msg as any).type === "hello" && (msg as any).role === "viewer") {
            viewers.add(ws);
            safeSend(ws, deviceListPayload());
            return;
        }

        // Publisher đăng ký
        const pub = RegisterPublisher.safeParse(msg);
        if (pub.success) {
            role = "publisher";
            deviceId = pub.data.deviceId;
            const room = getOrCreateRoom(deviceId);

            // nếu đã có publisher cũ → đá ra (reconnect)
            if (room.publisher && room.publisher !== ws) {
                closeWS(room.publisher);
            }

            room.publisher = ws;
            room.lastSeenAt = Date.now();

            // ✅ Lưu và log deviceName nếu có
            const deviceName = pub.data.deviceName ?? "unknown";
            (room as any).deviceName = deviceName;

            // Log thông tin publisher
            log.info(
                { deviceId, deviceName },
                "publisher registered"
            );

            broadcastDeviceList();
            return;
        }

        // Viewer đăng ký
        const vw = RegisterViewer.safeParse(msg);
        if (vw.success) {
            role = "viewer";
            deviceId = vw.data.deviceId;
            const room = getOrCreateRoom(deviceId);

            // chỉ 1 viewer: nếu đã có → đá cũ
            if (room.viewer && room.viewer !== ws) {
                closeWS(room.viewer);
            }
            room.viewer = ws;

            // nếu đã có init/meta → gửi lại để viewer start ngay
            if (room.lastInit) safeSend(ws, room.lastInit);
            if (room.lastMeta) safeSend(ws, room.lastMeta);

            log.info({ deviceId }, "viewer joined");
            return;
        }
    });

    ws.on("close", () => {
        viewers.delete(ws);
        if (!role || !deviceId) return;
        const room = rooms.get(deviceId);
        if (!room) return;

        if (role === "publisher" && room.publisher === ws) {
            room.publisher = undefined;
            // thông báo viewer (nếu đang xem) rằng stream end
            safeSend(room.viewer, JSON.stringify({ type: "stream.ended", deviceId }));
            broadcastDeviceList();
        }
        if (role === "viewer" && room.viewer === ws) {
            room.viewer = undefined;
        }
    });
});

// Ping toàn cục để giữ kết nối sống với 40 thiết bị idle
const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
        if (ws._isAlive === false) return ws.terminate();
        ws._isAlive = false;
        ws.ping();
    });
}, 15000);

wss.on("close", () => clearInterval(interval));

const PORT = Number(process.env.PORT) || 8080;
server.listen(PORT, () => log.info(`WS server on http://localhost:${PORT} (ws path: /ws)`));