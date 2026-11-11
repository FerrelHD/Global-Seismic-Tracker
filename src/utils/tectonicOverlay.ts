export type ProjectFn = (lon: number, lat: number) => [number, number];

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  coords: [number, number][]
): [number, number][] {
  const pts = coords.map(([lon, lat]) => project(lon, lat));
  if (pts.length === 0) return pts;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.stroke();
  return pts;
}

function drawReticleBeacon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  rgb: string,
  now: number,
  tagLabel?: string
) {
  const cycle = (now % 2400) / 2400;
  const ringR = 10 + cycle * 28;

  ctx.save();
  // Expanding pulse wave
  ctx.beginPath();
  ctx.arc(x, y, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${rgb}, ${(1 - cycle) * 0.75})`;
  ctx.lineWidth = 1.6 * (1 - cycle * 0.5);
  ctx.stroke();

  // Inner technical ring & crosshair ticks
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rgb}, 0.14)`;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 14, y);
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y + 14);
  ctx.stroke();

  // Center core
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (tagLabel) {
    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    const textW = ctx.measureText(tagLabel).width;
    const pillW = textW + 14;
    const pillH = 15;
    const pillX = x - pillW / 2;
    const pillY = y - 28;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = `rgba(${rgb}, 0.45)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillW, pillH, 5);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillText(tagLabel, pillX + 7, pillY + 10.5);
  }
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  headSize = 5
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.35;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headSize * Math.cos(angle - Math.PI / 6),
    y2 - headSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headSize * Math.cos(angle + Math.PI / 6),
    y2 - headSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Renders animated 60fps tectonic fault & subduction overlays synced to active story chapter.
 * Runs in the overlay pass after baseMapCache blit for minimal CPU cost.
 */
export function renderStoryTectonicOverlay(
  ctx: CanvasRenderingContext2D,
  project: ProjectFn,
  chapterStage: number,
  now: number
) {
  if (chapterStage < 1 || chapterStage > 4) return;

  const pulse = (Math.sin(now * 0.004) + 1) * 0.5;
  const dashOffset = -(now * 0.025) % 40;

  ctx.save();

  if (chapterStage === 1) {
    // 01 // SUNDA MEGATHRUST ARC
    const coords: [number, number][] = [
      [93.2, 6.2],
      [95.0, 2.5],
      [97.4, 0.2],
      [99.8, -2.1],
      [102.0, -4.5],
      [105.0, -6.9],
      [108.5, -8.8],
      [113.5, -9.8],
      [118.5, -10.3],
      [122.0, -10.5],
    ];

    // Soft thermal corridor glow
    ctx.strokeStyle = `rgba(225, 29, 72, ${0.14 + pulse * 0.1})`;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawPolyline(ctx, project, coords);

    // Animated flowing trench trace
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = dashOffset;
    const pts = drawPolyline(ctx, project, coords);
    ctx.setLineDash([]);

    // Subduction thrust barbs pointing NE into overriding plate
    ctx.fillStyle = '#e11d48';
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i + 1];
      const mx = pts[i][0];
      const my = pts[i][1];
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const nx = Math.sin(angle);
      const ny = -Math.cos(angle);
      ctx.beginPath();
      ctx.moveTo(mx + nx * 6, my + ny * 6);
      ctx.lineTo(mx - Math.cos(angle) * 3.5, my - Math.sin(angle) * 3.5);
      ctx.lineTo(mx + Math.cos(angle) * 3.5, my + Math.sin(angle) * 3.5);
      ctx.closePath();
      ctx.fill();
    }

    // Convergence vectors from SW -> NE
    const [vx, vy] = project(99.5, -6.8);
    const shift = Math.sin(now * 0.003) * 3;
    drawArrow(ctx, vx - 14 + shift, vy + 18 - shift, vx + 4 + shift, vy - 2 - shift, '#be123c', 6);

    const [fx, fy] = project(102.0, -4.5);
    drawReticleBeacon(ctx, fx, fy, '#e11d48', '225, 29, 72', now, 'SUNDA TRENCH · 6.2 CM/YR');
  } else if (chapterStage === 2) {
    // 02 // PALU-KORO SINISTRAL STRIKE-SLIP FAULT
    const faultCoords: [number, number][] = [
      [119.35, 1.3],
      [119.65, 0.3],
      [119.85, -0.9],
      [120.25, -2.0],
      [120.75, -2.85],
    ];

    ctx.strokeStyle = `rgba(217, 119, 6, ${0.18 + pulse * 0.12})`;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    drawPolyline(ctx, project, faultCoords);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = dashOffset;
    drawPolyline(ctx, project, faultCoords);
    ctx.setLineDash([]);

    // Opposing sinistral strike-slip shear arrows
    const [cx, cy] = project(119.8, -0.9);
    const slipOffset = Math.sin(now * 0.0035) * 4;
    drawArrow(ctx, cx - 14, cy - 10 + slipOffset, cx - 7, cy + 12 + slipOffset, '#b45309', 5.5);
    drawArrow(ctx, cx + 14, cy + 10 - slipOffset, cx + 7, cy - 12 - slipOffset, '#b45309', 5.5);

    drawReticleBeacon(ctx, cx, cy, '#d97706', '217, 119, 6', now, 'PALU-KORO · 35 MM/YR');
  } else if (chapterStage === 3) {
    // 03 // BANDA 180° HORSESHOE OROCLINE & WADATI-BENIOFF SLAB
    const bandaCoords: [number, number][] = [
      [126.5, -3.2],
      [129.5, -3.1],
      [131.8, -4.2],
      [132.4, -5.8],
      [131.2, -7.2],
      [128.8, -7.9],
      [125.8, -7.9],
    ];

    ctx.strokeStyle = `rgba(15, 47, 99, ${0.14 + pulse * 0.1})`;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawPolyline(ctx, project, bandaCoords);

    ctx.strokeStyle = '#0f2f63';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = dashOffset;
    drawPolyline(ctx, project, bandaCoords);
    ctx.setLineDash([]);

    const [bx, by] = project(129.5, -5.5);
    // Concentric deep Wadati-Benioff depth contours
    [22, 38, 54].forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(bx, by, r + pulse * (idx + 1) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(11, 110, 151, ${0.35 - idx * 0.08})`;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    drawReticleBeacon(ctx, bx, by, '#0f2f63', '15, 47, 99', now, 'BANDA SLAB · 650+ KM DEPTH');
  } else if (chapterStage === 4) {
    // 04 // PAPUA COLLISION BELT & YAPEN THRUST FRONT
    const yapenCoords: [number, number][] = [
      [134.8, -1.6],
      [137.2, -2.1],
      [139.6, -2.5],
      [141.4, -2.7],
    ];
    const centralCoords: [number, number][] = [
      [135.8, -3.7],
      [138.5, -4.1],
      [141.0, -4.6],
    ];

    ctx.strokeStyle = `rgba(37, 99, 201, ${0.15 + pulse * 0.1})`;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    drawPolyline(ctx, project, yapenCoords);
    drawPolyline(ctx, project, centralCoords);

    ctx.strokeStyle = '#2563c9';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = dashOffset;
    drawPolyline(ctx, project, yapenCoords);
    ctx.strokeStyle = '#0f2f63';
    drawPolyline(ctx, project, centralCoords);
    ctx.setLineDash([]);

    const [px, py] = project(138.5, -3.8);
    const convShift = Math.sin(now * 0.0035) * 3;
    // Oblique Pacific convergence arrow (NE -> SW)
    drawArrow(ctx, px + 18 - convShift, py - 24 + convShift, px + 5 - convShift, py - 9 + convShift, '#2563c9', 6);
    // Australian Craton arrow (S -> N)
    drawArrow(ctx, px - 4, py + 24 - convShift, px - 2, py + 10 - convShift, '#0f2f63', 6);

    drawReticleBeacon(ctx, px, py, '#2563c9', '37, 99, 201', now, 'PAPUA COLLISION · 10.5 CM/YR');
  }

  ctx.restore();
}
