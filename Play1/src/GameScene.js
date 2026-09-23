import Phaser from 'phaser';

// Import all textures
import bgImg from './assets/Texture/bg_stadium.webp';
import trophyCleanImg from './assets/Texture/trophy_clean.webp';
import trophyWetImg from './assets/Texture/trophy_wet.webp';
import trophyDirtyImg from './assets/Texture/trophy_dirty.webp';  
import trophyShadowImg from './assets/Texture/shadow.webp';
import mudSplatterImg from './assets/Texture/mud_splatter.webp';
import sparkleImg from './assets/Texture/sparkle.webp';
import radialGlowImg from './assets/Texture/radial_glow.webp';
import btnTryNowImg from './assets/Texture/btn_try_now.webp';
import progressBgImg from './assets/Texture/progress_bg.webp';
import progressFillImg from './assets/Texture/progress_fill.webp';
import gunNozzleImg from './assets/Texture/gun_nozzle.webp';
import gunNozzle1Img from './assets/Texture/gun_nozzle1.webp';
import waterPipeImg from './assets/Texture/water_pipe.webp';
import bubbleImg from './assets/Texture/bubble.webp';
import btnToolImg from './assets/Texture/btn_Tool.png';
import handImg from './assets/Texture/hand.webp';
import waterImg from './assets/Texture/water.webp';
import waterDropsImg from './assets/Texture/water_drops.webp';

