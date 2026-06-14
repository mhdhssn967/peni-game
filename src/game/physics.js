export const updatePhysics = (state, canvas, gameState, platformWidth, platformHeight, playJumpSound) => {
  state.time += 1;

  const isPlaying = gameState === 'playing';
  const runSpeed = 4.0;
  const driftSpeed = 0.4;
  const speedMultiplier = isPlaying ? runSpeed : driftSpeed;

  const logicalWidth = canvas.logicalWidth || canvas.width;
  const logicalHeight = canvas.logicalHeight || canvas.height;

  const charHeight = 130;
  const platTopVisible = logicalHeight - platformHeight + (platformHeight * 65 / 582);
  const charGroundY = platTopVisible - charHeight + (charHeight * 57 / 256);

  let currentScrollSpeed = 0;
  if (state.isJumping) {
    const heightAboveGround = charGroundY - state.charY;
    const heightRatio = Math.max(0.1, Math.min(1.0, heightAboveGround / 150));
    const easedScrollSpeed = state.velocityX * heightRatio;

    state.scrollX += easedScrollSpeed;
    currentScrollSpeed = easedScrollSpeed;

    if (state.time % 3 === 0) {
      state.jumpTrail.push({
        x: logicalWidth * 0.12 + 130 / 2,
        y: state.charY + 130 / 2 + 20,
        opacity: 0.8,
        size: 4 + Math.random() * 3
      });
    }
  }

  for (let i = state.jumpTrail.length - 1; i >= 0; i--) {
    const dot = state.jumpTrail[i];
    dot.x -= currentScrollSpeed;
    dot.opacity -= 0.015;
    if (dot.opacity <= 0) {
      state.jumpTrail.splice(i, 1);
    }
  }

  if (state.isCharging) {
    // Initialize direction if not present (1 for increasing, -1 for decreasing)
    if (!state.chargeDirection) state.chargeDirection = 1;
    if (state.chargeHoldTimer === undefined) state.chargeHoldTimer = 0;
    
    if (state.chargeHoldTimer > 0) {
      state.chargeHoldTimer--;
    } else {
      state.chargeValue += 0.008 * state.chargeDirection; 
      
      // Ping-pong the charge value between 0 and 1
      if (state.chargeValue >= 1.0) {
        state.chargeValue = 1.0;
        state.chargeDirection = -1;
        state.chargeHoldTimer = 60; // 60 frames at 120fps = 0.5 seconds pause at max power
      } else if (state.chargeValue <= 0.0) {
        state.chargeValue = 0.0;
        state.chargeDirection = 1;
      }
    }
  } else {
    // Reset direction and timer when not charging
    state.chargeDirection = 1;
    state.chargeHoldTimer = 0;
  }

  if (state.floatingTexts) {
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y -= ft.isBig ? 2.5 : 1.5; // Big numbers float faster
      ft.life -= 1;
      ft.opacity = Math.max(0, ft.life / 60);
      if (ft.life <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }
  }

  const peniWorldX = state.scrollX + (logicalWidth * 0.12) + (130 / 2);

  // Check for jumped-over (skipped) candies and animate moving platforms
  if (state.candies) {
    for (let i = 0; i < state.candies.length; i++) {
      const candy = state.candies[i];
      
      // Animate moving platforms
      if (candy.isMoving) {
        candy.movePhase += candy.moveSpeed * 0.02;
        candy.yOffset = candy.baseYOffset + Math.sin(candy.movePhase) * candy.moveRange;
      }
      
      if (peniWorldX > candy.x + 115 && !candy.hasScored && !candy.passed) {
        candy.passed = true;
        candy.hasScored = true;
        state.skippedCandiesThisJump = (state.skippedCandiesThisJump || 0) + 1;
      }
    }
  }

  if (state.isJumping) {
    let currentGravity = 0.14;
    if (Math.abs(state.velocityY) < 1.5) {
      currentGravity = 0.06;
    } else if (state.velocityY > 0) {
      currentGravity = 0.18;
    }
    
    state.velocityY += currentGravity;
    state.charY += state.velocityY;

    if (state.velocityY >= 0) {
      state.fallFrameTimer++;
      if (state.fallFrameTimer >= 6) {
        state.fallFrameTimer = 0;
        state.fallFrameIndex = Math.min(24, state.fallFrameIndex + 1);
      }
    } else {
      state.fallFrameIndex = 18;
      state.fallFrameTimer = 0;
    }

    const peniWorldX = state.scrollX + (logicalWidth * 0.12) + (130 / 2);
    const L_plat = platformWidth;

    if (state.candies.length === 0) {
      let startCandyX = L_plat + 50; 
      const types = ['pink', 'green', 'chocolate', 'orange', 'blue'];
      for(let i=0; i<100; i++) {
          // Progressive difficulty: first 5 candies are a 2px gap safe runway
          let yOffset = 0;
          let gap = 2;
          let isMoving = false;
          let moveSpeed = 0;
          let moveRange = 0;
          
          if (i > 4) {
            // Increased difficulty: wider gaps and steeper heights
            const difficultyScale = Math.min(2.0, 1 + (i - 5) * 0.03); 
            yOffset = (Math.random() - 0.5) * 160 * difficultyScale; 
            gap = 50 + Math.random() * 120 * difficultyScale; 
          }
          
          if (i > 9) {
            // After candy 10, make random alternate candies move up and down!
            if (Math.random() > 0.5) {
              isMoving = true;
              moveSpeed = 1.0 + Math.random() * 2.0; // speed of oscillation
              moveRange = 50 + Math.random() * 80; // pixels to move up and down
            }
          }

          const randomType = types[Math.floor(Math.random() * types.length)];
          state.candies.push({ 
            x: startCandyX, 
            type: randomType, 
            yOffset, 
            baseYOffset: yOffset,
            hasScored: false, 
            passed: false,
            isMoving,
            moveSpeed,
            moveRange,
            movePhase: Math.random() * Math.PI * 2
          });
          startCandyX += 140 + gap; 
      }
    }

    const isOnPlatform1 = peniWorldX >= 0 && peniWorldX <= L_plat;
    let isOnCandy = false;
    let activeCandyYOffset = 0;
    let activeCandy = null;
    
    for (let i = 0; i < state.candies.length; i++) {
      const candy = state.candies[i];
      if (peniWorldX >= candy.x + 25 && peniWorldX <= candy.x + 115) {
        isOnCandy = true;
        activeCandyYOffset = candy.yOffset;
        activeCandy = candy;
        break;
      }
    }

    const isOnPlatform = isOnPlatform1 || isOnCandy;
    const targetGroundY = isOnCandy ? charGroundY + activeCandyYOffset : charGroundY;

    if (state.charY >= targetGroundY) {
      if (isOnPlatform && state.velocityY >= 0) {
        state.charY = targetGroundY;
        state.isJumping = false;
        state.velocityY = 0;
        state.landingTimer = 8;
        state.fallFrameIndex = 18;
        state.fallFrameTimer = 0;
        if (state.currentAudio) {
          state.currentAudio.pause();
          state.currentAudio.currentTime = 0;
          state.currentAudio = null;
        }
        
        if (isOnCandy && activeCandy && !activeCandy.hasScored) {
          activeCandy.hasScored = true;
          
          const skipped = state.skippedCandiesThisJump || 0;
          const jumpPoints = skipped > 0 ? (skipped * 5) : 1;
          
          state.score = (state.score || 0) + jumpPoints;
          state.floatingTexts = state.floatingTexts || [];
          state.floatingTexts.push({
            x: activeCandy.x + 70, // center of candy
            y: targetGroundY - 40,
            text: `+${jumpPoints}`,
            opacity: 1.0,
            life: 60,
            isBig: jumpPoints > 1
          });
          
          state.skippedCandiesThisJump = 0; // reset for next jump
        }
      } else if (!isOnPlatform) {
        if (state.charY > logicalHeight + 150) {
          state.scrollX = 0;
          state.charY = charGroundY;
          state.velocityY = 0;
          state.isJumping = false;
          state.fallFrameIndex = 18;
          state.fallFrameTimer = 0;
          state.score = 0; // Reset score on death
          state.skippedCandiesThisJump = 0;
          state.candies = []; // Regenerate candies on respawn
          if (state.currentAudio) {
            state.currentAudio.pause();
            state.currentAudio.currentTime = 0;
            state.currentAudio = null;
          }
        }
      }
    }
  } else {
    // Determine target ground even when not jumping to stay snapped correctly
    const peniWorldX = state.scrollX + (logicalWidth * 0.12) + (130 / 2);
    let activeCandyYOffset = 0;
    let isOnCandy = false;
    for (let i = 0; i < state.candies.length; i++) {
      const candy = state.candies[i];
      if (peniWorldX >= candy.x + 25 && peniWorldX <= candy.x + 115) {
        isOnCandy = true;
        activeCandyYOffset = candy.yOffset;
        break;
      }
    }
    const targetGroundY = isOnCandy ? charGroundY + activeCandyYOffset : charGroundY;
    state.charY = targetGroundY;

    if (state.landingTimer > 0) {
      state.landingTimer--;
    }
  }

  return { charGroundY, currentScrollSpeed };
};
