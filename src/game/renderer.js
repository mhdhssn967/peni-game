export const renderScene = (ctx, canvas, state, platformHeight, platformWidth, gameState, refs) => {
  const { platformImageRef, charJumpImageRef, charWaveImageRef, charIdleImageRef, bgImagesRef, iceCandiesImagesRef } = refs;
  const W = canvas.width;
  const H = canvas.height;

  const charWidth = 130;
  const charHeight = 130;
  const platTopVisible = H - platformHeight + (platformHeight * 65 / 582);
  const charGroundY = platTopVisible - charHeight + (charHeight * 57 / 256);

  // 1. TROPICAL SKY GRADIENT (Peni Brand Sky Blue -> Soft Ice Blue)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H - platformHeight);
  skyGrad.addColorStop(0, '#1fa5e3');
  skyGrad.addColorStop(0.5, '#7ccbf5');
  skyGrad.addColorStop(1, '#c5e9fc');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. SUN & RAYS (Slightly slower rotation in home state)
  const sunX = W * 0.85;
  const sunY = H * 0.15;
  const sunRadius = 45;
  const rotationSpeed = gameState === 'playing' ? 0.003 : 0.001;

  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(state.time * rotationSpeed);
  ctx.strokeStyle = 'rgba(255, 245, 220, 0.08)';
  ctx.lineWidth = 12;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, H * 0.6);
    ctx.stroke();
    ctx.rotate(Math.PI / 4);
  }
  ctx.restore();

  // Sun Core
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunRadius);
  sunGrad.addColorStop(0, '#ffffff');
  sunGrad.addColorStop(0.2, '#fff6d6');
  sunGrad.addColorStop(1, 'rgba(255, 235, 173, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Calculate camera vertical offset based on jump height (camera follow effect)
  const heightAboveGround = Math.max(0, charGroundY - state.charY);
  const cameraOffset = heightAboveGround * 0.45; // 45% camera follow

  // Calculate horizontal camera scroll speed to apply parallax to clouds
  let jumpScrollSpeed = 0;
  if (state.isJumping) {
    const heightRatio = Math.max(0.1, Math.min(1.0, heightAboveGround / 150));
    jumpScrollSpeed = state.velocityX * heightRatio;
  }

  ctx.save();
  ctx.translate(0, cameraOffset);

  // 3. DRIFTING CLOUDS (Right to left)
  state.clouds.forEach(cloud => {
    const cloudSpeed = (gameState === 'playing' ? cloud.speed * 2.0 : cloud.speed) + (jumpScrollSpeed * 0.3);
    cloud.x -= cloudSpeed;
    if (cloud.x + 120 * cloud.scale < 0) {
      cloud.x = W + 120 * cloud.scale;
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
    ctx.beginPath();
    const cx = cloud.x;
    const cy = cloud.y;
    const s = cloud.scale;

    ctx.arc(cx, cy, 20 * s, 0, Math.PI * 2);
    ctx.arc(cx + 15 * s, cy - 10 * s, 25 * s, 0, Math.PI * 2);
    ctx.arc(cx + 38 * s, cy, 20 * s, 0, Math.PI * 2);
    ctx.arc(cx + 20 * s, cy + 10 * s, 20 * s, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  });

  // 4. DRAW PARALLAX BACKGROUNDS
  const bgImages = bgImagesRef.current;
  if (bgImages && bgImages.length === 9) {
    bgImages.forEach((img, index) => {
      if (!img.complete || img.naturalHeight === 0) return;
      
      const parallaxFactor = 0.1 + (index * 0.08); 
      const bgScrollX = state.scrollX * parallaxFactor;
      
      const baseTargetHeight = H * 0.55;
      const targetHeight = baseTargetHeight * (img.customScale || 1.0);
      const scale = targetHeight / img.height;
      const imgW = img.width * scale;
      
      const drawY = img.isStartAsset 
        ? (H - platformHeight) - targetHeight + (platformHeight * 0.4)
        : H - targetHeight + (targetHeight * 0.15); // Sink 15% off the bottom edge

      const gap = img.customGap || 0;
      const period = imgW + gap;
      const offset = img.customOffset || 0;

      // Ensure k is always >= 0 so backgrounds don't loop backwards into the start screen
      const startK = Math.max(0, Math.floor((bgScrollX - offset - imgW) / period));
      const endK = Math.ceil((bgScrollX + W - offset) / period);
      
      ctx.save();
      
      for (let k = startK; k <= endK; k++) {
        const screenX = offset + (k * period) - bgScrollX;
        ctx.drawImage(img, screenX, drawY, imgW, targetHeight);
      }
      ctx.restore();
    });
  }

  // 5. DRAW ONLY THE FIRST PLATFORM
  const platImg = platformImageRef.current;
  const platY = H - platformHeight;
  const L_plat = platformWidth;

  ctx.save();

  const x1 = -state.scrollX;

  if (x1 + L_plat > 0 && x1 < W) {
    if (platImg) {
      ctx.drawImage(platImg, x1, platY, L_plat, platformHeight);
    } else {
      ctx.fillStyle = '#2d6a4f';
      ctx.fillRect(x1, platY, L_plat, 12);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(x1, platY + 12, L_plat, platformHeight - 12);
    }
  }

  ctx.restore();

  // 5.2 DRAW ICE CANDIES
  ctx.save();
  const baseCandyDrawY = platTopVisible - 17.5; 
  state.candies.forEach(candy => {
    const candyScreenX = candy.x - state.scrollX;
    if (candyScreenX + 160 > 0 && candyScreenX < W) {
      const cImg = iceCandiesImagesRef.current[candy.type];
      if (cImg) {
        ctx.drawImage(cImg, candyScreenX, baseCandyDrawY + candy.yOffset, 140, 315);
      }
    }
  });
  ctx.restore();

  // 5.5 DRAW JUMP TRAIL
  ctx.save();
  state.jumpTrail.forEach(dot => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 150, 255, ${dot.opacity})`;
    ctx.fill();
  });
  ctx.restore();

  // 6. DRAW CHARACTER AND SHADOW
  const isJumpingOrLanding = state.isJumping || state.landingTimer > 0;
  const charImg = isJumpingOrLanding ? charJumpImageRef.current : (state.hasJumped ? charIdleImageRef.current : charWaveImageRef.current);

  if (charImg && charImg.complete) {
    const charX = W * 0.12;
    
    let frame = 0;
    if (state.isJumping) {
      if (state.velocityY < 0) {
        frame = 18;
      } else {
        frame = state.fallFrameIndex;
      }
    } else if (state.landingTimer > 0) {
      frame = state.landingTimer > 4 ? 10 : 11;
    } else {
      frame = Math.floor(state.time / 10) % 25;
    }

    const frameWidth = charImg.width / 5;
    const frameHeight = charImg.height / 5;
    const col = frame % 5;
    const row = Math.floor(frame / 5);
    const sourceX = col * frameWidth;
    const sourceY = row * frameHeight;

    ctx.save();
    ctx.drawImage(
      charImg,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      charX,
      state.charY,
      charWidth,
      charHeight
    );
    ctx.restore();

    // 6.5 DRAW JUMP CHARGING METER
    if (state.isCharging) {
      const meterWidth = 16;
      const meterHeight = 120;
      const meterX = W * 0.05;
      const meterY = (H - meterHeight) / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.roundRect(meterX, meterY, meterWidth, meterHeight, 4);
      ctx.fill();
      ctx.stroke();

      const fillHeight = meterHeight * state.chargeValue;
      if (fillHeight > 0) {
        const grad = ctx.createLinearGradient(meterX, meterY + meterHeight, meterX, meterY);
        grad.addColorStop(0, '#00ffcc');
        grad.addColorStop(0.5, '#ffcc00');
        grad.addColorStop(1, '#ff3366');
        
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.roundRect(
          meterX + 2,
          meterY + meterHeight - fillHeight + 2,
          meterWidth - 4,
          fillHeight - 4,
          2
        );
        ctx.fill();
      }
      ctx.restore();

      // JUMP TRAJECTORY PREDICTION
      ctx.save();
      const startX = charX + charWidth / 2;
      const startY = state.charY + charHeight / 2 + 20;

      let simY = state.charY;
      let simVy = -3.5 - (5.5 * state.chargeValue);
      let simVx = 1.0 + (3.0 * state.chargeValue);

      let simScreenX = startX;
      let simScreenY = startY;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      
      // Simulate physics forward for a set number of frames
      for (let i = 0; i < 70; i++) {
        let currentGravity = 0.14;
        if (Math.abs(simVy) < 1.5) {
          currentGravity = 0.06;
        } else if (simVy > 0) {
          currentGravity = 0.18;
        }
        
        simVy += currentGravity;
        simY += simVy;

        const heightAboveGround = Math.max(0, charGroundY - simY);
        const heightRatio = Math.max(0.1, Math.min(1.0, heightAboveGround / 150));
        const easedScrollSpeed = simVx * heightRatio;

        simScreenX += easedScrollSpeed;
        simScreenY = simY + charHeight / 2 + 20;

        // Draw a dot every 6th simulated frame
        if (i % 6 === 0) {
          ctx.beginPath();
          ctx.arc(simScreenX, simScreenY, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stop drawing dots if it predicts falling too far below the main ground level
        if (simY > charGroundY + 50) break;
      }
      ctx.restore();
    }
  }

  // 7. GLOWING POLLEN DUSTS
  state.particles.forEach(p => {
    const particleSpeedMultiplier = gameState === 'playing' ? 1.8 : 1.0;
    p.y += p.speedY * particleSpeedMultiplier;
    p.x += (p.speedX + Math.sin(state.time * 0.02 + p.y * 0.01) * 0.15) * particleSpeedMultiplier;

    p.opacity += p.pulseSpeed * p.pulseDir;
    if (p.opacity >= 0.8) {
      p.opacity = 0.8;
      p.pulseDir = -1;
    } else if (p.opacity <= 0.15) {
      p.opacity = 0.15;
      p.pulseDir = 1;
    }

    if (p.y < -10) {
      p.y = H + 10;
      p.x = Math.random() * W;
    }
    if (p.x < -10 || p.x > W + 10) {
      p.x = Math.random() * W;
    }

    ctx.fillStyle = `rgba(224, 255, 178, ${p.opacity})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
};
