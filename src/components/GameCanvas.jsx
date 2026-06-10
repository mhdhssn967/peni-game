import React, { useEffect, useRef, useState } from 'react';
import { generateIceCandyCanvas } from '../game/entities/IceCandy';
import { updatePhysics } from '../game/physics';
import { renderScene } from '../game/renderer';
const GameCanvas = ({ gameState }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const platformImageRef = useRef(null);
  const charJumpImageRef = useRef(null);
  const charWaveImageRef = useRef(null);
  const charIdleImageRef = useRef(null);
  const bgImagesRef = useRef([]);
  const iceCandiesImagesRef = useRef({});

  // Load resources
  useEffect(() => {
    iceCandiesImagesRef.current = {
      pink: generateIceCandyCanvas('pink'),
      green: generateIceCandyCanvas('green'),
      chocolate: generateIceCandyCanvas('chocolate'),
      orange: generateIceCandyCanvas('orange'),
      blue: generateIceCandyCanvas('blue')
    };

    let loadedCount = 0;
    const totalCount = 13;
    const onImgLoad = () => {
      loadedCount++;
      if (loadedCount === totalCount) {
        setImagesLoaded(true);
      }
    };

    const platImg = new Image();
    platImg.src = '/platform.png';
    platImg.onload = () => {
      platformImageRef.current = platImg;
      onImgLoad();
    };
    platImg.onerror = () => {
      console.warn("Failed to load /platform.png, falling back to procedural textures");
      onImgLoad();
    };

    const charJumpImg = new Image();
    charJumpImg.src = '/peni-jumpp.png';
    charJumpImg.onload = () => {
      charJumpImageRef.current = charJumpImg;
      onImgLoad();
    };
    charJumpImg.onerror = () => {
      console.warn("Failed to load /Peni-jump.png");
      onImgLoad();
    };

    const charWaveImg = new Image();
    charWaveImg.src = '/Peni-wave.png';
    charWaveImg.onload = () => {
      charWaveImageRef.current = charWaveImg;
      onImgLoad();
    };
    charWaveImg.onerror = () => {
      console.warn("Failed to load /Peni-wave.png");
      onImgLoad();
    };

    const charIdleImg = new Image();
    charIdleImg.src = '/peni-idle.png';
    charIdleImg.onload = () => {
      charIdleImageRef.current = charIdleImg;
      onImgLoad();
    };
    charIdleImg.onerror = () => {
      console.warn("Failed to load /peni-idle.png");
      onImgLoad();
    };

    const bgs = new Array(9);
    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      img.src = `/environment/${i}.png`;
      const index = i - 1;
      
      let customScale, customGap, customOffset, isStartAsset;
      if (i === 8) {
        customScale = 0.9; // Always bigger and same size
        customGap = 9999999; // Never repeat, only at the beginning
        customOffset = 0; // Exactly at start line
        isStartAsset = true;
      } else {
        customScale = 1.0 + (Math.random() * 0.8); // Make them bigger
        customGap = 300 + (Math.random() * 1200); // Random gap
        customOffset = 500 + Math.random() * 2000; // Pushed forward
        isStartAsset = false;
      }
      
      img.onload = () => {
        // Pre-render filter for massive mobile performance boost
        const offscreen = document.createElement('canvas');
        offscreen.width = img.width;
        offscreen.height = img.height;
        const oCtx = offscreen.getContext('2d');
        const fogAmount = (8 - index) / 8;
        const brightness = 75 - (fogAmount * 35);
        const contrast = 90 - (fogAmount * 30);
        oCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${fogAmount * 30}%)`;
        oCtx.drawImage(img, 0, 0);
        
        offscreen.customScale = customScale;
        offscreen.customGap = customGap;
        offscreen.customOffset = customOffset;
        offscreen.isStartAsset = isStartAsset;
        offscreen.complete = true;
        offscreen.naturalHeight = img.height;
        
        bgs[index] = offscreen;
        onImgLoad();
      };
      img.onerror = () => {
        console.warn(`Failed to load /environment/${i}.png`);
        onImgLoad();
      };
    }
    bgImagesRef.current = bgs;
  }, []);

  // Scene scrolling and animation state
  const stateRef = useRef({
    time: 0,
    scrollX: 0,
    clouds: [
      { x: 50, y: 120, speed: 0.15, scale: 0.8, opacity: 0.85 },
      { x: 250, y: 80, speed: 0.08, scale: 1.2, opacity: 0.6 },
      { x: 120, y: 190, speed: 0.12, scale: 0.9, opacity: 0.75 },
      { x: 380, y: 150, speed: 0.2, scale: 0.65, opacity: 0.9 }
    ],
    particles: Array.from({ length: 25 }, () => ({
      x: Math.random() * 450,
      y: Math.random() * 800,
      size: Math.random() * 3 + 1,
      speedY: -(Math.random() * 0.4 + 0.1),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseDir: 1
    })),
    // Character properties
    charY: 0,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    hasJumped: false,
    currentAudio: null,
    jumpTrail: [],
    landingTimer: 0,
    runFrameTimer: 0,
    runFrameIndex: 0,
    isCharging: false,
    chargeValue: 0,
    fallFrameIndex: 18,
    fallFrameTimer: 0,
    candies: [] // will be populated in draw loop when sizes are known
  });

  const playJumpSound = (chargeValue) => {
    const state = stateRef.current;
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }
    let soundFile = '';
    if (chargeValue >= 0.95) {
      soundFile = '/sounds/weelong.mp3';
    } else {
      const rand = Math.floor(Math.random() * 4) + 1;
      soundFile = `/sounds/wee${rand}.mp3`;
    }
    const audio = new Audio(soundFile);
    state.currentAudio = audio;
    audio.play().catch(e => console.warn("Audio play failed:", e));
  };

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Keyboard Jump inputs (Space, ArrowUp)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        const state = stateRef.current;
        if (!state.isJumping && !state.isCharging) {
          state.isCharging = true;
          state.chargeValue = 0;
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        const state = stateRef.current;
        if (state.isCharging) {
          state.isJumping = true;
          state.hasJumped = true;
          state.isCharging = false;
          playJumpSound(state.chargeValue);
          // Jump velocity is proportional to charge (range: -3.5 to -9.0 for slower parabolic trajectory)
          state.velocityY = -3.5 - (5.5 * state.chargeValue);
          // Horizontal velocity is proportional to charge (range: 1.0 to 4.0)
          state.velocityX = 1.0 + (3.0 * state.chargeValue);
          state.landingTimer = 0;
          state.fallFrameIndex = 18;
          state.fallFrameTimer = 0;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Draw Loop
  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const state = stateRef.current;

      const platImg = platformImageRef.current;
      const platformHeight = canvas.height * 0.40; // 40% of the screen height
      const platformWidth = platImg ? (platImg.width * (platformHeight / platImg.height)) : canvas.width;

      updatePhysics(state, canvas, gameState, platformWidth, platformHeight, playJumpSound);

      const refs = {
        platformImageRef, charJumpImageRef, charWaveImageRef, charIdleImageRef, bgImagesRef, iceCandiesImagesRef
      };
      
      renderScene(ctx, canvas, state, platformHeight, platformWidth, gameState, refs);

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [imagesLoaded, gameState]);



  const handleStartCharge = (e) => {
    if (e.target.closest('button')) return;
    const state = stateRef.current;
    if (!state.isJumping && !state.isCharging) {
      state.isCharging = true;
      state.chargeValue = 0;
    }
  };

  const handleReleaseCharge = (e) => {
    const state = stateRef.current;
    if (state.isCharging) {
      state.isJumping = true;
      state.hasJumped = true;
      state.isCharging = false;
      playJumpSound(state.chargeValue);
      // Jump velocity is proportional to charge (range: -3.5 to -9.0 for slower parabolic trajectory)
      state.velocityY = -3.5 - (5.5 * state.chargeValue);
      // Horizontal velocity is proportional to charge (range: 1.0 to 4.0)
      state.velocityX = 1.0 + (3.0 * state.chargeValue);
      state.landingTimer = 0;
      state.fallFrameIndex = 18;
      state.fallFrameTimer = 0;
    }
  };

  return (
    <div 
      onMouseDown={handleStartCharge}
      onMouseUp={handleReleaseCharge}
      onMouseLeave={handleReleaseCharge}
      onTouchStart={handleStartCharge}
      onTouchEnd={handleReleaseCharge}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
};

export default GameCanvas;
