// In-memory robot presence + latest-frame broker (single instance).
//
// The physical robot (ESP32) lives behind the 4090 gateway and talks to brain180
// only through the device-token bridge (server/routes/robot.ts). brain180 has no
// persistent socket to the device, so "is the robot connected right now?" can
// only be answered by RECENT device activity. This module records:
//   - last-seen: bumped on every device-token request (chat / health / frame),
//     so any bridge traffic — including a periodic gateway probe used as a
//     heartbeat — keeps the robot marked online.
//   - last frame: the newest camera/screen JPEG the gateway pushed, so the
//     browser 로봇 튜터 can pull "what the robot is looking at" on demand.
//
// Ephemeral by design (presence and the last frame are "now" state, not history);
// a redeploy resets them, which is correct for liveness.

export interface RobotFrame {
  dataBase64: string;
  mediaType: string;
  at: number;
}

export interface RobotPresence {
  online: boolean;
  last_seen_ms_ago: number | null;
  source: string | null;
  has_frame: boolean;
  frame_ms_ago: number | null;
}

// A device is "online" if it was seen within this window. Set to comfortably
// exceed the gateway's heartbeat/probe interval.
const ONLINE_WINDOW_MS = 30_000;

let lastSeenAt: number | null = null;
let lastSeenSource: string | null = null;
let lastFrame: RobotFrame | null = null;

export function markRobotSeen(source: string): void {
  lastSeenAt = Date.now();
  lastSeenSource = source;
}

export function putRobotFrame(dataBase64: string, mediaType: string): void {
  lastFrame = { dataBase64, mediaType, at: Date.now() };
  markRobotSeen("frame");
}

export function getRobotFrame(): RobotFrame | null {
  return lastFrame;
}

export function getRobotPresence(): RobotPresence {
  const now = Date.now();
  const ago = lastSeenAt === null ? null : now - lastSeenAt;
  return {
    online: ago !== null && ago <= ONLINE_WINDOW_MS,
    last_seen_ms_ago: ago,
    source: lastSeenSource,
    has_frame: lastFrame !== null,
    frame_ms_ago: lastFrame ? now - lastFrame.at : null,
  };
}
