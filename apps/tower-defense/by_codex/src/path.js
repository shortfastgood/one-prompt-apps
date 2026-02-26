import { GAME_CONFIG, UI_COLORS } from "./config.js";
import { clamp, pointToSegmentDistance } from "./utils.js";

export function createPath(points) {
  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      continue;
    }
    segments.push({
      start,
      end,
      dx,
      dy,
      length,
      startDistance: totalLength,
      endDistance: totalLength + length,
    });
    totalLength += length;
  }

  return { points, segments, totalLength };
}

export function getPointAtDistance(path, distance) {
  if (path.segments.length === 0) {
    return { x: 0, y: 0 };
  }

  const d = clamp(distance, 0, path.totalLength);
  for (const segment of path.segments) {
    if (d <= segment.endDistance) {
      const local = d - segment.startDistance;
      const t = segment.length > 0 ? local / segment.length : 0;
      return {
        x: segment.start.x + segment.dx * t,
        y: segment.start.y + segment.dy * t,
      };
    }
  }

  const last = path.segments[path.segments.length - 1];
  return { x: last.end.x, y: last.end.y };
}

export function distanceToPath(path, point) {
  let minDistance = Infinity;
  for (const segment of path.segments) {
    const d = pointToSegmentDistance(point, segment.start, segment.end);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}

export function drawPath(ctx, path) {
  if (!path.points.length) {
    return;
  }

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = "rgba(0, 0, 0, 0.42)";
  ctx.lineWidth = GAME_CONFIG.pathWidth + 8;
  ctx.beginPath();
  tracePath(ctx, path.points);
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
  gradient.addColorStop(0, "#2a3547");
  gradient.addColorStop(0.5, "#35475c");
  gradient.addColorStop(1, "#2b3a4e");

  ctx.strokeStyle = gradient;
  ctx.lineWidth = GAME_CONFIG.pathWidth;
  ctx.beginPath();
  tracePath(ctx, path.points);
  ctx.stroke();

  ctx.strokeStyle = "rgba(176, 212, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  tracePath(ctx, path.points);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function tracePath(ctx, points) {
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}

export function drawGrid(ctx) {
  const { width, height } = ctx.canvas;
  const { gridSize, backgroundGridColor } = GAME_CONFIG;
  ctx.save();
  ctx.strokeStyle = backgroundGridColor;
  ctx.lineWidth = 1;

  for (let x = 0.5; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0.5; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawPlacementPreview(ctx, preview) {
  if (!preview) {
    return;
  }

  const { x, y, valid, towerRadius, range } = preview;

  ctx.save();
  ctx.strokeStyle = valid ? UI_COLORS.validStroke : UI_COLORS.invalidStroke;
  ctx.fillStyle = valid ? UI_COLORS.validPlacement : UI_COLORS.invalidPlacement;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, towerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = valid ? "rgba(120, 200, 255, 0.24)" : "rgba(241, 92, 107, 0.18)";
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

