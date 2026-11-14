/* A drawn stand-in for a guest's selfie: a small cartoon family on Palm Beach.
   Used for the example postcards on the start screen and the kiosk, and by the
   testing hook (window.__postcard.useTestImage). No real people, no photos. */
(function (root) {
  'use strict';

  var SCENES = {
    day: {
      sky: ['#56B9EA', '#A9E0F7'], sun: '#FFF3B0', sunAt: [0.80, 0.13, 0.085],
      sea: ['#1B9CC4', '#58CBDD'], sand: ['#F6E7BE', '#EAD49A'], palm: ['#7A5A33', '#2E8B4A', '#3FA65B'], tint: null
    },
    sunset: {
      sky: ['#2A2460', '#C4447A', '#F39A4A'], sun: '#FFD27A', sunAt: [0.30, 0.40, 0.11],
      sea: ['#3B2C68', '#7B3E7C'], sand: ['#5E4350', '#3E2C3B'], palm: ['#1C1530', '#1C1530', '#241A3A'], tint: 'rgba(70,24,84,0.34)'
    }
  };

  var PEOPLE = [
    // x and headY as a share of width/height, r as a share of width
    { x: 0.27, y: 0.45, r: 0.115, skin: '#F2C9A0', hair: '#5A3A1E', style: 'long', shirt: '#EB8917', glasses: true },
    { x: 0.71, y: 0.42, r: 0.125, skin: '#B9793F', hair: '#22160C', style: 'short', shirt: '#27AAE1', glasses: false },
    { x: 0.49, y: 0.60, r: 0.092, skin: '#E3AE7C', hair: '#EFBD40', style: 'cap', shirt: '#F5F1E4', glasses: false }
  ];

  function person(ctx, w, h, p, order) {
    var cx = p.x * w, cy = p.y * h, r = p.r * w;
    ctx.save();
    // hair behind the head
    if (p.style === 'long') {
      ctx.fillStyle = p.hair;
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.12, cy - r * 0.1);
      ctx.bezierCurveTo(cx - r * 1.3, cy - r * 1.5, cx + r * 1.3, cy - r * 1.5, cx + r * 1.12, cy - r * 0.1);
      ctx.bezierCurveTo(cx + r * 1.25, cy + r * 0.9, cx + r * 1.1, cy + r * 1.7, cx + r * 0.95, cy + r * 1.9);
      ctx.lineTo(cx - r * 0.95, cy + r * 1.9);
      ctx.bezierCurveTo(cx - r * 1.1, cy + r * 1.7, cx - r * 1.25, cy + r * 0.9, cx - r * 1.12, cy - r * 0.1);
      ctx.fill();
    }
    // shoulders
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.moveTo(cx - r * 2.0, h + 4);
    ctx.bezierCurveTo(cx - r * 2.0, cy + r * 1.5, cx - r * 1.1, cy + r * 1.25, cx - r * 0.4, cy + r * 1.2);
    ctx.lineTo(cx + r * 0.4, cy + r * 1.2);
    ctx.bezierCurveTo(cx + r * 1.1, cy + r * 1.25, cx + r * 2.0, cy + r * 1.5, cx + r * 2.0, h + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,4,0.12)'; ctx.lineWidth = r * 0.05; ctx.stroke();
    // neck
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.36, cy + r * 0.7);
    ctx.lineTo(cx + r * 0.36, cy + r * 0.7);
    ctx.lineTo(cx + r * 0.4, cy + r * 1.22);
    ctx.quadraticCurveTo(cx, cy + r * 1.55, cx - r * 0.4, cy + r * 1.22);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,34,4,0.12)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.98, r * 0.4, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    // ears + head
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(cx - r * 0.98, cy + r * 0.05, r * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.98, cy + r * 0.05, r * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 1.06, 0, 0, Math.PI * 2); ctx.fill();
    // hair on top
    ctx.fillStyle = p.hair;
    if (p.style === 'short') {
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.02, cy - r * 0.18);
      ctx.bezierCurveTo(cx - r * 1.1, cy - r * 1.45, cx + r * 1.1, cy - r * 1.45, cx + r * 1.02, cy - r * 0.18);
      ctx.bezierCurveTo(cx + r * 0.7, cy - r * 0.75, cx - r * 0.7, cy - r * 0.75, cx - r * 1.02, cy - r * 0.18);
      ctx.fill();
    } else if (p.style === 'long') {
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.04, cy - r * 0.05);
      ctx.bezierCurveTo(cx - r * 1.05, cy - r * 1.4, cx + r * 1.05, cy - r * 1.4, cx + r * 1.04, cy - r * 0.05);
      ctx.bezierCurveTo(cx + r * 0.75, cy - r * 0.8, cx + r * 0.1, cy - r * 0.95, cx - r * 0.25, cy - r * 0.6);
      ctx.bezierCurveTo(cx - r * 0.6, cy - r * 0.55, cx - r * 0.9, cy - r * 0.4, cx - r * 1.04, cy - r * 0.05);
      ctx.fill();
    } else { // cap
      ctx.fillStyle = '#004EAD';
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.03, cy - r * 0.3);
      ctx.bezierCurveTo(cx - r * 1.05, cy - r * 1.5, cx + r * 1.05, cy - r * 1.5, cx + r * 1.03, cy - r * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); // brim, turned a little to one side
      ctx.ellipse(cx + r * 0.42, cy - r * 0.3, r * 0.95, r * 0.2, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EFBD40';
      ctx.beginPath(); ctx.arc(cx, cy - r * 1.2, r * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    // face
    var eyeY = cy + r * 0.02, eyeDx = r * 0.38;
    if (p.glasses) {
      ctx.fillStyle = '#282204';
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.ellipse(cx + s * eyeDx, eyeY, r * 0.3, r * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = '#282204'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - eyeDx * 0.3, eyeY - r * 0.04); ctx.lineTo(cx + eyeDx * 0.3, eyeY - r * 0.04); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - eyeDx - r * 0.28, eyeY - r * 0.02); ctx.lineTo(cx - r * 0.98, eyeY - r * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + eyeDx + r * 0.28, eyeY - r * 0.02); ctx.lineTo(cx + r * 0.98, eyeY - r * 0.08); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.ellipse(cx + s * eyeDx - r * 0.08, eyeY - r * 0.07, r * 0.09, r * 0.05, -0.5, 0, Math.PI * 2); ctx.fill();
      });
    } else {
      ctx.fillStyle = '#282204';
      [-1, 1].forEach(function (s) {
        ctx.beginPath(); ctx.arc(cx + s * eyeDx, eyeY, r * 0.085, 0, Math.PI * 2); ctx.fill();
      });
    }
    // cheeks and a smile
    ctx.fillStyle = 'rgba(235,90,70,0.22)';
    [-1, 1].forEach(function (s) {
      ctx.beginPath(); ctx.arc(cx + s * r * 0.58, cy + r * 0.38, r * 0.17, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = '#282204'; ctx.lineWidth = r * 0.075; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.22, r * 0.42, Math.PI * 0.16, Math.PI * 0.84);
    ctx.stroke();
    if (order === 1) { // one open, happy mouth for variety
      ctx.fillStyle = '#7A2E22';
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.34, r * 0.3, 0, Math.PI);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function palm(ctx, w, h, colors, baseX, baseY, height) {
    ctx.save();
    ctx.lineCap = 'round';
    var topX = baseX + height * 0.22, topY = baseY - height;
    ctx.strokeStyle = colors[0]; ctx.lineWidth = height * 0.055;
    ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.quadraticCurveTo(baseX - height * 0.08, baseY - height * 0.55, topX, topY); ctx.stroke();
    var fronds = [[-0.50, -0.02], [-0.40, -0.26], [-0.08, -0.36], [0.30, -0.30], [0.50, -0.06], [0.36, 0.16], [-0.34, 0.18]];
    fronds.forEach(function (f, i) {
      var ex = topX + f[0] * height, ey = topY + f[1] * height;
      var mx = (topX + ex) / 2, my = Math.min(topY, ey) - height * 0.14;
      ctx.fillStyle = colors[1 + (i % 2)];
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.quadraticCurveTo(mx + height * 0.02, my + height * 0.14, topX, topY);
      ctx.fill();
    });
    ctx.restore();
  }

  /* variant: 'day' | 'sunset' | 'bright' | 'dark'. Works at any size and shape. */
  function draw(ctx, w, h, variant) {
    var base = variant === 'sunset' || variant === 'dark' ? SCENES.sunset : SCENES.day;
    var horizon = h * 0.40, shore = h * 0.50, g, i;
    ctx.save();

    g = ctx.createLinearGradient(0, 0, 0, horizon);
    base.sky.forEach(function (c, k) { g.addColorStop(k / (base.sky.length - 1), c); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon + 2);

    // sun
    var sx = base.sunAt[0] * w, sy = base.sunAt[1] * h, sr = base.sunAt[2] * w;
    ctx.fillStyle = base.sun; ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    // a few clouds on the day sky
    if (base === SCENES.day) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [[0.22, 0.11, 0.10], [0.52, 0.20, 0.07]].forEach(function (c) {
        var x = c[0] * w, y = c[1] * h, r = c[2] * w;
        // one outline, so the see-through white does not double up where the puffs overlap
        ctx.beginPath();
        ctx.moveTo(x - r * 0.7, y + r * 0.5);
        ctx.arc(x - r * 0.7, y, r * 0.5, Math.PI * 0.5, Math.PI * 1.35);
        ctx.arc(x, y - r * 0.25, r * 0.68, Math.PI * 1.1, Math.PI * 1.9);
        ctx.arc(x + r * 0.75, y + r * 0.02, r * 0.48, Math.PI * 1.6, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
      });
    }

    // sea
    g = ctx.createLinearGradient(0, horizon, 0, shore);
    g.addColorStop(0, base.sea[0]); g.addColorStop(1, base.sea[1]);
    ctx.fillStyle = g; ctx.fillRect(0, horizon, w, shore - horizon + 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = Math.max(2, h * 0.003); ctx.lineCap = 'round';
    for (i = 0; i < 5; i++) {
      var ly = horizon + (shore - horizon) * (0.2 + i * 0.17), lx = w * ((i * 37) % 100) / 100;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + w * 0.16, ly); ctx.stroke();
    }

    // sand, with a wavy shoreline
    g = ctx.createLinearGradient(0, shore, 0, h);
    g.addColorStop(0, base.sand[0]); g.addColorStop(1, base.sand[1]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, shore);
    for (i = 0; i <= 8; i++) ctx.quadraticCurveTo(w * (i + 0.5) / 8, shore + (i % 2 ? -1 : 1) * h * 0.008, w * (i + 1) / 8, shore);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

    palm(ctx, w, h, base.palm, w * 0.07, shore + h * 0.03, h * 0.36);

    if (variant === 'bright') { ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fillRect(0, 0, w, h); }

    // the family: back row first, the child in front
    PEOPLE.forEach(function (p, k) { person(ctx, w, h, p, k); });

    if (base.tint) { ctx.fillStyle = base.tint; ctx.fillRect(0, 0, w, h); }
    if (variant === 'dark') { ctx.fillStyle = 'rgba(8,6,20,0.62)'; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }

  root.PostcardSample = { draw: draw, variants: ['day', 'sunset', 'bright', 'dark'] };
})(window);
