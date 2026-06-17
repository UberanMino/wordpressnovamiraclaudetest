import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from "remotion";

const IMAGE_SRC = staticFile("person.png");

// Cheap deterministic hash so each branch of the recursion gets its own
// animation phase instead of every copy moving in lockstep.
const hashSeed = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const ImageInstance: React.FC<{ frame: number; seed: string }> = ({ frame, seed }) => {
  const s = hashSeed(seed);
  const phase = s % 360;
  const rotation = frame * (0.6 + (s % 5) * 0.15) * (s % 2 === 0 ? 1 : -1) + phase;
  const scale = 0.82 + 0.18 * Math.sin(frame / (24 + (s % 20)) + phase);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      <Img
        src={IMAGE_SRC}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </AbsoluteFill>
  );
};

// A 2x2 mirrored grid (classic kaleidoscope tiling): top-right flipped
// horizontally, bottom-left flipped vertically, bottom-right flipped on
// both axes, so the pattern reads as reflections around the center.
const GRID_CELLS = [
  { flipX: false, flipY: false, left: "0%", top: "0%" },
  { flipX: true, flipY: false, left: "50%", top: "0%" },
  { flipX: false, flipY: true, left: "0%", top: "50%" },
  { flipX: true, flipY: true, left: "50%", top: "50%" },
];

const KaleidoscopeCell: React.FC<{
  depth: number;
  maxDepth: number;
  frame: number;
  seed: string;
}> = ({ depth, maxDepth, frame, seed }) => {
  if (depth >= maxDepth) {
    return <ImageInstance frame={frame} seed={seed} />;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {GRID_CELLS.map((cell, i) => {
        const cellSeed = `${seed}-${depth}-${i}`;
        const s = hashSeed(cellSeed);
        const wobble = Math.sin(frame / (30 + (s % 25)) + s) * 12;
        const spin = frame * (0.2 + (s % 4) * 0.1) * (i % 2 === 0 ? 1 : -1);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: "50%",
              height: "50%",
              left: cell.left,
              top: cell.top,
              transform: `scaleX(${cell.flipX ? -1 : 1}) scaleY(${
                cell.flipY ? -1 : 1
              }) rotate(${spin + wobble}deg)`,
              transformOrigin: "center",
            }}
          >
            <KaleidoscopeCell
              depth={depth + 1}
              maxDepth={maxDepth}
              frame={frame}
              seed={cellSeed}
            />
          </div>
        );
      })}
    </div>
  );
};

export const Kaleidoscope: React.FC = () => {
  const frame = useCurrentFrame();

  // Recursion depth grows over the course of the video, so the pattern
  // keeps getting more intricate instead of jumping straight to max detail.
  const depthFloat = interpolate(frame, [0, 300], [1, 4], {
    extrapolateRight: "clamp",
  });
  const maxDepth = Math.floor(depthFloat);

  // Slow overall rotation of the whole composition adds an extra layer of
  // motion on top of the per-cell spins.
  const globalRotation = frame * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05030a", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `rotate(${globalRotation}deg)`,
          transformOrigin: "center",
        }}
      >
        <KaleidoscopeCell depth={0} maxDepth={maxDepth} frame={frame} seed="root" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