// Import sounds
import sparkleSnd from './assets/Sound/sparkle.mp3';
import winSnd from './assets/Sound/win.mp3';
import clickSnd from './assets/Sound/click.mp3';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load textures
        this.load.image('bg_stadium', bgImg);
        this.load.image('trophy_clean', trophyCleanImg);
        this.load.image('trophy_wet', trophyWetImg);
        this.load.image('trophy_dirty', trophyDirtyImg);
        this.load.image('trophy_shadow',trophyShadowImg);
        this.load.image('mud_splatter', mudSplatterImg);
        this.load.image('sparkle', sparkleImg);
        this.load.image('radial_glow', radialGlowImg);
        this.load.image('btn_try_now', btnTryNowImg);
        this.load.image('progress_bg', progressBgImg);
        this.load.image('progress_fill', progressFillImg);
        this.load.image('gun_nozzle', gunNozzleImg);
        this.load.image('gun_nozzle1', gunNozzle1Img);
        this.load.image('water_pipe', waterPipeImg);
        this.load.image('bubble', bubbleImg);
        this.load.image('btn_tool', btnToolImg);
        this.load.image('hand', handImg);
        this.load.image('water', waterImg);
        this.load.image('water_drops', waterDropsImg);

        // Load audio
        this.load.audio('sparkle', sparkleSnd);
        this.load.audio('win', winSnd);
        this.load.audio('click', clickSnd);

        // Tạo mảnh pháo hoa giấy (Confetti) hình chữ nhật nhỏ
        let cGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        cGraphics.fillStyle(0xffffff, 1);
        cGraphics.fillRect(0, 0, 10, 6); // Mảnh giấy 10x6
        cGraphics.generateTexture('confetti', 10, 6);

    }

    create() {


        this.gameWidth = 450;
        this.gameHeight = 800;
        this.isGameEnd = false;
        this.isSpraying = false;
        this.hasStartedInteracting = false; // Chỉ bắt đầu đếm nhấp nháy sau khi người chơi chạm vào dụng cụ lần đầu
        this.isAudioPlaying = false; // Biến kiểm tra âm thanh phun nước đang phát hay chưa
        this.hasSelectedTool = false;
        this.canClean = false;
        this.progress = 0;
        this.cleanedPointsCount = 0;
        this.lastWashSoundTime = 0;
        this.lastCanvasX = null;
        this.lastCanvasY = null;

        this.targetShiftY = 0;
        this.currentShiftY = 0;
        this.targetShiftX = 0;
        this.currentShiftX = 0;
        this.targetBgShiftX = 0;
        this.currentBgShiftX = 0;
        this.baseTrophyX = this.gameWidth / 2;
        this.baseBgX = this.gameWidth / 2 - 10;
        this.baseTrophyY = this.gameHeight * 0.48;
        this.baseBgY = this.gameHeight * 0.35;

        // Sound instances
        this.sparkleSound = this.sound.add('sparkle', { volume: 0.8 });
        this.winSound = this.sound.add('win', { volume: 0.9 });
        this.clickSound = this.sound.add('click', { volume: 0.8 });

        // Khởi tạo bộ tạo âm thanh xịt nước áp lực cao (Web Audio Synthesis)
        this.createProceduralWaterSound();


        const actualWidth = this.scale.width;
        const actualHeight = this.scale.height;
        const dx = (actualWidth - this.gameWidth ) / 2;
        const dy = (actualHeight - this.gameHeight) / 2;
        this.cameras.main.setScroll(-dx, -dy);


        //const { width, height } = {this.gameWidth,this.gameHeight};
        this.bg = this.add.image(this.gameWidth / 2 - 10, this.baseBgY - 150, 'bg_stadium');
        this.bg.setDepth(-1);
        const bgScaleX = this.gameWidth / this.bg.width;
        const bgScaleY = this.gameHeight / this.bg.height;
        this.bg.setScale(Math.max(bgScaleX, bgScaleY) * 2.45);

        // Set initial wide camera zoom (1.4x wider view)
        this.cameraZoomTween = null;
        this.cameras.main.setZoom(1 / 1.4);

        // 2. Setup Trophy (Clean underneath, Dirty Canvas on top)
        this.setupTrophy();

        // 3. Water Jet Graphics & Particles
        this.setupEffects();

        // 4. Pressure Washer Gun (initially off-screen)
        this.setupWaterGun();

        // 5. UI Elements
        this.setupUI();

        // 6. Tutorial Hand (for cleaning)
        this.setupTutorial();

        // 7. Tool Selection UI (Choose tool first before cleaning)
        this.setupToolSelection();

        // 8. Setup Separate UI Camera (fixes UI scale & position independent of world zoom)
        this.setupCameras();

        // 9. Input listeners
        this.setupInput();

        // Resize handler
        this.scale.on('resize', this.handleResize, this);

        // Notify Playturbo
        if (typeof window.gameReady === 'function') {
            window.gameReady();
        }
    }

    resizeBackground() {
        const { width, height } = this.scale;
        this.baseBgY = height / 2;
        this.bg.setPosition(width / 2, this.baseBgY);
        const scaleX = width / this.bg.width;
        const scaleY = height / this.bg.height;
        const maxScale = Math.max(scaleX, scaleY) * 1.65;
        this.bg.setScale(maxScale);
    }

    setupTrophy() {
        const width = this.gameWidth;
        const height = this.gameHeight;

        this.baseTrophyX = width / 2;
        this.trophyX = this.baseTrophyX + this.currentShiftX;
        this.baseTrophyY = height * 0.38;
        this.trophyY = this.baseTrophyY;

        const targetTrophyHeight = Math.min(height * 0.58, 540);
        const scale = targetTrophyHeight / 1024;
        this.trophyScale = scale;

        this.trophyDisplayW = 1040 * scale;
        this.trophyDisplayH = 1000 * scale;

        // Glow behind trophy for victory (Depth 4)
        this.trophyGlow = this.add.image(this.trophyX, this.trophyY, 'radial_glow');
        this.trophyGlow.setDepth(4);
        this.trophyGlow.setScale(scale * 2.5);
        this.trophyGlow.setTint(0xffdf66);
        this.trophyGlow.setAlpha(0);

        this.trophyShadow = this.add.image(this.trophyX, this.trophyY + 145, 'trophy_shadow');
        this.trophyShadow.setScale(0.45);
        this.trophyShadow.setDepth(3);

        // Clean Golden Trophy Underneath (Depth 5)
        this.trophyClean = this.add.image(this.trophyX, this.trophyY, 'trophy_clean');
        this.trophyClean.setDepth(5);
        this.trophyClean.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);

        // Wet Trophy Layer on top of Clean (Depth 6) - revealed when cleaning
        this.trophyWet = this.add.image(this.trophyX, this.trophyY, 'trophy_wet');
        this.trophyWet.setDepth(6);
        this.trophyWet.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);

        // Create Dynamic Canvas Texture for the Dirty Mud Layer on top (Depth 10)
        const dirtySource = this.textures.get('trophy_dirty').getSourceImage();
        this.dirtyCanvasW = dirtySource.width;
        this.dirtyCanvasH = dirtySource.height;

        if (this.textures.exists('mud_canvas_tex')) {
            this.textures.remove('mud_canvas_tex');
        }




        this.mudCanvas = this.textures.createCanvas('mud_canvas_tex', this.dirtyCanvasW, this.dirtyCanvasH);
        this.mudCtx = this.mudCanvas.context;
        this.mudCtx.drawImage(dirtySource, 0, 0);
        this.mudCanvas.refresh();

        this.trophyMud = this.add.image(this.trophyX, this.trophyY, 'mud_canvas_tex');
        this.trophyMud.setDepth(10);
        this.trophyMud.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);

        // Yellow pulsating hint for unwashed dirty areas (Depth 11)
        this.trophyMudHint = this.add.image(this.trophyX, this.trophyY, 'mud_canvas_tex');
        this.trophyMudHint.setDepth(11);
        this.trophyMudHint.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
        this.trophyMudHint.setTint(0xffea00);
        this.trophyMudHint.setBlendMode('ADD');
        this.trophyMudHint.setAlpha(0);

        this.dirtyHintTween = null;
        this.hintTimer = null;

        // Sample points grid to accurately track cleaning percentage
        this.initProgressGrid();
    }

    initProgressGrid() {
        this.gridCols = 16;
        this.gridRows = 32;
        this.samplePoints = [];

        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const u = (c + 0.5) / this.gridCols;
                const v = (r + 0.5) / this.gridRows;

                const relX = (u - 0.5) * 2; // -1 to 1

                let maxRelX = 0.55;
                if (v < 0.28) {
                    maxRelX = 0.75; // Ball top
                } else if (v < 0.65) {
                    maxRelX = 0.45; // Neck
                } else {
                    maxRelX = 0.65; // Base
                }

                if (Math.abs(relX) <= maxRelX) {
                    this.samplePoints.push({ u, v, cleaned: false });
                }
            }
        }
        this.totalPoints = this.samplePoints.length;
        this.cleanedPointsCount = 0;
    }

    setupEffects() {
        // Water beam graphic (cleared, using particle funnel instead)
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(14);

        // === WATER FUNNEL STREAM PARTICLES CHO DỤNG CỤ 1 (gun_nozzle) ===
        this.waterStreamEmitter_nozzle = this.add.particles(0, 0, 'water', {
            speed: { min: 450, max: 700 },
            angle: { min: -95, max: -85 }, // Wide cone
            scale: { start: 0.05, end: 0.1 }, // Expands into funnel shape
            alpha: { start: 0.95, end: 0.15 },
            lifespan: { min: 220, max: 280 },
            tint: [0xffffff, 0xe0f7ff, 0xafe5ff, 0x78d4ff],
            frequency: 2,
            quantity: 5,
            emitting: false
        });
        this.waterStreamEmitter_nozzle.setDepth(16);

        // === WATER FUNNEL STREAM PARTICLES CHO DỤNG CỤ 2 (gun_nozzle1) ===
        // Bạn có thể tùy chỉnh các thông số tia nước riêng cho gun_nozzle1 tại đây:
        this.waterStreamEmitter_nozzle1 = this.add.particles(0, 0, 'water', {
            speed: { min: 450, max: 700 },
            angle: { min: -115, max: -65 },
            scale: { start: 0.05, end: 0.1 },
            alpha: { start: 0.95, end: 0.15 },
            lifespan: { min: 220, max: 350 },
            tint: [0xffffff, 0xe0f7ff, 0xafe5ff, 0x78d4ff],
            frequency: 1,
            quantity: 5,
            emitting: false
        });
        this.waterStreamEmitter_nozzle1.setDepth(16);

        // === ĐIỀU CHỈNH VỊ TRÍ THEO CHIỀU Y CỦA TIA NƯỚC CHO TỪNG DỤNG CỤ (pixel) ===
        // Giá trị âm: dời tia nước lên trên
        // Giá trị dương: dời tia nước xuống dưới
        this.streamOffsetY_nozzle = 0;    // Dành cho gun_nozzle
        this.streamOffsetY_nozzle1 = 50;   // Dành cho gun_nozzle1 (chỉnh tùy ý tại đây)

        // === ĐIỀU CHỈNH BÁN KÍNH LÀM SẠCH (CLEAN RADIUS) CHO TỪNG DỤNG CỤ (pixel) ===
        // Giá trị càng lớn thì diện tích làm sạch mỗi lần xịt càng rộng
        this.cleanRadius_nozzle = 45;     // Dành cho gun_nozzle (mặc định 45px)
        this.cleanRadius_nozzle1 = 55;    // Dành cho gun_nozzle1 (chỉnh tùy ý tại đây, vd: 60px hoặc 35px)

        // Con trỏ trỏ tới emitter, offset Y và bán kính làm sạch của dụng cụ đang dùng
        this.waterStreamEmitter = this.waterStreamEmitter_nozzle;
        this.currentStreamOffsetY = this.streamOffsetY_nozzle;
        this.currentCleanRadius = this.cleanRadius_nozzle;

        // === WATER IMPACT — drops bursting at hit target (Depth 18) ===
        this.waterEmitter = this.add.particles(0, 0, 'water', {
            speed: { min: 80, max: 220 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.45, end: 0.9 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 500,
            gravityY: 200,
            tint: [0xaaeeff, 0xddf5ff, 0xffffff, 0x88ccff],
            frequency: 80,
            quantity: 2,
            emitting: false
        });
        this.waterEmitter.setDepth(18);

        // === SECOND LAYER — mist splash (Depth 15) ===
        this.waterMistEmitter = this.add.particles(0, 0, 'water', {
            speed: { min: 60, max: 160 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0.8 },
            alpha: { start: 0.75, end: 0 },
            lifespan: 600,
            gravityY: 150,
            tint: [0xccf0ff, 0xeefaff, 0xffffff],
            frequency: 70,
            quantity: 2,
            emitting: false
        });
        this.waterMistEmitter.setDepth(15);

        // === SOFT GLOW at impact point (Depth 13) ===
        this.sprayDomeGlow = this.add.image(0, 0, 'radial_glow');
        this.sprayDomeGlow.setDepth(13);
        this.sprayDomeGlow.setTint(0x88ddff);
        this.sprayDomeGlow.setAlpha(0.35);
        this.sprayDomeGlow.setScale(1.2);
        this.sprayDomeGlow.setBlendMode('ADD');
        this.sprayDomeGlow.setVisible(false);

        // Mud splatter particles (Depth 18)
        this.mudEmitter 
        = this.add.particles(0, 0, 'mud_splatter', {
            speed: { min: 70, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.15, end: 0.3 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 1000,
            gravityY: 100,    
            tint: [0x5c3317, 0x4a2810, 0x784420],
            frequency: 100, 
            quantity: 1,
            emitting: false
        });
        this.mudEmitter.setDepth(18);

        // === BUBBLE PARTICLES — bubbles spreading widely around and floating upwards (Depth 19) ===
        this.bubbleEmitter = this.add.particles(0, 0, 'bubble', {
            speed: { min: 100, max: 130 },
            angle: { min: 0, max: 360 }, // Burst outward in all directions
            scale: { min: 0.3, max: 0.5 },
            alpha: { start: 0.9, end: 0 },
            lifespan: { min: 1000, max: 1800 },
            gravityY: 0, // Strong upward buoyancy while spreading
            frequency: 45,
            quantity: 3,
            emitting: false
        });
        this.bubbleEmitter.setDepth(17);

        // Sparkle particles for victory (Depth 20)
        this.sparkleEmitter = this.add.particles(0, 0, 'sparkle', {
            speed: { min: 40, max: 150 },
            scale: { start: 0.25, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            tint: [0xffffff, 0xffea78, 0xffd700],
            emitting: false
        });
        this.sparkleEmitter.setDepth(20);
    }

    setupWaterGun() {
        const width = this.gameWidth;
        const height = this.gameHeight;
        this.gunContainer = this.add.container(width * 0.5, height + 500);
        this.gunContainer.setDepth(25);

        // Water pipe attached to nozzle handle going down
        this.gunPipe = this.add.image(0, 0, 'water_pipe');
        this.gunPipe.setOrigin(0.5, 0.04);
        this.gunPipe.setScale(1.2, 1.0);
        this.gunPipe.setVisible(false);

        const gunScale = 0.68;
        this.gunNozzle = this.add.image(0, 0, 'gun_nozzle');
        this.gunNozzle.setOrigin(0.5, 0.95);
        this.gunNozzle.setScale(gunScale);

        this.gunContainer.add([this.gunPipe, this.gunNozzle]);
        // Distance from pivot (0.95) to nozzle tip (0.05)
        this.gunTipOffset = 400 * 0.90 * gunScale; // ~245px

        const initAngle = Phaser.Math.DegToRad(-90);
        this.gunContainer.setRotation(initAngle + Math.PI / 2);
    }

    setupUI() {
        const { width, height } = this.scale;

        this.topUI = this.add.container(width / 2, Math.max(50, height * 0.08));
        this.topUI.setDepth(30);

        this.progressBarBg = this.add.image(0, 5, 'progress_bg');
        this.progressBarBg.setDisplaySize(240, 8);
        this.topUI.add(this.progressBarBg);

        this.progressBarFill = this.add.image(-120, 5, 'progress_fill');
        this.progressBarFill.setOrigin(0, 0.5);
        this.progressBarFill.setDisplaySize(240, 8);
        this.maxFillWidth = 240;
        this.topUI.add(this.progressBarFill);

        this.setFillAmount(0);

        this.percentText = this.add.text(0, 5, '0%', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#004d00',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.topUI.add(this.percentText);

        this.promptText = this.add.text(0, 35, 'CHOOSE TOOL', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffea75',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.topUI.add(this.promptText);

        this.tweens.add({
            targets: this.promptText,
            scaleX: 1.1,
            scaleY: 1.1,
            yoyo: true,
            repeat: -1,
            duration: 600,
            ease: 'Sine.easeInOut'
        });
    }

    setupToolSelection() {
        const { width, height } = this.scale;

        this.toolSelectionContainer = this.add.container(0, 0);
        this.toolSelectionContainer.setDepth(35);

        const leftX = width * 0.28;
        const leftY = height * 0.82;
        const rightX = width * 0.72;
        const rightY = height * 0.82;

        const btnLeft = this.createToolButton(leftX, leftY, 'gun_nozzle');
        const btnRight = this.createToolButton(rightX, rightY, 'gun_nozzle1');

        this.toolButtons = [btnLeft, btnRight];
        this.toolSelectionContainer.add([btnLeft, btnRight]);

        // Hand tutorial for tool selection
        this.toolTutorialHand = this.add.image(leftX + 15, leftY + 25, 'hand');
        this.toolTutorialHand.setScale(0.5);
        this.toolTutorialHand.setDepth(36);
        this.toolSelectionContainer.add(this.toolTutorialHand);

        // Chuỗi animation: nhấp nháy/tap tại nút trái -> lướt sang phải -> nhấp nháy/tap tại nút phải -> lướt về trái
        this.toolHandTween = this.tweens.chain({
            targets: this.toolTutorialHand,
            loop: -1,
            tweens: [
                // 1. Nhấp nhấp tại nút bên trái (tap 2 lần)
                {
                    scaleX: 0.40,
                    scaleY: 0.40,
                    duration: 180,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Sine.easeInOut'
                },
                // 2. Di chuyển từ nút trái sang nút phải
                {
                    x: rightX + 15,
                    y: rightY + 25,
                    duration: 750,
                    ease: 'Sine.easeInOut'
                },
                // 3. Nhấp nhấp tại nút bên phải (tap 2 lần)
                {
                    scaleX: 0.40,
                    scaleY: 0.40,
                    duration: 180,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Sine.easeInOut'
                },
                // 4. Di chuyển từ nút phải về lại nút trái
                {
                    x: leftX + 15,
                    y: leftY + 25,
                    duration: 750,
                    ease: 'Sine.easeInOut'
                }
            ]
        });
    }

    createToolButton(x, y, toolKey) {
        const btnContainer = this.add.container(x, y);

        // Background button frame
        const bg = this.add.image(0, 0, 'btn_tool');
        bg.setScale(0.8);
        btnContainer.add(bg);

        // Tool preview image inside button (only gun_nozzle / gun_nozzle1, no water pipe on UI)
        const toolImg = this.add.image(0, -5, toolKey);
        toolImg.setScale(0.2);
        toolImg.setRotation(Phaser.Math.DegToRad(-25));
        btnContainer.add(toolImg);

        // Make button interactive
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', (pointer) => {
            if (pointer && pointer.event) {
                pointer.event.stopPropagation();
            }
            this.selectTool(toolKey, btnContainer);
        });

        // Breathing pulse animation
        this.tweens.add({
            targets: btnContainer,
            scaleX: 1.08,
            scaleY: 1.08,
            yoyo: true,
            repeat: -1,
            duration: 700,
            ease: 'Sine.easeInOut'
        });

        return btnContainer;
    }

    selectTool(toolKey, selectedBtn) {
        if (this.hasSelectedTool) return;
        this.hasSelectedTool = true;

        this.clickSound.play();

        // Update gun nozzle texture to the chosen tool
        this.gunNozzle.setTexture(toolKey);

        this.toolKey = toolKey;

        // Gán waterStreamEmitter, streamOffsetY và cleanRadius tương ứng với dụng cụ được chọn
        if (toolKey === 'gun_nozzle1') {
            this.waterStreamEmitter = this.waterStreamEmitter_nozzle1;
            this.currentStreamOffsetY = this.streamOffsetY_nozzle1;
            this.currentCleanRadius = this.cleanRadius_nozzle1;
            this.gunPipe.setVisible(true);
        } else {
            this.waterStreamEmitter = this.waterStreamEmitter_nozzle;
            this.currentStreamOffsetY = this.streamOffsetY_nozzle;
            this.currentCleanRadius = this.cleanRadius_nozzle;
            this.gunPipe.setVisible(false);
        }

        // Disappear tool selection UI with smooth animation
        if (this.toolSelectionContainer) {
            this.tweens.add({
                targets: this.toolSelectionContainer,
                alpha: 0,
                scaleX: 0.8,
                scaleY: 0.8,
                duration: 250,
                ease: 'Back.easeIn',
                onComplete: () => {
                    if (this.toolSelectionContainer) {
                        this.toolSelectionContainer.destroy();
                        this.toolSelectionContainer = null;
                    }
                }
            });
        }

        // Reset prompt text
        if (this.promptText) {
            this.promptText.setText('');
        }

        // Slide gun up into view from bottom
        this.gunContainer.setPosition(this.gameWidth * 0.5, this.gameHeight + 400);
        this.tweens.add({
            targets: this.gunContainer,
            y: this.gameHeight * 0.9,
            duration: 650,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.canClean = true;
                this.showTutorial();
            }
        });
    }

    setupCameras() {
        const { width, height } = this.scale;

        this.uiCamera = this.cameras.add(0, 0, width, height);
        this.uiCamera.setZoom(1.0);

        // Main Camera ignores UI
        const uiElements = [this.topUI];
        if (this.toolSelectionContainer) uiElements.push(this.toolSelectionContainer);
        if (this.ctaBtn) uiElements.push(this.ctaBtn);
        this.cameras.main.ignore(uiElements);

        // UI Camera ignores World objects
        const worldElements = [
            this.bg,
            this.trophyClean,
            this.trophyWet,
            this.trophyMud,
            this.trophyMudHint,
            this.trophyGlow,
            this.trophyShadow,
            this.waterGraphics,
            this.waterStreamEmitter_nozzle,
            this.waterStreamEmitter_nozzle1,
            this.waterDropsEmitter,
            this.waterCoreEmitter,
            this.waterEmitter,
            this.waterMistEmitter,
            this.bubbleEmitter,
            this.mudEmitter,
            this.sparkleEmitter,
            this.gunContainer,
            this.tutorialContainer
        ];
        if (this.sprayDomeGlow) worldElements.push(this.sprayDomeGlow);
        this.uiCamera.ignore(worldElements.filter(Boolean));
    }

    setCameraZoomSmooth(targetZoom, duration = 700) {
        if (this.cameraZoomTween) {
            this.cameraZoomTween.stop();
        }
        this.cameraZoomTween = this.tweens.add({
            targets: this.cameras.main,
            zoom: targetZoom,
            duration: duration,
            ease: 'Sine.easeInOut'
        });
    }

    setupTutorial() {
        const width = this.gameWidth;
        const height = this.gameHeight;

        this.tutorialContainer = this.add.container(width * 0.72, height * 0.78);
        this.tutorialContainer.setDepth(28);
        this.tutorialContainer.setVisible(false);

        this.tutorialHand = this.add.image(0, 0, 'hand');
        this.tutorialHand.setScale(0.55);
        this.tutorialContainer.add(this.tutorialHand);

        this.tutorialTween = this.tweens.add({
            targets: this.tutorialHand,
            x: { from: 10, to: -60 },
            y: { from: -160, to: -320 },
            yoyo: true,
            repeat: -1,
            duration: 1100,
            ease: 'Sine.easeInOut'
        });

        this.tutorialTimer = null;
    }

    hideTutorial() {
        if (this.tutorialContainer && this.tutorialContainer.visible) {
            this.tutorialContainer.setVisible(false);
            if (this.tutorialTween) this.tutorialTween.pause();
        }
    }

    showTutorial() {
        if (this.isGameEnd || !this.canClean || !this.tutorialContainer) return;
        this.tutorialContainer.setVisible(true);
        if (this.tutorialTween) this.tutorialTween.resume();
    }

    startDirtyHint() {
        if (!this.hasStartedInteracting || !this.canClean || this.isGameEnd || !this.trophyMudHint) return;
        if (this.dirtyHintTween) {
            this.dirtyHintTween.stop();
        }
        this.trophyMudHint.setAlpha(0);
        this.dirtyHintTween = this.tweens.add({
            targets: this.trophyMudHint,
            alpha: 0.65,
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopDirtyHint() {
        if (this.dirtyHintTween) {
            this.dirtyHintTween.stop();
            this.dirtyHintTween = null;
        }
        if (this.trophyMudHint) {
            this.trophyMudHint.setAlpha(0);
        }
    }

    createProceduralWaterSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
        
        // Tạo buffer tiếng ồn (Pink / Brown noise) cho âm thanh dòng nước áp lực cao
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
            b6 = white * 0.115926;
        }
        this.proceduralNoiseBuffer = noiseBuffer;
    }

    startSpraySound() {
        if (this.sound.context && this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
        if (!this.isAudioPlaying) {
            this.isAudioPlaying = true;

            // 2. Tạo âm thanh dòng nước áp lực cao (Web Audio Synthesis)
            try {
                const ctx = this.sound.context;
                if (ctx) {
                    if (!this.proceduralNoiseBuffer) {
                        this.createProceduralWaterSound();
                    }
                    if (this.proceduralNoiseBuffer) {
                        this.proceduralSource = ctx.createBufferSource();
                        this.proceduralSource.buffer = this.proceduralNoiseBuffer;
                        this.proceduralSource.loop = true;

                        // Bandpass filter tạo tiếng xịt nước rít và sôi động (1.6kHz)
                        this.proceduralFilter = ctx.createBiquadFilter();
                        this.proceduralFilter.type = 'bandpass';
                        this.proceduralFilter.frequency.value = 1600;
                        this.proceduralFilter.Q.value = 1.6;

                        // Lowpass filter tạo tiếng ầm ầm của tia nước áp lực
                        this.proceduralFilter2 = ctx.createBiquadFilter();
                        this.proceduralFilter2.type = 'lowpass';
                        this.proceduralFilter2.frequency.value = 3400;

                        this.proceduralGain = ctx.createGain();
                        const now = ctx.currentTime;
                        this.proceduralGain.gain.setValueAtTime(0, now);
                        this.proceduralGain.gain.linearRampToValueAtTime(0.5, now + 0.06);

                        this.proceduralSource.connect(this.proceduralFilter);
                        this.proceduralFilter.connect(this.proceduralFilter2);
                        this.proceduralFilter2.connect(this.proceduralGain);
                        this.proceduralGain.connect(ctx.destination);

                        this.proceduralSource.start();
                    }
                }
            } catch (e) {
                // Fallback nếu Web Audio bị hạn chế
            }
        }
    }

    stopSpraySound() {
        if (this.isAudioPlaying) {
            this.isAudioPlaying = false;

            try {
                if (this.proceduralGain && this.sound.context) {
                    const ctx = this.sound.context;
                    const now = ctx.currentTime;
                    this.proceduralGain.gain.setValueAtTime(this.proceduralGain.gain.value, now);
                    this.proceduralGain.gain.linearRampToValueAtTime(0, now + 0.08);
                    const src = this.proceduralSource;
                    setTimeout(() => {
                        try {
                            if (src) {
                                src.stop();
                                src.disconnect();
                            }
                        } catch (err) {}
                    }, 100);
                }
            } catch (e) {}
        }
    }

    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameEnd || !this.canClean) {
                return;
            }
            this.hasStartedInteracting = true; // Người chơi đã bắt đầu dùng dụng cụ lần đầu
            this.hideTutorial();
            this.stopDirtyHint();
            if (this.tutorialTimer) this.tutorialTimer.remove();
            if (this.hintTimer) this.hintTimer.remove();

            this.isSpraying = true;
            this.startSpraySound();

            // Smoothly zoom in to 1.2x wider view
            this.setCameraZoomSmooth(1 / 1.2, 700);

            this.lastCanvasX = null;
            this.lastCanvasY = null;
            this.lastU = null;
            this.lastV = null;
            this.handleSpray(pointer.worldX, pointer.worldY);
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isSpraying && !this.isGameEnd && this.canClean) {
                this.handleSpray(pointer.worldX, pointer.worldY);
            }
        });

        this.input.on('pointerup', () => {
            if (!this.canClean) return;
            this.isSpraying = false;
            this.stopSpraySound();
            this.lastCanvasX = null;
            this.lastCanvasY = null;
            this.lastU = null;
            this.lastV = null;

            // Smoothly zoom back out to initial 1.4x wider view
            if (!this.isGameEnd) {
                this.setCameraZoomSmooth(1 / 1.4, 700);
            }

            this.targetShiftX = 0;
            this.targetBgShiftX = 0;

            this.waterGraphics.clear();
            this.waterStreamEmitter.stop();
            if (this.waterDropsEmitter) this.waterDropsEmitter.stop();
            if (this.waterCoreEmitter) this.waterCoreEmitter.stop();
            this.waterEmitter.stop();
            this.waterMistEmitter.stop();
            if (this.bubbleEmitter) this.bubbleEmitter.stop();
            this.mudEmitter.stop();
            if (this.sprayDomeGlow) this.sprayDomeGlow.setVisible(false);

            if (!this.isGameEnd) {
                this.tutorialTimer = this.time.delayedCall(2000, () => {
                    this.showTutorial();
                });
                this.hintTimer = this.time.delayedCall(800, () => {
                    this.startDirtyHint();
                });
            }
        });
    }

    handleSpray(pointerX, pointerY) {
        if (this.isGameEnd) return;

        // Position the tool directly at the player's touch / cursor
        const gunBaseX = pointerX;
        const gunBaseY = pointerY + 100;

        this.gunContainer.setPosition(gunBaseX, gunBaseY);

        // Center-based smooth tilt: Straight UP (-90 deg) at center, smoothly tilts left/right based on position
        const centerX = this.gameWidth / 2;
        const offsetFromCenter = (gunBaseX - centerX) / (centerX * 1.1); // -1 (left) to +1 (right)
        const clampedOffset = Phaser.Math.Clamp(offsetFromCenter, -1, 1);

        // Vị trí chính giữa làm neo (Anchor): chỉ khi đưa hẳn sang 2 bên (vượt qua deadzone) mới dịch chuyển
        const deadZone = 35; // Vùng neo giữ cố định ở trung tâm (px)
        const diffX = gunBaseX - centerX;
        const MAX_SHIFT_X = 20; // Giới hạn dịch chuyển đồng bộ cho đồ vật, shadow và background (px)

        if (Math.abs(diffX) > deadZone) {
            const availableRange = centerX - deadZone;
            const sign = Math.sign(diffX);
            const rawRatio = (Math.abs(diffX) - deadZone) / (availableRange * 0.9);
            const clampedRatio = Phaser.Math.Clamp(rawRatio, 0, 1);
            
            // Đường cong mượt để tăng dần độ dịch khi đẩy xa ra 2 biên
            const smoothRatio = Math.pow(clampedRatio, 1.4);

            // Đồng bộ dịch chuyển cho toàn bộ đối tượng
            this.targetShiftX = -sign * smoothRatio * MAX_SHIFT_X;
        } else {
            // Nằm trong vùng neo chính giữa -> giữ nguyên vị trí gốc
            this.targetShiftX = 0;
        }
        
        // Smooth gentle tilt (up to +/- 18 degrees) without jitter
        const angleDeg = -90 + clampedOffset * 18;
        const angle = Phaser.Math.DegToRad(angleDeg);

        this.gunContainer.setRotation(angle + Math.PI / 2);

        // Nozzle tip coordinates
        const tipX = gunBaseX + Math.cos(angle) * this.gunTipOffset;
        const tipY = gunBaseY + Math.sin(angle) * this.gunTipOffset;

        // Water jet impact point ahead of the nozzle tip
        const jetLength = 150;
        const hitX = tipX + Math.cos(angle) * jetLength;
        const hitY = tipY + Math.sin(angle) * jetLength;

        // Clear graphics
        this.waterGraphics.clear();

        // Stream particles: shoot from nozzle tip expanding outwards like a funnel
        const angleDeg2 = Phaser.Math.RadToDeg(angle);

        // Expanding funnel stream (áp dụng streamOffsetY)
        this.waterStreamEmitter.setPosition(tipX, tipY + (this.currentStreamOffsetY || 0));
        this.waterStreamEmitter.setEmitterAngle({ min: angleDeg2 - 18, max: angleDeg2 + 18 });
        if (!this.waterStreamEmitter.emitting) this.waterStreamEmitter.start();

        // Impact particles at hit point
        this.waterEmitter.setPosition(hitX, hitY);
        this.waterEmitter.setEmitterAngle({ min: angleDeg2 + 100, max: angleDeg2 + 260 });
        if (!this.waterEmitter.emitting) this.waterEmitter.start();

        this.waterMistEmitter.setPosition(hitX, hitY);
        this.waterMistEmitter.setEmitterAngle({ min: 0, max: 360 });
        if (!this.waterMistEmitter.emitting) this.waterMistEmitter.start();

        // Bubble particles floating upwards from spray/impact area
        if (this.bubbleEmitter) {
            this.bubbleEmitter.setPosition(hitX, hitY);
            if (!this.bubbleEmitter.emitting) this.bubbleEmitter.start();
        }

        // Glow at impact
        if (this.sprayDomeGlow) {
            this.sprayDomeGlow.setPosition(hitX, hitY);
            this.sprayDomeGlow.setVisible(true);
        }

        // Emit water particles at impact point

        // Calculate position relative to trophy
        const trophyLeft = this.trophyX - this.trophyDisplayW / 2;
        const trophyTop = this.trophyY - this.trophyDisplayH / 2;

        const curCanvasX = ((hitX - trophyLeft) / this.trophyDisplayW) * this.dirtyCanvasW;
        const curCanvasY = ((hitY - trophyTop) / this.trophyDisplayH) * this.dirtyCanvasH;

        const curU = (hitX - trophyLeft) / this.trophyDisplayW;
        const curV = (hitY - trophyTop) / this.trophyDisplayH;

        const cleanRadius = this.currentCleanRadius || 45;
        const eraseCanvasRadius = cleanRadius * (this.dirtyCanvasW / this.trophyDisplayW);

        // Check if water impact is in or near trophy bounds
        if (hitX >= trophyLeft - 30 && hitX <= trophyLeft + this.trophyDisplayW + 30 &&
            hitY >= trophyTop - 30 && hitY <= trophyTop + this.trophyDisplayH + 30) {
            
            this.mudCtx.save();
            this.mudCtx.globalCompositeOperation = 'destination-out';

            // Connect stroke from last position for seamless erasing
            if (this.lastCanvasX !== null && this.lastCanvasY !== null) {
                this.mudCtx.lineWidth = eraseCanvasRadius * 2;
                this.mudCtx.lineCap = 'round';
                this.mudCtx.lineJoin = 'round';
                this.mudCtx.beginPath();
                this.mudCtx.moveTo(this.lastCanvasX, this.lastCanvasY);
                this.mudCtx.lineTo(curCanvasX, curCanvasY);
                this.mudCtx.stroke();
            }

            // Fill circle at current position
            this.mudCtx.beginPath();
            this.mudCtx.arc(curCanvasX, curCanvasY, eraseCanvasRadius, 0, Math.PI * 2);
            this.mudCtx.fill();
            this.mudCtx.restore();

            // Refresh canvas texture to update screen immediately
            this.mudCanvas.refresh();

            // Mud splash particles
            this.mudEmitter.setPosition(hitX, hitY);
            if (!this.mudEmitter.emitting) this.mudEmitter.start();

            // Update cleaned progress across interpolated UV points
            this.checkProgressUV(curU, curV);
        } else {
            this.mudEmitter.stop();
        }

        this.lastCanvasX = curCanvasX;
        this.lastCanvasY = curCanvasY;
        this.lastU = curU;
        this.lastV = curV;
    }

    checkProgressUV(targetU, targetV) {
        const cleanRadius = this.currentCleanRadius || 45;
        const radiusU = (cleanRadius / 45) * 0.16; // Tự động đồng bộ theo cleanRadius của từng dụng cụ
        const aspect = this.trophyDisplayH / this.trophyDisplayW;
        let newlyCleaned = 0;

        const checkPoint = (u, v) => {
            for (let i = 0; i < this.samplePoints.length; i++) {
                const pt = this.samplePoints[i];
                if (!pt.cleaned) {
                    const du = u - pt.u;
                    const dv = (v - pt.v) * (aspect / 2.0);
                    if (Math.hypot(du, dv) <= radiusU) {
                        pt.cleaned = true;
                        this.cleanedPointsCount++;
                        newlyCleaned++;
                    }
                }
            }
        };

        // Interpolate between last and current UV for smooth progress detection
        if (this.lastU !== null && this.lastV !== null) {
            const steps = Math.max(1, Math.ceil(Math.hypot(targetU - this.lastU, targetV - this.lastV) / 0.04));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                checkPoint(this.lastU + (targetU - this.lastU) * t, this.lastV + (targetV - this.lastV) * t);
            }
        } else {
            checkPoint(targetU, targetV);
        }

        if (newlyCleaned > 0) {
            const rawProgress = (this.cleanedPointsCount / this.totalPoints) * 100;
            this.progress = Math.min(100, Math.round(rawProgress));
            this.updateProgressBar();

            if (this.progress % 10 === 0 || newlyCleaned > 3) {
                const trophyLeft = this.trophyX - this.trophyDisplayW / 2;
                const trophyTop = this.trophyY - this.trophyDisplayH / 2;
                this.sparkleEmitter.setPosition(trophyLeft + targetU * this.trophyDisplayW, trophyTop + targetV * this.trophyDisplayH);
                this.sparkleEmitter.explode(4);
            }

            if (this.progress >= 99 && !this.isGameEnd) {
                this.triggerWin();
                this.createConfetti();
                
                if (typeof window.gameEnd === 'function') {
                    window.gameEnd();
                }
            }
        }
    }

    updateProgressBar() {
        //const fillW = Math.max(1, (this.progress / 100) * this.maxFillWidth);
        //this.progressBarFill.setDisplaySize(fillW, 36);
        const fillW = this.progress / 100;

        this.setFillAmount(fillW);
        this.percentText.setText(`${this.progress}%`);
    }

    setFillAmount(amount) {

        amount = Phaser.Math.Clamp(
            amount,
            0,
            1
        );

        const sourceWidth =
            this.progressBarFill.width;

        const sourceHeight =
            this.progressBarFill.height;


        // Crop từ trái sang phải
        this.progressBarFill.setCrop(
            0,
            0,
            sourceWidth * amount,
            sourceHeight
        );
    }


    triggerWin() {
        this.isGameEnd = true;
        this.isSpraying = false;
        this.targetShiftX = 0;
        this.targetBgShiftX = 0;
        this.stopSpraySound();
        this.waterGraphics.clear();
        this.waterStreamEmitter.stop();
        if (this.waterDropsEmitter) this.waterDropsEmitter.stop();
        if (this.waterCoreEmitter) this.waterCoreEmitter.stop();
        this.waterEmitter.stop();
        if (this.bubbleEmitter) this.bubbleEmitter.stop();
        this.mudEmitter.stop();
        this.hideTutorial();
        this.stopDirtyHint();
        if (this.hintTimer) this.hintTimer.remove();

        this.progress = 100;
        this.updateProgressBar();

        // Fade out mud layer completely
        this.tweens.add({
            targets: [this.trophyMud, this.trophyMudHint],
            alpha: 0,
            duration: 350
        });

        // Gradually transition wet trophy to clean golden trophy
        this.tweens.add({
            targets: this.trophyWet,
            alpha: 0,
            duration: 1200,
            delay: 300,
            ease: 'Sine.easeInOut'
        });

        // Retract water gun smoothly
        this.tweens.add({
            targets: this.gunContainer,
            y: this.gameHeight + 2500,
            duration: 600,
            ease: 'Back.easeIn'
        });

        // Play Win & Sparkle sound
        this.winSound.play();
        this.sparkleSound.play();

        // Golden glow animation
        this.tweens.add({
            targets: this.trophyGlow,
            alpha: 0.85,
            scaleX: this.trophyScale * 3.2,
            scaleY: this.trophyScale * 3.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Sparkle burst around the trophy
        this.time.addEvent({
            delay: 160,
            repeat: 20,
            callback: () => {
                const rx = this.trophyX + Phaser.Math.Between(-this.trophyDisplayW * 0.4, this.trophyDisplayW * 0.4);
                const ry = this.trophyY + Phaser.Math.Between(-this.trophyDisplayH * 0.45, this.trophyDisplayH * 0.45);
                this.sparkleEmitter.setPosition(rx, ry);
                this.sparkleEmitter.explode(6);
            }
        });

        // Celebration Banner
        this.promptText.setText('✨ 100% CLEANED! PERFECT! ✨');
        this.promptText.setColor('#00ff7f');
        this.tweens.add({
            targets: this.promptText,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 400,
            yoyo: true,
            repeat: -1
        });

        // Show Endcard CTA overlay
        this.time.delayedCall(1000, () => {
            this.showEndcardOverlay();
        });
    }

    showEndcardOverlay() {
        const { width, height } = this.scale;

        const endcard = this.add.container(width / 2, height * 0.82);
        endcard.setDepth(45);
        endcard.setScale(0);

        const bigBtn = this.add.image(0, 0, 'btn_try_now');
        bigBtn.setScale(0.95);
        bigBtn.setInteractive({ useHandCursor: true });
        bigBtn.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.clickSound.play();
            this.ShowStore();
        });

        const subLabel = this.add.text(0, 0, 'PLAY NOW', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        endcard.add([bigBtn, subLabel]);

        // Main camera ignores endcard overlay
        this.cameras.main.ignore(endcard);

        this.tweens.add({
            targets: endcard,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 500,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: bigBtn,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: subLabel,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // this.input.on('pointerdown', () => {
        //     this.ShowStore();
        // });
    }

    update(time, delta) {
        // Đồng bộ tốc độ chuyển động mượt mà cho toàn bộ cúp, bóng (trophyShadow) và background
        const lerpFactor = 0.06;
        this.currentShiftX += (this.targetShiftX - this.currentShiftX) * lerpFactor;

        this.trophyX = this.baseTrophyX + this.currentShiftX;

        if (this.bg) {
            this.bg.x = this.baseBgX + this.currentShiftX;
        }

        if (this.trophyShadow) {
            this.trophyShadow.x = this.trophyX;
        }

        if (this.trophyClean) {
            this.trophyClean.x = this.trophyX;
            if (this.trophyWet) this.trophyWet.x = this.trophyX;
            if (this.trophyMud) this.trophyMud.x = this.trophyX;
            if (this.trophyMudHint) this.trophyMudHint.x = this.trophyX;
            if (this.trophyGlow) this.trophyGlow.x = this.trophyX;
        }
    }

    handleResize(gameSize) {
        const { width, height } = this.scale;
        this.gameWidth = width;
        this.gameHeight = height;

        if (this.uiCamera) {
            this.uiCamera.setSize(width, height);
        }

        this.baseTrophyX = width / 2;
        this.baseBgX = width / 2 - 10;
        this.baseTrophyY = height * 0.48;
        this.baseBgY = height / 2;
        this.trophyY = this.baseTrophyY + this.currentShiftY;
        this.trophyX = this.baseTrophyX + this.currentShiftX;

        this.resizeBackground();

        const targetTrophyHeight = Math.min(height * 0.58, 540);
        const scale = targetTrophyHeight / 1024;
        this.trophyScale = scale;
        this.trophyDisplayW = 492 * scale;
        this.trophyDisplayH = 1024 * scale;

        if (this.trophyClean) {
            this.trophyClean.setPosition(this.trophyX, this.trophyY).setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
            if (this.trophyWet) {
                this.trophyWet.setPosition(this.trophyX, this.trophyY).setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
            }
            if (this.trophyShadow) {
                this.trophyShadow.setPosition(this.trophyX, this.trophyY + 145);
            }
            this.trophyGlow.setPosition(this.trophyX, this.trophyY);
            if (this.trophyMud) {
                this.trophyMud.setPosition(this.trophyX, this.trophyY).setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
            }
            if (this.trophyMudHint) {
                this.trophyMudHint.setPosition(this.trophyX, this.trophyY).setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
            }
        }

        if (this.topUI) {
            this.topUI.setPosition(width / 2, Math.max(50, height * 0.08));
        }

        if (this.ctaBtn) {
            this.ctaBtn.setPosition(width / 2, height * 0.92);
        }

        if (this.tutorialContainer) {
            this.tutorialContainer.setPosition(width / 2, this.trophyY);
        }

        if (this.toolSelectionContainer && this.toolSelectionContainer.active) {
            const leftX = width * 0.28;
            const leftY = height * 0.82;
            const rightX = width * 0.72;
            const rightY = height * 0.82;
            if (this.toolButtons && this.toolButtons[0] && this.toolButtons[1]) {
                this.toolButtons[0].setPosition(leftX, leftY);
                this.toolButtons[1].setPosition(rightX, rightY);
            }
        }
    }

    createConfetti() {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800];
        
        // Tạo 2 emitter
        const leftCannon = this.add.particles(-10, 600, 'confetti', {
            speed: { min: 400, max: 800 },
            angle: { min: -80, max: -60 }, // Bắn lên trên xiên phải
            gravityY: 500,
            lifespan: 4000,
            scale: { start: 1.5, end: 0.5 },
            rotate: { min: 0, max: 720 },
            tint: colors,
            quantity: 50
        });

        const rightCannon = this.add.particles(500, 600, 'confetti', {
            speed: { min: 400, max: 800 },
            angle: { min: -130, max: -100 }, // Bắn lên trên xiên trái
            gravityY: 500,
            lifespan: 4000,
            scale: { start: 1.5, end: 0.5 },
            rotate: { min: 0, max: 720 },
            tint: colors,
            quantity: 50
        });

        // ĐẶT DEPTH CỰC CAO ĐỂ CHỐNG BỊ CHE
        leftCannon.setDepth(5000);
        rightCannon.setDepth(5000);

        // Phát nổ 1 lần duy nhất
        leftCannon.explode();
        rightCannon.explode();

        // Tự hủy sau 5 giây để nhẹ máy
        this.time.delayedCall(5000, () => {
            leftCannon.destroy();
            rightCannon.destroy();
        });
    }


    ShowStore() {
        const storeUrl = "https://play.google.com/store/apps/details?id=com.d28.makeover.asmr.home.cleaning.game";

        console.log("Playturbo: ShowStore triggered (CTA Click)");

        if (typeof window.install === 'function') {
            window.install();
            return;
        }

        if (typeof ExitApi !== 'undefined' && typeof ExitApi.exit === 'function') {
            ExitApi.exit();
            return;
        }

        if (typeof mraid !== 'undefined' && typeof mraid.open === 'function') {
            mraid.open(storeUrl);
            return;
        }

        if (typeof window.openAppStore === 'function') {
            window.openAppStore();
            return;
        }

        window.open(storeUrl, '_blank');
    }
}