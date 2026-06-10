export const generateIceCandyCanvas = (type) => {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  let baseColor, darkColor, lightColor, hasBumps = false;
  switch (type) {
    case 'pink':
      baseColor = '#f01485'; darkColor = '#c00865'; lightColor = '#ff6cb2'; break;
    case 'green':
      baseColor = '#7ed90b'; darkColor = '#5ba106'; lightColor = '#a8f542'; break;
    case 'chocolate':
      baseColor = '#6b3611'; darkColor = '#4a2309'; lightColor = '#8f4f21'; hasBumps = true; break;
    case 'orange':
      baseColor = '#ffaa00'; darkColor = '#cc8800'; lightColor = '#ffcc4d'; break;
    case 'blue':
      baseColor = '#0b9bd9'; darkColor = '#0673a3'; lightColor = '#4dc5ff'; break;
    default:
      baseColor = '#f01485'; darkColor = '#c00865'; lightColor = '#ff6cb2';
  }

  // Draw stick
  ctx.fillStyle = '#e5b985';
  ctx.beginPath();
  ctx.roundRect(65, 280, 30, 70, [0, 0, 15, 15]);
  ctx.fill();

  // Stick shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.roundRect(65, 280, 12, 70, [0, 0, 0, 15]);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(65, 280, 30, 15); // Drop shadow from candy

  // Main body
  ctx.beginPath();
  ctx.moveTo(20, 280);
  ctx.arcTo(20, 20, 80, 20, 15);
  ctx.arcTo(140, 20, 140, 280, 15);
  ctx.arcTo(140, 290, 80, 290, 10);
  ctx.arcTo(20, 290, 20, 280, 10);
  ctx.closePath();
  
  // Body Gradient
  const grad = ctx.createLinearGradient(20, 0, 140, 0);
  grad.addColorStop(0, darkColor);
  grad.addColorStop(0.15, baseColor);
  grad.addColorStop(0.85, baseColor);
  grad.addColorStop(1, darkColor);
  ctx.fillStyle = grad;
  ctx.fill();

  // 3 Grooves
  const drawGroove = (gx) => {
    ctx.beginPath();
    ctx.roundRect(gx, 50, 16, 220, 8);
    const gGrad = ctx.createLinearGradient(gx, 0, gx + 16, 0);
    gGrad.addColorStop(0, darkColor);
    gGrad.addColorStop(1, lightColor);
    ctx.fillStyle = gGrad;
    ctx.fill();
  };
  drawGroove(40);
  drawGroove(72);
  drawGroove(104);

  // Gloss highlight (left side)
  ctx.beginPath();
  ctx.moveTo(35, 270);
  ctx.arcTo(35, 35, 80, 35, 5);
  ctx.lineTo(45, 35);
  ctx.arcTo(45, 45, 45, 270, 5);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  // Highlight dots on grooves (top part)
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.roundRect(42, 60, 6, 20, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(74, 60, 6, 20, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(106, 60, 6, 20, 3); ctx.fill();

  // Bottom lip shadow
  ctx.beginPath();
  ctx.moveTo(30, 285);
  ctx.quadraticCurveTo(80, 295, 130, 285);
  ctx.lineWidth = 3;
  ctx.strokeStyle = darkColor;
  ctx.stroke();

  // Bumps for chocolate
  if (hasBumps) {
    ctx.fillStyle = baseColor;
    const bumps = [
      {x: 35, y: 150, r: 4}, {x: 125, y: 180, r: 5}, {x: 40, y: 100, r: 3},
      {x: 110, y: 220, r: 4}, {x: 60, y: 130, r: 3}, {x: 95, y: 170, r: 5},
      {x: 30, y: 200, r: 4}, {x: 120, y: 110, r: 4}, {x: 130, y: 140, r: 3},
      {x: 50, y: 240, r: 4}, {x: 80, y: 90, r: 5}, {x: 75, y: 210, r: 4}
    ];
    bumps.forEach(b => {
      // bump base
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      // bump shadow
      ctx.beginPath(); ctx.arc(b.x+1, b.y+1, b.r, 0, Math.PI*2);
      ctx.fillStyle = darkColor; ctx.fill();
      // bump highlight
      ctx.beginPath(); ctx.arc(b.x-1, b.y-1, b.r*0.6, 0, Math.PI*2);
      ctx.fillStyle = lightColor; ctx.fill();
      ctx.fillStyle = baseColor; // reset
    });
  }

  return canvas;
};
