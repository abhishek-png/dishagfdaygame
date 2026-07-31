document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const scratchCanvas = document.getElementById("scratch-canvas");
    const voucherCanvas = document.getElementById("voucher-canvas");
    const playTab = document.getElementById("play-tab");
    const startBtn = document.getElementById("start-game-btn");
    const bgAudio = document.getElementById("bg-audio");
  
    const scratchScreen = document.getElementById("scratch-screen");
    const gameScreen = document.getElementById("game-screen");
    const verticalWorld = document.getElementById("vertical-world");
    const player = document.getElementById("player");
  
    const joystickKnob = document.getElementById("joystick-knob");
    const joystickContainer = document.getElementById("joystick-container");
  
    const memoryModal = document.getElementById("memory-modal");
    const modalBody = document.getElementById("modal-body");
    const closeModal = document.querySelector(".close-btn");
  
    const finalVoucherScratch = document.getElementById("final-voucher-scratch");
  
    // World Settings
    const worldHeight = 8000;
    const worldWidth = window.innerWidth;
    const playerSizeWidth = 90;
    const playerSizeHeight = 110;
  
    let playerX = (worldWidth / 2) - (playerSizeWidth / 2);
    let playerY = 120;
  
    let hasReachedFlag = false;
    const memoriesOpenedSet = new Set();
    const memoryPlatforms = [];
    const npcList = [];
  
    // Joystick Variables
    let joystickActive = false;
    let joystickStartX = 0;
    let joystickStartY = 0;
    const joystickMaxRange = 60; 
    const maxMoveSpeed = 16; 
    let speedX = 0;
    let speedY = 0;
  
    // --- SCRATCH CANVAS LOGIC ---
    function initScratchCanvas(canvas, coverColor = "#C0C0C0", coverText = "Scratch Here! 🪙") {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = coverColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#666";
      ctx.font = "bold 18px Poppins";
      ctx.textAlign = "center";
      ctx.fillText(coverText, canvas.width / 2, canvas.height / 2 + 5);
  
      let isDrawing = false;
  
      function scratch(e) {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const x = clientX - rect.left;
        const y = clientY - rect.top;
  
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
  
        checkScratchPercentage(canvas, ctx);
      }
  
      function checkScratchPercentage(cvs, context) {
        const imgData = context.getImageData(0, 0, cvs.width, cvs.height);
        let clearedPixels = 0;
        for (let i = 3; i < imgData.data.length; i += 4) {
          if (imgData.data[i] === 0) clearedPixels++;
        }
        const percent = (clearedPixels / (cvs.width * cvs.height)) * 100;
  
        if (percent > 45) {
          cvs.style.pointerEvents = "none";
          cvs.style.opacity = "0";
          cvs.style.transition = "opacity 0.7s";
          
          if (cvs.id === "scratch-canvas") {
            playTab.classList.remove("hidden");
          }
        }
      }
  
      canvas.addEventListener("mousedown", () => isDrawing = true);
      canvas.addEventListener("mouseup", () => isDrawing = false);
      canvas.addEventListener("mousemove", scratch);
  
      canvas.addEventListener("touchstart", (e) => { isDrawing = true; e.preventDefault(); });
      canvas.addEventListener("touchend", () => isDrawing = false);
      canvas.addEventListener("touchmove", scratch);
    }
  
    initScratchCanvas(scratchCanvas);
  
    // --- GAME START ---
    startBtn.addEventListener("click", () => {
      bgAudio.play();
      scratchScreen.classList.remove("active");
      gameScreen.classList.add("active");
      setupVerticalWorld();
      updateWorldScroll();
      updateCharacterPosition();
      requestAnimationFrame(gameLoop);
    });
  
    // --- BUILD WORLD WITH PLATFORMS & NPCs ---
    const memoryItems = [];
    for (let i = 1; i <= 20; i++) memoryItems.push({ type: "image", src: `assets/images/photo${i}.jpg` });
    for (let i = 1; i <= 10; i++) memoryItems.push({ type: "video", src: `assets/videos/video${i}.mp4` });
  
    memoryItems.sort(() => Math.random() - 0.5);
  
    const npcGlossary = ["🐢", "🍄", "🐉", "🦀", "🦖"];
  
    function setupVerticalWorld() {
      const platformSpacing = (worldHeight - 800) / memoryItems.length;
  
      memoryItems.forEach((item, index) => {
        // Create Platform
        const platformDiv = document.createElement("div");
        platformDiv.className = "platform";
        const pWidth = 160; 
        const xPos = Math.random() * (worldWidth - pWidth - 30) + 15;
        const yPos = 300 + index * platformSpacing;
        
        platformDiv.style.left = `${xPos}px`;
        platformDiv.style.bottom = `${yPos}px`;
        verticalWorld.appendChild(platformDiv);
  
        memoryPlatforms.push({ element: platformDiv, x: xPos, y: yPos, width: pWidth, height: 25, memoryIndex: index });
  
        // Memory Question Block
        const memoryBlock = document.createElement("div");
        memoryBlock.className = "vertical-interactable";
        memoryBlock.innerText = "❓";
        memoryBlock.dataset.itemIndex = index;
        platformDiv.appendChild(memoryBlock);
  
        // Add Dynamic Moving Background NPCs around platform
        const npcDiv = document.createElement("div");
        npcDiv.className = "moving-npc";
        npcDiv.innerText = npcGlossary[index % npcGlossary.length];
        const npcX = (xPos + 180 > worldWidth - 50) ? xPos - 50 : xPos + 170;
        npcDiv.style.left = `${npcX}px`;
        npcDiv.style.bottom = `${yPos}px`;
        verticalWorld.appendChild(npcDiv);
  
        npcList.push({ element: npcDiv, x: npcX, y: yPos });
      });
  
      // Final Flag Goal
      const flagDiv = document.createElement("div");
      flagDiv.className = "final-flag-point";
      flagDiv.innerText = "🚩";
      flagDiv.style.bottom = `${worldHeight - 300}px`;
      flagDiv.style.left = `calc(50vw - 40px)`;
      verticalWorld.appendChild(flagDiv);
    }
  
    // --- DUAL CONTROLS JOYSTICK (TOUCH + MOUSE) ---
    function handleJoystickStart(clientX, clientY) {
      joystickActive = true;
      joystickStartX = clientX;
      joystickStartY = clientY;
      joystickKnob.style.transition = 'none';
    }
  
    function handleJoystickMove(clientX, clientY) {
      if (!joystickActive) return;
  
      let deltaX = clientX - joystickStartX;
      let deltaY = clientY - joystickStartY;
  
      let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > joystickMaxRange) {
          deltaX = (deltaX / distance) * joystickMaxRange;
          deltaY = (deltaY / distance) * joystickMaxRange;
          distance = joystickMaxRange;
      }
  
      joystickKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  
      const speedMult = distance / joystickMaxRange;
      speedX = (deltaX / (distance || 1)) * (maxMoveSpeed * speedMult);
      speedY = (deltaY / (distance || 1)) * (maxMoveSpeed * speedMult) * -1; 
    }
  
    function handleJoystickEnd() {
      if (!joystickActive) return;
      joystickActive = false;
      
      joystickKnob.style.transition = 'transform 0.2s ease-out';
      joystickKnob.style.transform = `translate(0px, 0px)`;
  
      speedX = 0; speedY = 0;
    }
  
    // Touch Controls
    joystickContainer.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleJoystickStart(e.touches[0].clientX, e.touches[0].clientY);
    });
  
    window.addEventListener("touchmove", (e) => {
      if (joystickActive) handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY);
    });
  
    window.addEventListener("touchend", handleJoystickEnd);
  
    // Mouse Controls (For Desktop Testing)
    joystickContainer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      handleJoystickStart(e.clientX, e.clientY);
    });
  
    window.addEventListener("mousemove", (e) => {
      if (joystickActive) handleJoystickMove(e.clientX, e.clientY);
    });
  
    window.addEventListener("mouseup", handleJoystickEnd);
  
    // --- GAME LOOP ---
    function gameLoop() {
      if (!gameScreen.classList.contains("active") || hasReachedFlag) return;
  
      if (joystickActive) {
          movePlayer(speedX, speedY);
      }
  
      updateWorldScroll();
      requestAnimationFrame(gameLoop);
    }
  
    // --- CHARACTER MOVEMENT ---
    function movePlayer(dx, dy) {
      playerX += dx;
      playerY += dy;
  
      playerX = Math.max(0, Math.min(worldWidth - playerSizeWidth, playerX));
      playerY = Math.max(120, Math.min(worldHeight - playerSizeHeight, playerY));
  
      updateCharacterPosition();
      checkDynamicContacts();
    }
  
    function updateCharacterPosition() {
      player.style.left = `${playerX}px`;
      player.style.bottom = `${playerY}px`;
    }
  
    function updateWorldScroll() {
      const screenHeight = window.innerHeight;
      let currentScrollY = playerY - (screenHeight * 0.4); 
      currentScrollY = Math.max(0, Math.min(worldHeight - screenHeight, currentScrollY));
      verticalWorld.style.transform = `translateY(${currentScrollY}px)`; 
    }
  
    // --- COLLISIONS & INTERACTIONS ---
    function checkDynamicContacts() {
      const characterHeight = 110;
      const blocks = document.querySelectorAll(".vertical-interactable");
      
      // Check Memory Blocks
      blocks.forEach((block) => {
          const platform = platformFromBlock(block);
          if (!platform) return;
          
          const blockBottomY = platform.y + platform.height + 25;
          const blockTopY = blockBottomY + 50;
          
          const charBottomY = playerY;
          const charTopY = charBottomY + characterHeight;
          
          if (charTopY >= blockBottomY && charBottomY <= blockTopY) {
              const charCenterX = playerX + (playerSizeWidth / 2);
              if (charCenterX >= platform.x && charCenterX <= platform.x + platform.width) {
                  const idx = block.dataset.itemIndex;
                  if (!memoriesOpenedSet.has(idx)) {
                      memoriesOpenedSet.add(idx);
                      block.innerText = "❤️";
                      openMemoryModal(memoryItems[idx]);
                  }
              }
          }
      });
  
      // Check Harmless NPC Engagement Touch Effects
      npcList.forEach((npc) => {
        if (Math.abs(playerX - npc.x) < 50 && Math.abs(playerY - npc.y) < 60) {
          if (!npc.element.classList.contains("npc-touch-effect")) {
            npc.element.classList.add("npc-touch-effect");
            setTimeout(() => npc.element.classList.remove("npc-touch-effect"), 600);
          }
        }
      });
  
      // Check Final Flag Goal
      const flagGoalY = worldHeight - 300;
      if (!hasReachedFlag && playerY >= flagGoalY - 50 &&
          playerX + (playerSizeWidth / 2) >= (worldWidth / 2) - 100 &&
          playerX + (playerSizeWidth / 2) <= (worldWidth / 2) + 100) {
          triggerFinalEnding();
      }
    }
  
    function platformFromBlock(blockElement) {
      const parentPlatformEl = blockElement.parentElement;
      return memoryPlatforms.find(p => p.element === parentPlatformEl);
    }
  
    // --- MODAL CONTROLS ---
    function openMemoryModal(item) {
      modalBody.innerHTML = "";
      if (item.type === "image") {
        modalBody.innerHTML = `<img src="${item.src}" alt="Sweet Memory Photo" onError="this.src='https://via.placeholder.com/400x300?text=Grand+Memory+Photo'">`;
      } else {
        modalBody.innerHTML = `<video src="${item.src}" controls autoplay loop></video>`;
      }
      memoryModal.classList.remove("hidden");
    }
  
    closeModal.addEventListener("click", () => {
      const videoElement = modalBody.querySelector('video');
      if (videoElement) {
          videoElement.pause();
          videoElement.currentTime = 0;
      }
      memoryModal.classList.add("hidden");
    });
  
    memoryModal.addEventListener("click", (e) => {
        if (e.target === memoryModal) closeModal.click();
    });
  
    // --- FINALE ---
    function triggerFinalEnding() {
      hasReachedFlag = true;
      gameScreen.classList.remove("active");
      
      finalVoucherScratch.classList.add("active"); 
      finalVoucherScratch.classList.remove("hidden");
      
      initScratchCanvas(voucherCanvas, "#ffd700", "Voucher Scratch! 🪙");
    }
  });