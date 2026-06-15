export const renderScene = (ctx, canvas, state, platformHeight, platformWidth, gameState, refs) => {
  const { platformImageRef, charJumpImageRef, charWaveImageRef, charIdleImageRef, charRunImageRef, bgImagesRef, iceCandiesImagesRef } = refs;
  
  const dpr = canvas.dpr || 1;
  const W = canvas.logicalWidth || canvas.width;
  const H = canvas.logicalHeight || canvas.height;

  ctx.save();
  ctx.scale(dpr, dpr);

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
      if (!img || img.width === 0) return;
      
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
        let dx = candyScreenX;
        if (candy.isMelting && !candy.hasLandedOn) {
          dx += Math.sin(state.time * 0.8) * 3; // Shiver effect
        }
        ctx.drawImage(cImg, dx, baseCandyDrawY + candy.yOffset, 140, 315);
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
  let charImg = isJumpingOrLanding ? charJumpImageRef.current : (state.hasStartedMoving ? charIdleImageRef.current : charWaveImageRef.current);
  if (!isJumpingOrLanding && state.isMovingForward) {
    charImg = charRunImageRef.current;
  }

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

  // 8. FLOATING TEXTS (Moves with camera)
  if (state.floatingTexts) {
    state.floatingTexts.forEach(ft => {
      const fontSize = ft.isBig ? 52 : 28;
      ctx.font = `${fontSize}px "Luckiest Guy", cursive, sans-serif`;
      ctx.textAlign = 'center';
      
      const screenX = ft.x - state.scrollX;
      
      // Shadow
      ctx.fillStyle = `rgba(0, 0, 0, ${ft.opacity * 0.5})`;
      ctx.fillText(ft.text, screenX + (ft.isBig ? 4 : 3), ft.y + (ft.isBig ? 4 : 3));
      
      // Text (White)
      ctx.fillStyle = `rgba(255, 255, 255, ${ft.opacity})`;
      ctx.fillText(ft.text, screenX, ft.y);
      
      if (ft.isBig) {
        // Outline to make the +5 pop more
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(253, 92, 34, ${ft.opacity})`; // Peni Orange outline
        ctx.strokeText(ft.text, screenX, ft.y);
      }
    });
  }

  ctx.restore(); // Restore camera translation (Everything below is fixed to screen)

  // 9. SCORE HUD (Fixed UI)
  const scoreNumText = `${state.score || 0}`;
  ctx.font = '28px "Luckiest Guy", cursive, sans-serif';
  const textWidth = ctx.measureText(scoreNumText).width;
  
  // Icon dimensions
  const iconW = 18;
  const iconH = 34; 
  const gap = 12;
  
  const paddingX = 16;
  const boxWidth = paddingX * 2 + iconW + gap + textWidth;
  const boxHeight = 46;
  const boxX = 20;
  const boxY = 20;

  // Draw Blue Rounded Box
  ctx.fillStyle = 'rgba(31, 165, 227, 0.9)'; // Peni Brand Sky Blue
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
  ctx.fill();
  ctx.stroke();

  // Draw Candy Icon
  const candyCanvas = iceCandiesImagesRef.current && iceCandiesImagesRef.current.pink;
  if (candyCanvas) {
     ctx.save();
     // Translate to the center of the icon's intended position
     ctx.translate(boxX + paddingX + iconW / 2, boxY + boxHeight / 2);
     // Rotate slightly (15 degrees)
     ctx.rotate(15 * Math.PI / 180);
     ctx.drawImage(candyCanvas, -iconW / 2, -iconH / 2, iconW, iconH);
     ctx.restore();
  }

  // Draw Text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  // Subtle drop shadow for text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillText(scoreNumText, boxX + paddingX + iconW + gap, boxY + boxHeight / 2 + 2);
  
  // Reset shadow and baseline
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.textBaseline = 'alphabetic';

  // 10. TUTORIAL OVERLAY (first show Move Forward for 5s, then show Jump for 5s, below platform line)
  const PHASE1_END = 600; // 5 seconds at 120fps
  const TRANSITION = 60;  // 0.5s transition
  const PHASE2_END = PHASE1_END + TRANSITION + 600; // 1260
  const FADE_OUT = 60; // 1320 total

  const currentTimer = state.tutorialTimer || 0;

  if (currentTimer < PHASE2_END + FADE_OUT) {
    const t = currentTimer;
    const halfW = W / 2;
    // Platform starts at: H - platformHeight. Middle of platform is: H - platformHeight * 0.5
    const centerY = H - platformHeight * 0.5;

    // --- PHASE 1: MOVE FORWARD (0 to 600 + transition fade) ---
    if (t < PHASE1_END + TRANSITION) {
      let alpha = 1.0;
      if (t < 30) alpha = t / 30; // fade in
      else if (t > PHASE1_END) alpha = Math.max(0, 1 - (t - PHASE1_END) / TRANSITION); // fade out

      if (alpha > 0) {
        ctx.save();
        const pulse = 0.9 + 0.1 * Math.sin(t * 0.1);
        
        // Left side highlight
        const leftGrad = ctx.createRadialGradient(halfW * 0.5, centerY, 10, halfW * 0.5, centerY, halfW * 0.4);
        leftGrad.addColorStop(0, `rgba(100, 220, 255, ${0.22 * pulse * alpha})`);
        leftGrad.addColorStop(1, `rgba(100, 220, 255, 0)`);
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, H - platformHeight, halfW, platformHeight);

        // Draw Vector Icon: Circle with Right Arrow (Move Forward)
        ctx.translate(halfW * 0.5, centerY - 25); // moved slightly higher to fit two lines
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Arrow pointing right
        ctx.beginPath();
        ctx.moveTo(-7 * pulse, 0);
        ctx.lineTo(7 * pulse, 0);
        ctx.moveTo(2 * pulse, -5 * pulse);
        ctx.lineTo(7 * pulse, 0);
        ctx.lineTo(2 * pulse, 5 * pulse);
        ctx.stroke();
        ctx.restore();

        // Label (Split into two lines for screen visibility)
        ctx.save();
        ctx.font = `bold 14px "Inter", sans-serif`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.textAlign = 'center';
        ctx.shadowColor = `rgba(0,0,0,0.8)`;
        ctx.shadowBlur = 4;
        ctx.fillText('HOLD HERE', halfW * 0.5, centerY + 18);
        ctx.font = `bold 12px "Inter", sans-serif`;
        ctx.fillStyle = `rgba(200, 240, 255, ${alpha})`;
        ctx.fillText('TO MOVE FORWARD', halfW * 0.5, centerY + 36);
        ctx.restore();
      }
    }

    // --- PHASE 2: JUMP & DOUBLE JUMP (660 to 1260 + fade out) ---
    if (t >= PHASE1_END) {
      let alpha = 0;
      const t2 = t - PHASE1_END;
      if (t2 < TRANSITION) alpha = t2 / TRANSITION; // fade in
      else if (t > PHASE2_END) alpha = Math.max(0, 1 - (t - PHASE2_END) / FADE_OUT); // fade out
      else alpha = 1.0;

      if (alpha > 0) {
        ctx.save();
        const pulse = 0.9 + 0.1 * Math.sin(t * 0.1);
        
        // Right side highlight
        const rightGrad = ctx.createRadialGradient(halfW + halfW * 0.5, centerY, 10, halfW + halfW * 0.5, centerY, halfW * 0.4);
        rightGrad.addColorStop(0, `rgba(255, 180, 80, ${0.22 * pulse * alpha})`);
        rightGrad.addColorStop(1, `rgba(255, 180, 80, 0)`);
        ctx.fillStyle = rightGrad;
        ctx.fillRect(halfW, H - platformHeight, halfW, platformHeight);

        // Draw Vector Icon: Circle with Up Arrow (Jump)
        ctx.translate(halfW + halfW * 0.5, centerY - 25);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Arrow pointing up
        ctx.beginPath();
        ctx.moveTo(0, 7 * pulse);
        ctx.lineTo(0, -7 * pulse);
        ctx.moveTo(-5 * pulse, -2 * pulse);
        ctx.lineTo(0, -7 * pulse);
        ctx.lineTo(5 * pulse, -2 * pulse);
        ctx.stroke();
        ctx.restore();

        // Labels
        ctx.save();
        ctx.font = `bold 14px "Inter", sans-serif`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.textAlign = 'center';
        ctx.shadowColor = `rgba(0,0,0,0.8)`;
        ctx.shadowBlur = 4;
        ctx.fillText('TAP HERE TO JUMP', halfW + halfW * 0.5, centerY + 18);
        ctx.font = `bold 12px "Inter", sans-serif`;
        ctx.fillStyle = `rgba(255, 220, 180, ${alpha})`;
        ctx.fillText('TAP AGAIN TO DOUBLE JUMP', halfW + halfW * 0.5, centerY + 38);
        ctx.restore();
      }
    }
  }

  ctx.restore(); // Restore DPI scale
};
