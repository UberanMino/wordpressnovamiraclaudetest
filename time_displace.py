import cv2
import numpy as np

SRC = "liquefy_output.mp4"
TMP = "time_displace_raw.mp4"

OUT_W, OUT_H = 720, 1280          # 720p downscale (portrait source)
MAX_DELAY_SEC = 0.7               # how far back in time the top row can reach
WARP_AMPLITUDE_SEC = 0.2          # extra wobble amplitude
N_WAVES = 2.0                     # number of sine waves across the frame height
SWEEP_PERIOD_SEC = 2.5            # time for the warp pattern to cycle

cap = cv2.VideoCapture(SRC)
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

max_delay = max(1, int(round(MAX_DELAY_SEC * fps)))
warp_amp = WARP_AMPLITUDE_SEC * fps
sweep_period = SWEEP_PERIOD_SEC * fps
K = max_delay + 1  # ring buffer depth

writer = cv2.VideoWriter(TMP, cv2.VideoWriter_fourcc(*"mp4v"), fps, (OUT_W, OUT_H))

buf = np.zeros((K, OUT_H, OUT_W, 3), dtype=np.uint8)
rows = np.arange(OUT_H)
y_norm = rows / max(1, (OUT_H - 1))
base_delay = (1.0 - y_norm) * max_delay  # top -> max_delay (older), bottom -> 0 (newest)

t = 0
ring_idx = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    frame = cv2.resize(frame, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)
    buf[ring_idx] = frame

    valid_count = min(t + 1, K)
    warp = warp_amp * np.sin(2 * np.pi * (y_norm * N_WAVES + t / sweep_period))
    delay = base_delay + warp
    delay = np.clip(delay, 0, valid_count - 1)
    delay = np.round(delay).astype(np.int64)

    src_idx = (ring_idx - delay) % K
    out_frame = buf[src_idx, rows]

    writer.write(out_frame)

    ring_idx = (ring_idx + 1) % K
    t += 1

cap.release()
writer.release()
print(f"done: {t} frames, fps={fps}, max_delay_frames={max_delay}")
