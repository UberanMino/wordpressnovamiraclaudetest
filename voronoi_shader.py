import subprocess
import numpy as np
import sys

SRC = "liquefy_output.mp4"
OUT_RAW = "voronoi_out.mp4"
W, H = 720, 1280
FPS = 30
DURATION = 11.392

N_CELLS = 36
RNG = np.random.default_rng(42)

# Per-cell static params: orbit radius/phase for seed motion, offset, scale, tint
base_pos = RNG.uniform(0, 1, (N_CELLS, 2)) * [W, H]
orbit_r = RNG.uniform(20, 90, N_CELLS)
orbit_speed = RNG.uniform(0.3, 1.2, N_CELLS) * RNG.choice([-1, 1], N_CELLS)
orbit_phase = RNG.uniform(0, 2 * np.pi, N_CELLS)
# fracture pulse: each cell's seed jumps to a new random offset periodically
fracture_speed = RNG.uniform(0.15, 0.4, N_CELLS)
fracture_phase = RNG.uniform(0, 2 * np.pi, N_CELLS)
fracture_jitter = RNG.uniform(0, 1, (N_CELLS, 2))

sample_offset = RNG.uniform(-40, 40, (N_CELLS, 2))
sample_scale = RNG.uniform(0.85, 1.25, N_CELLS)
tint = RNG.uniform(0.6, 1.4, (N_CELLS, 3))

yy, xx = np.mgrid[0:H, 0:W]
xx = xx.astype(np.float32)
yy = yy.astype(np.float32)


def seed_positions(t):
    ang = orbit_phase + orbit_speed * t
    cx = base_pos[:, 0] + orbit_r * np.cos(ang)
    cy = base_pos[:, 1] + orbit_r * np.sin(ang)
    frac = 0.5 + 0.5 * np.sin(fracture_phase + fracture_speed * t * 2 * np.pi)
    cx += (fracture_jitter[:, 0] - 0.5) * 160 * frac
    cy += (fracture_jitter[:, 1] - 0.5) * 160 * frac
    return cx, cy


def render_frame(frame, t):
    cx, cy = seed_positions(t)
    best_d = None
    best_i = np.zeros((H, W), dtype=np.int32)
    for i in range(N_CELLS):
        d = (xx - cx[i]) ** 2 + (yy - cy[i]) ** 2
        if best_d is None:
            best_d = d
            best_i[:] = i
        else:
            mask = d < best_d
            best_d = np.where(mask, d, best_d)
            best_i = np.where(mask, i, best_i)

    out = np.empty((H, W, 3), dtype=np.float32)
    fh, fw = frame.shape[:2]
    for i in range(N_CELLS):
        mask = best_i == i
        if not mask.any():
            continue
        sx = (xx - W / 2) * sample_scale[i] + W / 2 + sample_offset[i, 0]
        sy = (yy - H / 2) * sample_scale[i] + H / 2 + sample_offset[i, 1]
        sx = np.clip(sx, 0, fw - 1).astype(np.int32)
        sy = np.clip(sy, 0, fh - 1).astype(np.int32)
        sampled = frame[sy[mask], sx[mask]].astype(np.float32)
        sampled *= tint[i]
        out[mask] = np.clip(sampled, 0, 255)
    return out.astype(np.uint8)


def main():
    n_frames = int(round(DURATION * FPS))

    ffmpeg_in = subprocess.Popen(
        [
            "ffmpeg", "-v", "error", "-i", SRC,
            "-vf", f"scale={W}:{H}",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
        ],
        stdout=subprocess.PIPE,
    )

    ffmpeg_out = subprocess.Popen(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
            "-i", "-",
            "-i", SRC,
            "-map", "0:v:0", "-map", "1:a:0?",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
            "-c:a", "aac", "-shortest",
            OUT_RAW,
        ],
        stdin=subprocess.PIPE,
    )

    frame_bytes = W * H * 3
    idx = 0
    while True:
        buf = ffmpeg_in.stdout.read(frame_bytes)
        if len(buf) < frame_bytes:
            break
        frame = np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3)
        t = idx / FPS
        result = render_frame(frame, t)
        ffmpeg_out.stdin.write(result.tobytes())
        idx += 1
        if idx % 20 == 0:
            print(f"frame {idx}", file=sys.stderr)

    ffmpeg_in.stdout.close()
    ffmpeg_in.wait()
    ffmpeg_out.stdin.close()
    ffmpeg_out.wait()
    print(f"done, {idx} frames", file=sys.stderr)


if __name__ == "__main__":
    main()
