import Phaser from 'phaser';

// Import all textures
import bgImg from './assets/Texture/bg_stadium.webp';
import poolDirtyImg from './assets/Texture/pool_dirty.webp';
import poolSoapImg from './assets/Texture/pool_soap.webp';
import poolCleanImg from './assets/Texture/pool_clean.webp';
import poolWaterImg from './assets/Texture/Pool_water.webp';
import waterImg from './assets/Texture/water.webp';
import trash1Img from './assets/Texture/trash1.webp';
import trash2Img from './assets/Texture/trash2.webp';
import trash3Img from './assets/Texture/trash3.webp';
import trash4Img from './assets/Texture/trash4.webp';
import gunNozzleImg from './assets/Texture/gun_nozzle.webp';
import gunNozzle1Img from './assets/Texture/gun_nozzle1.webp';
import waterPipeImg from './assets/Texture/water_pipe.webp';
import waterDropsImg from './assets/Texture/water_drops.webp';
import bubbleImg from './assets/Texture/bubble.webp';
import handImg from './assets/Texture/hand.webp';
import sparkleImg from './assets/Texture/sparkle.webp';
import radialGlowImg from './assets/Texture/radial_glow.webp';
import btnTryNowImg from './assets/Texture/btn_try_now.webp';
import progressBgImg from './assets/Texture/progress_bg.webp';
import progressFillImg from './assets/Texture/progress_fill.webp';

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
        this.load.image('pool_dirty', poolDirtyImg);
        this.load.image('pool_soap', poolSoapImg);
        this.load.image('pool_clean', poolCleanImg);
        this.load.image('Pool_water', poolWaterImg);
        this.load.image('water', waterImg);
        this.load.image('trash1', trash1Img);
        this.load.image('trash2', trash2Img);
        this.load.image('trash3', trash3Img);
        this.load.image('trash4', trash4Img);
        this.load.image('gun_nozzle', gunNozzleImg);
        this.load.image('gun_nozzle1', gunNozzle1Img);
        this.load.image('water_pipe', waterPipeImg);
        this.load.image('water_drops', waterDropsImg);
        this.load.image('bubble', bubbleImg);
        this.load.image('hand', handImg);
        this.load.image('sparkle', sparkleImg);
        this.load.image('radial_glow', radialGlowImg);
        this.load.image('btn_try_now', btnTryNowImg);
        this.load.image('progress_bg', progressBgImg);
        this.load.image('progress_fill', progressFillImg);

        // Load audio
        this.load.audio('sparkle', sparkleSnd);
        this.load.audio('win', winSnd);
        this.load.audio('click', clickSnd);

        // Generate confetti texture
        const cGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        cGraphics.fillStyle(0xffffff, 1);
        cGraphics.fillRect(0, 0, 10, 6);
        cGraphics.generateTexture('confetti', 10, 6);
    }

    create() {
        this.gameWidth = 450;
        this.gameHeight = 800;
        this.isGameEnd = false;
        this.isSpraying = false;
        this.hasStartedInteracting = false;
        this.isAudioPlaying = false;

        // Phases: 'trash' -> 'drain' -> 'soap' -> 'wash' -> 'win'
        this.currentPhase = 'trash';
        this.canClean = false;

        this.progress = 0;
        this.cleanedPointsCount = 0;
        this.lastWashSoundTime = 0;
        this.lastBubbleTime = 0;
        this.lastWaterSplashTime = 0;
        this.lastMistTime = 0;
        this.lastSparkleTime = 0;
        this.lastCanvasX = null;
        this.lastCanvasY = null;

        this.targetShiftX = 0;
        this.currentShiftX = 0;
        this.basePoolX = this.gameWidth / 2;
        this.basePoolY = this.gameHeight * 0.44;
        this.baseBgX = this.gameWidth / 2;
        this.baseBgY = this.gameHeight * 0.35;

        // Sounds
        this.sparkleSound = this.sound.add('sparkle', { volume: 0.8 });
        this.winSound = this.sound.add('win', { volume: 0.9 });
        this.clickSound = this.sound.add('click', { volume: 0.8 });

        this.createProceduralWaterSound();

        const actualWidth = this.scale.width;
        const actualHeight = this.scale.height;
        const dx = (actualWidth - this.gameWidth) / 2;
        const dy = (actualHeight - this.gameHeight) / 2;
        this.cameras.main.setScroll(-dx, -dy);

        // 1. Background
        this.bg = this.add.image(this.gameWidth / 2, this.baseBgY - 100, 'bg_stadium');
        this.bg.setDepth(-1);
        const bgScaleX = this.gameWidth / this.bg.width;
        const bgScaleY = this.gameHeight / this.bg.height;
        this.bg.setScale(Math.max(bgScaleX, bgScaleY) * 2.45);

        this.cameraZoomTween = null;
        this.cameras.main.setZoom(1 / 1.4);

        // 2. Setup Pool Layers
        this.setupPoolLayers();

        // 3. Setup Water Surface & Trash
        this.setupWaterAndTrash();

        // 4. Setup Particles & Effects
        this.setupEffects();

        // 5. Setup Water Gun (hidden initially)
        this.setupWaterGun();

        // 6. Setup UI
        this.setupUI();

        // 7. Setup Tutorial Hand
        this.setupTutorial();

        // 8. Setup Cameras
        this.setupCameras();

        // 9. Setup Inputs
        this.setupInput();

        // Start Trash Phase
        this.startTrashPhase();

        // Resize handler
        this.scale.on('resize', this.handleResize, this);

        if (typeof window.gameReady === 'function') {
            window.gameReady();
        }
    }

    setupPoolLayers() {
        const width = this.gameWidth;
        const height = this.gameHeight;

        this.basePoolX = width / 2;
        this.poolX = this.basePoolX;
        this.basePoolY = height * 0.44;
        this.poolY = this.basePoolY;

        // Size pool nicely on screen
        const targetPoolHeight = Math.min(height * 0.52, 480);
        const sourceDirty = this.textures.get('pool_dirty').getSourceImage();
        const aspect = sourceDirty.width / sourceDirty.height;
        this.poolDisplayH = targetPoolHeight;
        this.poolDisplayW = targetPoolHeight * aspect;

        this.canvasW = sourceDirty.width;
        this.canvasH = sourceDirty.height;

        // Glow behind pool for victory (Depth 4)
        this.poolGlow = this.add.image(this.poolX, this.poolY, 'radial_glow');
        this.poolGlow.setDepth(4);
        this.poolGlow.setScale(2.2);
        this.poolGlow.setTint(0x00ffff);
        this.poolGlow.setAlpha(0);

        // Layer 1: pool_clean at bottom (Depth 5)
        this.poolClean = this.add.image(this.poolX, this.poolY, 'pool_clean');
        this.poolClean.setDepth(5);
        this.poolClean.setDisplaySize(this.poolDisplayW, this.poolDisplayH);

        // Layer 2: pool_soap (Depth 6) - revealed during Phase 3, erased in Phase 4
        this.poolSoap = this.add.image(this.poolX, this.poolY, 'pool_soap');
        this.poolSoap.setDepth(6);
        this.poolSoap.setDisplaySize(this.poolDisplayW, this.poolDisplayH);

        // Layer 3: Dynamic Canvas for erasing (Depth 8)
        if (this.textures.exists('erase_canvas_tex')) {
            this.textures.remove('erase_canvas_tex');
        }
        this.eraseCanvas = this.textures.createCanvas('erase_canvas_tex', this.canvasW, this.canvasH);
        this.eraseCtx = this.eraseCanvas.context;

        // Initially draw pool_dirty onto canvas
        this.eraseCtx.drawImage(sourceDirty, 0, 0);
        this.eraseCanvas.refresh();

        this.poolCanvasImg = this.add.image(this.poolX, this.poolY, 'erase_canvas_tex');
        this.poolCanvasImg.setDepth(8);
        this.poolCanvasImg.setDisplaySize(this.poolDisplayW, this.poolDisplayH);

        this.initProgressGrid();
    }

    setupWaterAndTrash() {
        // Water layer on top of pool (Depth 12)
        this.waterLayer = this.add.image(this.poolX, this.poolY, 'Pool_water');
        this.waterLayer.setDepth(12);
        this.waterLayer.setDisplaySize(this.poolDisplayW * 0.96, this.poolDisplayH * 0.95);
        this.waterLayer.setAlpha(0.92);

        // Water idle wave animation
        this.waterWaveTween = this.tweens.add({
            targets: this.waterLayer,
            scaleX: (this.poolDisplayW * 0.96 / this.waterLayer.width) * 1.02,
            scaleY: (this.poolDisplayH * 0.95 / this.waterLayer.height) * 0.98,
            yoyo: true,
            repeat: -1,
            duration: 1600,
            ease: 'Sine.easeInOut'
        });

        // 4 Trash items on water (Depth 15)
        this.trashItems = [];
        const trashConfigs = [
            { key: 'trash1', relX: -0.22, relY: -0.16, scale: 0.38, rot: -10 },
            { key: 'trash2', relX: 0.20, relY: -0.10, scale: 0.36, rot: 15 },
            { key: 'trash3', relX: -0.16, relY: 0.16, scale: 0.34, rot: 8 },
            { key: 'trash4', relX: 0.18, relY: 0.20, scale: 0.38, rot: -12 }
        ];

        trashConfigs.forEach((cfg, index) => {
            const posX = this.poolX + cfg.relX * this.poolDisplayW;
            const posY = this.poolY + cfg.relY * this.poolDisplayH;

            const trash = this.add.image(posX, posY, cfg.key);
            trash.setDepth(15);
            trash.setScale(cfg.scale);
            trash.setRotation(Phaser.Math.DegToRad(cfg.rot));
            trash.setInteractive({ useHandCursor: true });

            // Idle floating animation
            trash.floatTween = this.tweens.add({
                targets: trash,
                y: posY + 8,
                rotation: Phaser.Math.DegToRad(cfg.rot + 6),
                duration: 1000 + index * 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            trash.on('pointerdown', (pointer) => {
                if (pointer && pointer.event) pointer.event.stopPropagation();
                this.collectTrash(trash, index);
            });

            this.trashItems.push(trash);
        });

        this.remainingTrash = this.trashItems.length;
    }

    startTrashPhase() {
        this.currentPhase = 'trash';
        this.canClean = false;
        if (this.promptText) {
            this.promptText.setText('TAP TO REMOVE TRASH!');
            this.promptText.setColor('#ffea75');
        }
        this.updateTrashTutorialHand();
    }

    updateTrashTutorialHand() {
        const nextTrash = this.trashItems.find(t => t && t.active && t.visible);
        if (nextTrash && this.tutorialHand) {
            this.tutorialContainer.setVisible(true);
            this.tutorialContainer.setPosition(nextTrash.x + 20, nextTrash.y + 30);
            if (this.tutorialTween) this.tutorialTween.restart();
        } else {
            this.hideTutorial();
        }
    }

    collectTrash(trash, index) {
        if (!trash.active || this.currentPhase !== 'trash') return;
        trash.disableInteractive();

        this.clickSound.play();
        if (trash.floatTween) trash.floatTween.stop();

        // Small sparkle/splash at trash position
        if (this.sparkleEmitter) {
            this.sparkleEmitter.emitParticleAt(trash.x, trash.y, 4);
        }

        // Float up a short distance, then fly off to the left of the screen
        this.tweens.add({
            targets: trash,
            y: trash.y - 35,
            scaleX: trash.scaleX * 1.15,
            scaleY: trash.scaleY * 1.15,
            duration: 180,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: trash,
                    x: -200,
                    y: trash.y - 50,
                    rotation: Phaser.Math.DegToRad(-45),
                    alpha: 0.6,
                    duration: 420,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        trash.destroy();
                        this.trashItems[index] = null;
                        this.remainingTrash--;

                        if (this.remainingTrash <= 0) {
                            this.drainWater();
                        } else {
                            this.updateTrashTutorialHand();
                        }
                    }
                });
            }
        });
    }

    drainWater() {
        this.currentPhase = 'drain';
        this.hideTutorial();

        if (this.promptText) {
            this.promptText.setText('DRAINING WATER...');
            this.promptText.setColor('#00ffff');
        }

        this.sparkleSound.play();

        // Stop idle wave tween to avoid animation conflict
        if (this.waterWaveTween) {
            this.waterWaveTween.stop();
        }

        // Gentle, gradual water drainage animation
        this.tweens.add({
            targets: this.waterLayer,
            scaleX: 0,
            scaleY: 0,
            alpha: 0.15,
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (this.waterLayer) {
                    this.waterLayer.setVisible(false);
                }
                this.time.delayedCall(200, () => {
                    this.startSoapPhase();
                });
            }
        });

        // Whirlpool bubbles at drainage center
        this.time.addEvent({
            delay: 120,
            repeat: 11,
            callback: () => {
                if (this.bubbleEmitter) {
                    const bx = this.poolX + Phaser.Math.Between(-30, 30);
                    const by = this.poolY + Phaser.Math.Between(-15, 15);
                    this.bubbleEmitter.emitParticleAt(bx, by, 1);
                }
            }
        });
    }

    startSoapPhase() {
        this.currentPhase = 'soap';
        this.progress = 0;
        this.cleanedPointsCount = 0;
        this.initProgressGrid();
        this.setFillAmount(0);
        this.percentText.setText('0%');

        if (this.promptText) {
            this.promptText.setText('SWIPE TO SOAP UP!');
            this.promptText.setColor('#ffea75');
        }

        // Configure tool for gun_nozzle (used first)
        this.gunNozzle.setTexture('gun_nozzle');
        this.waterStreamEmitter = this.waterStreamEmitter_nozzle;
        this.currentStreamOffsetY = this.streamOffsetY_nozzle;
        this.currentCleanRadius = this.cleanRadius_nozzle;
        if (this.gunPipe) this.gunPipe.setVisible(false);

        // In soap phase, poolSoap is underneath the dirty canvas
        if (this.poolSoap) this.poolSoap.setVisible(true);

        // Slide gun up from bottom
        this.gunContainer.setPosition(this.gameWidth * 0.5, this.gameHeight + 400);
        this.tweens.add({
            targets: this.gunContainer,
            y: this.gameHeight * 0.88,
            duration: 650,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.canClean = true;
                this.showSwipeTutorial();
            }
        });
    }

    startWashPhase() {
        this.currentPhase = 'wash';
        this.canClean = false;
        this.progress = 0;
        this.cleanedPointsCount = 0;
        this.initProgressGrid();
        this.setFillAmount(0);
        this.percentText.setText('0%');

        if (this.promptText) {
            this.promptText.setText('POWER WASH TO CLEAN!');
            this.promptText.setColor('#00ffff');
        }

        // Hide intermediate poolSoap so poolClean underneath is revealed when erasing soap canvas
        if (this.poolSoap) {
            this.poolSoap.setVisible(false);
        }

        // Setup soap canvas on top of pool_clean
        const sourceSoap = this.textures.get('pool_soap').getSourceImage();
        this.eraseCtx.globalCompositeOperation = 'source-over';
        this.eraseCtx.drawImage(sourceSoap, 0, 0);
        this.eraseCanvas.refresh();

        // Switch to gun_nozzle1 (used second)
        this.gunNozzle.setTexture('gun_nozzle1');
        this.waterStreamEmitter = this.waterStreamEmitter_nozzle1;
        this.currentStreamOffsetY = this.streamOffsetY_nozzle1;
        this.currentCleanRadius = this.cleanRadius_nozzle1;
        if (this.gunPipe) this.gunPipe.setVisible(true);

        // Slide gun up again
        this.gunContainer.setPosition(this.gameWidth * 0.5, this.gameHeight + 400);
        this.tweens.add({
            targets: this.gunContainer,
            y: this.gameHeight * 0.88,
            duration: 600,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.canClean = true;
                this.showSwipeTutorial();
            }
        });
    }

    initProgressGrid() {
        this.gridCols = 16;
        this.gridRows = 20;
        this.samplePoints = [];

        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const u = (c + 0.5) / this.gridCols;
                const v = (r + 0.5) / this.gridRows;
                this.samplePoints.push({ u, v, cleaned: false });
            }
        }
        this.totalPoints = this.samplePoints.length;
        this.cleanedPointsCount = 0;
    }

    setupEffects() {
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

        this.streamOffsetY_nozzle = 0;    // Dành cho gun_nozzle
        this.streamOffsetY_nozzle1 = 50;   // Dành cho gun_nozzle1
        this.cleanRadius_nozzle = 45;     // Dành cho gun_nozzle (mặc định 45px)
        this.cleanRadius_nozzle1 = 55;    // Dành cho gun_nozzle1

        this.waterStreamEmitter = this.waterStreamEmitter_nozzle;
        this.currentStreamOffsetY = this.streamOffsetY_nozzle;
        this.currentCleanRadius = this.cleanRadius_nozzle;

        // Water impact splash drops (Depth 18)
        this.waterEmitter = this.add.particles(0, 0, 'water', {
            speed: { min: 80, max: 220 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.45, end: 0.9 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 500,
            gravityY: 200,
            tint: [0xaaeeff, 0xddf5ff, 0xffffff, 0x88ccff],
            emitting: false
        });
        this.waterEmitter.setDepth(18);

        // Mist splash (Depth 15)
        this.waterMistEmitter = this.add.particles(0, 0, 'water', {
            speed: { min: 60, max: 160 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0.8 },
            alpha: { start: 0.75, end: 0 },
            lifespan: 600,
            gravityY: 150,
            tint: [0xccf0ff, 0xeefaff, 0xffffff],
            emitting: false
        });
        this.waterMistEmitter.setDepth(15);

        // Soft glow at impact (Depth 13)
        this.sprayDomeGlow = this.add.image(0, 0, 'radial_glow');
        this.sprayDomeGlow.setDepth(13);
        this.sprayDomeGlow.setTint(0x88ddff);
        this.sprayDomeGlow.setAlpha(0.35);
        this.sprayDomeGlow.setScale(1.2);
        this.sprayDomeGlow.setBlendMode('ADD');
        this.sprayDomeGlow.setVisible(false);

        // Bubble particles (Depth 17)
        this.bubbleEmitter = this.add.particles(0, 0, 'bubble', {
            speed: { min: 40, max: 90 },
            angle: { min: -130, max: -50 },
            scale: { min: 0.25, max: 0.45 },
            alpha: { start: 0.9, end: 0 },
            lifespan: { min: 900, max: 1500 },
            gravityY: -60,
            emitting: false
        });
        this.bubbleEmitter.setDepth(17);

        // Sparkle particles (Depth 20)
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

        // Water pipe attached to nozzle handle going down (visible for gun_nozzle1)
        this.gunPipe = this.add.image(0, 0, 'water_pipe');
        this.gunPipe.setOrigin(0.5, 0.04);
        this.gunPipe.setScale(1.2, 1.0);
        this.gunPipe.setVisible(false);

        const gunScale = 0.68;
        this.gunNozzle = this.add.image(0, 0, 'gun_nozzle');
        this.gunNozzle.setOrigin(0.5, 0.95);
        this.gunNozzle.setScale(gunScale);

        this.gunContainer.add([this.gunPipe, this.gunNozzle]);
        this.gunTipOffset = 400 * 0.90 * gunScale;

        const initAngle = Phaser.Math.DegToRad(-90);
        this.gunContainer.setRotation(initAngle + Math.PI / 2);
    }

    setupUI() {
        const { width, height } = this.scale;

        this.topUI = this.add.container(width / 2, Math.max(50, height * 0.08));
        this.topUI.setDepth(35);

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

        this.promptText = this.add.text(0, 35, 'TAP TO REMOVE TRASH!', {
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

    setupTutorial() {
        const width = this.gameWidth;
        const height = this.gameHeight;

        this.tutorialContainer = this.add.container(width * 0.5, height * 0.5);
        this.tutorialContainer.setDepth(30);
        this.tutorialContainer.setVisible(false);

        this.tutorialHand = this.add.image(0, 0, 'hand');
        this.tutorialHand.setScale(0.52);
        this.tutorialContainer.add(this.tutorialHand);

        this.tutorialTween = this.tweens.add({
            targets: this.tutorialHand,
            scaleX: 0.42,
            scaleY: 0.42,
            yoyo: true,
            repeat: -1,
            duration: 350,
            ease: 'Sine.easeInOut'
        });
    }

    showSwipeTutorial() {
        if (this.isGameEnd || !this.canClean || !this.tutorialContainer) return;
        this.tutorialContainer.setVisible(true);
        this.tutorialContainer.setPosition(this.poolX, this.poolY + 30);

        if (this.tutorialTween) this.tutorialTween.stop();
        this.tutorialHand.setScale(0.52);

        this.tutorialTween = this.tweens.add({
            targets: this.tutorialHand,
            x: { from: -80, to: 80 },
            y: { from: 20, to: -20 },
            yoyo: true,
            repeat: -1,
            duration: 800,
            ease: 'Sine.easeInOut'
        });
    }

    hideTutorial() {
        if (this.tutorialContainer && this.tutorialContainer.visible) {
            this.tutorialContainer.setVisible(false);
            if (this.tutorialTween) this.tutorialTween.stop();
        }
    }

    setupCameras() {
        const { width, height } = this.scale;

        this.uiCamera = this.cameras.add(0, 0, width, height);
        this.uiCamera.setZoom(1.0);

        // Main camera ignores UI
        const uiElements = [this.topUI];
        if (this.ctaBtn) uiElements.push(this.ctaBtn);
        this.cameras.main.ignore(uiElements.filter(Boolean));

        // UI camera ignores world elements
        const worldElements = [
            this.bg,
            this.poolClean,
            this.poolSoap,
            this.poolCanvasImg,
            this.poolGlow,
            this.waterLayer,
            ...this.trashItems,
            this.waterGraphics,
            this.waterStreamEmitter_nozzle,
            this.waterStreamEmitter_nozzle1,
            this.waterEmitter,
            this.waterMistEmitter,
            this.bubbleEmitter,
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

    createProceduralWaterSound() {
        if (!this.sound.context) return;
        const ctx = this.sound.context;
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

                        this.proceduralFilter = ctx.createBiquadFilter();
                        this.proceduralFilter.type = 'bandpass';
                        this.proceduralFilter.frequency.value = 1600;
                        this.proceduralFilter.Q.value = 1.6;

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
            } catch (e) {}
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
            if (this.isGameEnd || !this.canClean) return;

            this.hasStartedInteracting = true;
            this.hideTutorial();

            this.isSpraying = true;
            this.startSpraySound();

            this.setCameraZoomSmooth(1 / 1.2, 700);

            this.lastCanvasX = null;
            this.lastCanvasY = null;
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

            if (!this.isGameEnd) {
                this.setCameraZoomSmooth(1 / 1.4, 700);
            }

            this.targetShiftX = 0;
            this.waterGraphics.clear();
            this.waterStreamEmitter.stop();
            this.waterEmitter.stop();
            this.waterMistEmitter.stop();
            if (this.bubbleEmitter) this.bubbleEmitter.stop();
            if (this.sprayDomeGlow) this.sprayDomeGlow.setVisible(false);

            if (!this.isGameEnd && this.canClean) {
                this.tutorialTimer = this.time.delayedCall(2000, () => {
                    this.showSwipeTutorial();
                });
            }
        });
    }

    handleSpray(pointerX, pointerY) {
        if (this.isGameEnd || !this.canClean) return;

        const gunBaseX = pointerX;
        const gunBaseY = pointerY + 100;
        this.gunContainer.setPosition(gunBaseX, gunBaseY);

        const centerX = this.gameWidth / 2;
        const offsetFromCenter = (gunBaseX - centerX) / (centerX * 1.1);
        const clampedOffset = Phaser.Math.Clamp(offsetFromCenter, -1, 1);

        const deadZone = 35;
        const diffX = gunBaseX - centerX;
        const MAX_SHIFT_X = 20;

        if (Math.abs(diffX) > deadZone) {
            const availableRange = centerX - deadZone;
            const sign = Math.sign(diffX);
            const rawRatio = (Math.abs(diffX) - deadZone) / (availableRange * 0.9);
            const clampedRatio = Phaser.Math.Clamp(rawRatio, 0, 1);
            const smoothRatio = Math.pow(clampedRatio, 1.4);
            this.targetShiftX = -sign * smoothRatio * MAX_SHIFT_X;
        } else {
            this.targetShiftX = 0;
        }

        const angleDeg = -90 + clampedOffset * 18;
        const angle = Phaser.Math.DegToRad(angleDeg);
        this.gunContainer.setRotation(angle + Math.PI / 2);

        const tipX = gunBaseX + Math.cos(angle) * this.gunTipOffset;
        const tipY = gunBaseY + Math.sin(angle) * this.gunTipOffset;

        const jetLength = 150;
        const hitX = tipX + Math.cos(angle) * jetLength;
        const hitY = tipY + Math.sin(angle) * jetLength;

        this.waterGraphics.clear();

        const angleDeg2 = Phaser.Math.RadToDeg(angle);
        this.waterStreamEmitter.setPosition(tipX, tipY + (this.currentStreamOffsetY || 0));
        this.waterStreamEmitter.setEmitterAngle({ min: angleDeg2 - 18, max: angleDeg2 + 18 });
        if (!this.waterStreamEmitter.emitting) this.waterStreamEmitter.start();

        const poolLeft = this.poolX - this.poolDisplayW / 2;
        const poolTop = this.poolY - this.poolDisplayH / 2;

        const curCanvasX = ((hitX - poolLeft) / this.poolDisplayW) * this.canvasW;
        const curCanvasY = ((hitY - poolTop) / this.poolDisplayH) * this.canvasH;

        const curU = (hitX - poolLeft) / this.poolDisplayW;
        const curV = (hitY - poolTop) / this.poolDisplayH;

        const cleanRadius = this.currentCleanRadius || 48;
        const eraseCanvasRadius = cleanRadius * (this.canvasW / this.poolDisplayW);

        // Check if hitting pool bounds
        const isHittingPool = (
            hitX >= poolLeft - 20 && hitX <= poolLeft + this.poolDisplayW + 20 &&
            hitY >= poolTop - 20 && hitY <= poolTop + this.poolDisplayH + 20
        );

        if (isHittingPool) {
            const now = this.time.now;

            // Impact particles at hit point (emitted in world space, independent of tool movement)
            if (this.waterEmitter && (now - this.lastWaterSplashTime > 40)) {
                this.lastWaterSplashTime = now;
                this.waterEmitter.emitParticleAt(hitX, hitY, 2);
            }

            if (this.waterMistEmitter && (now - this.lastMistTime > 50)) {
                this.lastMistTime = now;
                this.waterMistEmitter.emitParticleAt(hitX, hitY, 2);
            }

            // Bubble particles floating upwards naturally at world hit location (independent of tool movement)
            if (this.bubbleEmitter && (now - this.lastBubbleTime > 55)) {
                this.lastBubbleTime = now;
                const spreadX = hitX + Phaser.Math.Between(-15, 15);
                const spreadY = hitY + Phaser.Math.Between(-10, 10);
                this.bubbleEmitter.emitParticleAt(spreadX, spreadY, Phaser.Math.Between(1, 2));
            }

            // Glow at impact point
            if (this.sprayDomeGlow) {
                this.sprayDomeGlow.setPosition(hitX, hitY);
                this.sprayDomeGlow.setVisible(true);
            }

            // Erase canvas layer
            this.eraseCtx.save();
            this.eraseCtx.globalCompositeOperation = 'destination-out';

            if (this.lastCanvasX !== null && this.lastCanvasY !== null) {
                this.eraseCtx.lineWidth = eraseCanvasRadius * 2;
                this.eraseCtx.lineCap = 'round';
                this.eraseCtx.lineJoin = 'round';
                this.eraseCtx.beginPath();
                this.eraseCtx.moveTo(this.lastCanvasX, this.lastCanvasY);
                this.eraseCtx.lineTo(curCanvasX, curCanvasY);
                this.eraseCtx.stroke();
            }

            this.eraseCtx.beginPath();
            this.eraseCtx.arc(curCanvasX, curCanvasY, eraseCanvasRadius, 0, Math.PI * 2);
            this.eraseCtx.fill();
            this.eraseCtx.restore();

            this.eraseCanvas.refresh();

            this.checkProgressUV(curU, curV);
        } else {
            if (this.sprayDomeGlow) this.sprayDomeGlow.setVisible(false);
        }

        this.lastCanvasX = curCanvasX;
        this.lastCanvasY = curCanvasY;
    }

    checkProgressUV(targetU, targetV) {
        const radiusU = (this.currentCleanRadius / 45) * 0.15;
        let newlyCleaned = 0;

        for (let i = 0; i < this.samplePoints.length; i++) {
            const pt = this.samplePoints[i];
            if (!pt.cleaned) {
                const du = targetU - pt.u;
                const dv = targetV - pt.v;
                if (Math.hypot(du, dv) <= radiusU) {
                    pt.cleaned = true;
                    this.cleanedPointsCount++;
                    newlyCleaned++;
                }
            }
        }

        if (newlyCleaned > 0) {
            const rawProgress = (this.cleanedPointsCount / this.totalPoints) * 100;
            this.progress = Math.min(100, Math.round(rawProgress));
            this.updateProgressBar();

            if (this.currentPhase === 'wash' && (this.progress % 10 === 0 || newlyCleaned > 3)) {
                const poolLeft = this.poolX - this.poolDisplayW / 2;
                const poolTop = this.poolY - this.poolDisplayH / 2;
                const sx = poolLeft + targetU * this.poolDisplayW;
                const sy = poolTop + targetV * this.poolDisplayH;
                this.sparkleEmitter.emitParticleAt(sx, sy, 4);
            }

            // Check phase completion
            if (this.progress >= 96) {
                if (this.currentPhase === 'soap') {
                    this.completeSoapPhase();
                } else if (this.currentPhase === 'wash' && !this.isGameEnd) {
                    this.triggerWin();
                    this.createConfetti();
                    if (typeof window.gameEnd === 'function') {
                        window.gameEnd();
                    }
                }
            }
        }
    }

    completeSoapPhase() {
        this.canClean = false;
        this.isSpraying = false;
        this.stopSpraySound();
        this.waterStreamEmitter.stop();
        if (this.bubbleEmitter) this.bubbleEmitter.stop();
        if (this.sprayDomeGlow) this.sprayDomeGlow.setVisible(false);

        // Retract gun_nozzle1
        this.tweens.add({
            targets: this.gunContainer,
            y: this.gameHeight + 400,
            duration: 500,
            ease: 'Back.easeIn',
            onComplete: () => {
                this.time.delayedCall(400, () => {
                    this.startWashPhase();
                });
            }
        });
    }

    updateProgressBar() {
        const fillRatio = this.progress / 100;
        this.setFillAmount(fillRatio);
        this.percentText.setText(`${this.progress}%`);
    }

    setFillAmount(amount) {
        amount = Phaser.Math.Clamp(amount, 0, 1);
        const sourceWidth = this.progressBarFill.width;
        const sourceHeight = this.progressBarFill.height;

        this.progressBarFill.setCrop(0, 0, sourceWidth * amount, sourceHeight);
    }

    triggerWin() {
        this.isGameEnd = true;
        this.isSpraying = false;
        this.targetShiftX = 0;
        this.stopSpraySound();
        this.waterGraphics.clear();
        this.waterStreamEmitter.stop();
        this.waterEmitter.stop();
        this.waterMistEmitter.stop();
        if (this.bubbleEmitter) this.bubbleEmitter.stop();
        this.hideTutorial();

        this.progress = 100;
        this.updateProgressBar();

        // Fade out any remaining canvas layer
        if (this.poolCanvasImg) {
            this.tweens.add({
                targets: this.poolCanvasImg,
                alpha: 0,
                duration: 350
            });
        }

        // Retract water gun
        this.tweens.add({
            targets: this.gunContainer,
            y: this.gameHeight + 2500,
            duration: 600,
            ease: 'Back.easeIn'
        });

        this.winSound.play();
        this.sparkleSound.play();

        // Glow animation
        this.tweens.add({
            targets: this.poolGlow,
            alpha: 0.85,
            scaleX: 2.8,
            scaleY: 2.8,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Sparkle burst across pool
        this.time.addEvent({
            delay: 150,
            repeat: 20,
            callback: () => {
                const rx = this.poolX + Phaser.Math.Between(-this.poolDisplayW * 0.4, this.poolDisplayW * 0.4);
                const ry = this.poolY + Phaser.Math.Between(-this.poolDisplayH * 0.4, this.poolDisplayH * 0.4);
                this.sparkleEmitter.emitParticleAt(rx, ry, 6);
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
        this.cameras.main.ignore(endcard);

        this.tweens.add({
            targets: endcard,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 500,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: [bigBtn, subLabel],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    update(time, delta) {
        const lerpFactor = 0.06;
        this.currentShiftX += (this.targetShiftX - this.currentShiftX) * lerpFactor;
        this.poolX = this.basePoolX + this.currentShiftX;

        if (this.bg) {
            this.bg.x = this.baseBgX + this.currentShiftX;
        }

        if (this.poolClean) {
            this.poolClean.x = this.poolX;
            if (this.poolSoap) this.poolSoap.x = this.poolX;
            if (this.poolCanvasImg) this.poolCanvasImg.x = this.poolX;
            if (this.poolGlow) this.poolGlow.x = this.poolX;
            if (this.waterLayer) this.waterLayer.x = this.poolX;
        }
    }

    handleResize(gameSize) {
        const { width, height } = this.scale;
        this.gameWidth = width;
        this.gameHeight = height;

        if (this.uiCamera) {
            this.uiCamera.setSize(width, height);
        }

        this.basePoolX = width / 2;
        this.baseBgX = width / 2;
        this.basePoolY = height * 0.44;
        this.baseBgY = height * 0.35;
        this.poolX = this.basePoolX + this.currentShiftX;

        const targetPoolHeight = Math.min(height * 0.52, 480);
        const sourceDirty = this.textures.get('pool_dirty').getSourceImage();
        const aspect = sourceDirty.width / sourceDirty.height;
        this.poolDisplayH = targetPoolHeight;
        this.poolDisplayW = targetPoolHeight * aspect;

        if (this.poolClean) {
            this.poolClean.setPosition(this.poolX, this.poolY).setDisplaySize(this.poolDisplayW, this.poolDisplayH);
            if (this.poolSoap) this.poolSoap.setPosition(this.poolX, this.poolY).setDisplaySize(this.poolDisplayW, this.poolDisplayH);
            if (this.poolCanvasImg) this.poolCanvasImg.setPosition(this.poolX, this.poolY).setDisplaySize(this.poolDisplayW, this.poolDisplayH);
            if (this.waterLayer) this.waterLayer.setPosition(this.poolX, this.poolY).setDisplaySize(this.poolDisplayW * 0.96, this.poolDisplayH * 0.95);
            if (this.poolGlow) this.poolGlow.setPosition(this.poolX, this.poolY);
        }

        if (this.topUI) {
            this.topUI.setPosition(width / 2, Math.max(50, height * 0.08));
        }
    }

    createConfetti() {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800];

        const leftCannon = this.add.particles(-10, 600, 'confetti', {
            speed: { min: 400, max: 800 },
            angle: { min: -80, max: -60 },
            gravityY: 500,
            lifespan: 4000,
            scale: { start: 1.5, end: 0.5 },
            rotate: { min: 0, max: 720 },
            tint: colors,
            quantity: 50
        });

        const rightCannon = this.add.particles(500, 600, 'confetti', {
            speed: { min: 400, max: 800 },
            angle: { min: -130, max: -100 },
            gravityY: 500,
            lifespan: 4000,
            scale: { start: 1.5, end: 0.5 },
            rotate: { min: 0, max: 720 },
            tint: colors,
            quantity: 50
        });

        leftCannon.setDepth(5000);
        rightCannon.setDepth(5000);

        leftCannon.explode();
        rightCannon.explode();

        this.time.delayedCall(5000, () => {
            leftCannon.destroy();
            rightCannon.destroy();
        });
    }

    ShowStore() {
        const storeUrl = "https://play.google.com/store/apps/details?id=com.d28.makeover.asmr.home.cleaning.game";
        console.log("Playturbo: ShowStore triggered");

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