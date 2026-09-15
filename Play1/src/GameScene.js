import Phaser from 'phaser';

// Import all textures
import bgImg from './assets/Texture/bg_stadium.png';
import trophyCleanImg from './assets/Texture/trophy_clean.png';
import trophyDirtyImg from './assets/Texture/trophy_dirty.png';
import mudSplatterImg from './assets/Texture/mud_splatter.png';
import sparkleImg from './assets/Texture/sparkle.png';
import radialGlowImg from './assets/Texture/radial_glow.png';
import btnTryNowImg from './assets/Texture/btn_try_now.png';
import progressBgImg from './assets/Texture/progress_bg.png';
import progressFillImg from './assets/Texture/progress_fill.png';
import gunNozzleImg from './assets/Texture/gun_nozzle.png';
import handImg from './assets/Texture/hand.png';
import waterImg from './assets/Texture/water.png';

// Import sounds
import spraySnd from './assets/Sound/spray.wav';
import mudWashSnd from './assets/Sound/mud_wash.wav';
import sparkleSnd from './assets/Sound/sparkle.wav';
import winSnd from './assets/Sound/win.wav';
import clickSnd from './assets/Sound/click.wav';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load textures
        this.load.image('bg_stadium', bgImg);
        this.load.image('trophy_clean', trophyCleanImg);
        this.load.image('trophy_dirty', trophyDirtyImg);
        this.load.image('mud_splatter', mudSplatterImg);
        this.load.image('sparkle', sparkleImg);
        this.load.image('radial_glow', radialGlowImg);
        this.load.image('btn_try_now', btnTryNowImg);
        this.load.image('progress_bg', progressBgImg);
        this.load.image('progress_fill', progressFillImg);
        this.load.image('gun_nozzle', gunNozzleImg);
        this.load.image('hand', handImg);
        this.load.image('water', waterImg);

        // Load audio
        this.load.audio('spray', spraySnd);
        this.load.audio('mud_wash', mudWashSnd);
        this.load.audio('sparkle', sparkleSnd);
        this.load.audio('win', winSnd);
        this.load.audio('click', clickSnd);
    }

    create() {
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        this.isGameEnd = false;
        this.isSpraying = false;
        this.isAudioPlaying = false; // Biến kiểm tra âm thanh phun nước đang phát hay chưa
        this.progress = 0;
        this.cleanedPointsCount = 0;
        this.lastWashSoundTime = 0;
        this.lastCanvasX = null;
        this.lastCanvasY = null;

        this.targetShiftY = 0;
        this.currentShiftY = 0;
        this.baseTrophyY = this.scale.height * 0.48;
        this.baseBgY = this.scale.height / 2;

        // Sound instances
        this.spraySound = this.sound.add('spray', { loop: true, volume: 0.55 });
        this.sparkleSound = this.sound.add('sparkle', { volume: 0.8 });
        this.winSound = this.sound.add('win', { volume: 0.9 });
        this.clickSound = this.sound.add('click', { volume: 0.8 });

        // 1. Background — cover full canvas with margin for camera zoom
        const { width, height } = this.scale;
        this.bg = this.add.image(width / 2, this.baseBgY, 'bg_stadium');
        this.bg.setDepth(-1);
        const bgScaleX = width / this.bg.width;
        const bgScaleY = height / this.bg.height;
        this.bg.setScale(Math.max(bgScaleX, bgScaleY) * 1.65);

        // Set initial wide camera zoom (1.4x wider view)
        this.cameraZoomTween = null;
        this.cameras.main.setZoom(1 / 1.4);

        // 2. Setup Trophy (Clean underneath, Dirty Canvas on top)
        this.setupTrophy();

        // 3. Water Jet Graphics & Particles
        this.setupEffects();

        // 4. Pressure Washer Gun
        this.setupWaterGun();

        // 5. UI Elements
        this.setupUI();

        // 6. Tutorial Hand
        this.setupTutorial();

        // 7. Setup Separate UI Camera (fixes UI scale & position independent of world zoom)
        this.setupCameras();

        // 8. Input listeners
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
        const { width, height } = this.scale;
        this.trophyX = width / 2;
        this.baseTrophyY = height * 0.38;
        this.trophyY = this.baseTrophyY;

        const targetTrophyHeight = Math.min(height * 0.58, 540);
        const scale = targetTrophyHeight / 1024;
        this.trophyScale = scale;

        this.trophyDisplayW = 492 * scale;
        this.trophyDisplayH = 1024 * scale;

        // Glow behind trophy for victory (Depth 4)
        this.trophyGlow = this.add.image(this.trophyX, this.trophyY, 'radial_glow');
        this.trophyGlow.setDepth(4);
        this.trophyGlow.setScale(scale * 2.5);
        this.trophyGlow.setTint(0xffdf66);
        this.trophyGlow.setAlpha(0);

        // Clean Golden Trophy Underneath (Depth 5)
        this.trophyClean = this.add.image(this.trophyX, this.trophyY, 'trophy_clean');
        this.trophyClean.setDepth(5);
        this.trophyClean.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);

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
        // Water beam graphic (subtle core line only, depth 14)
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(14);

        // === WATER PARTICLES ALONG THE STREAM (Depth 16) ===
        // Spawned at nozzle tip, fly along beam direction, many & dense
        this.waterStreamEmitter = this.add.particles(0, 0, 'water', {
            speed: { min: 300, max: 460 },
            angle: { min: -92, max: -88 }, // straight up, overridden per-frame
            scale: { start: 1.6, end: 0.5 },
            alpha: { start: 0.95, end: 0.4 },
            lifespan: { min: 200, max: 300 },
            tint: [0x9ee4ff, 0xc8f0ff, 0xe8f8ff, 0xffffff],
            frequency: 10, // emit every 10ms
            quantity: 5,   // 5 particles per emit
            emitting: false
        });
        this.waterStreamEmitter.setDepth(16);

        // === WATER IMPACT — 3 sequential drops, grow & fall gently (Depth 17) ===
        // frequency = lifespan/3 so 3 drops always exist in different stages
        this.waterEmitter = this.add.particles(0, 0, 'water', {
            speed: { min: 80, max: 180 },    // visible fall speed
            angle: { min: 0, max: 360 },    // pointing mostly downward
            scale: { start: 1, end: 3.5 }, // grows as it falls
            alpha: { start: 1.0, end: 0 },
            lifespan: 600,
            gravityY: 300,                   // pulls it down clearly
            tint: [0xaaeeff, 0xddf5ff, 0xffffff, 0x88ccff],
            frequency: 100,   // = lifespan/3, creates 3 sequential drops
            quantity: 1,
            emitting: false
        });
        this.waterEmitter.setDepth(17);

        // === SECOND LAYER — slightly offset, smaller (Depth 15) ===
        this.waterMistEmitter = this.add.particles(0, 0, 'water', {
            speed: { min: 60, max: 140 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 2.5 },
            alpha: { start: 0.75, end: 0 },
            lifespan: 540,
            gravityY: 250,
            tint: [0xccf0ff, 0xeefaff, 0xffffff],
            frequency: 90,   // = lifespan/3
            quantity: 1,
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
        this.mudEmitter = this.add.particles(0, 0, 'mud_splatter', {
            speed: { min: 70, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.15, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 420,
            tint: [0x5c3317, 0x4a2810, 0x784420],
            emitting: false
        });
        this.mudEmitter.setDepth(18);

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
        const { width, height } = this.scale;
        this.gunContainer = this.add.container(width * 0.72, height * 0.78);
        this.gunContainer.setDepth(25);

        const gunScale = 0.68;
        this.gunNozzle = this.add.image(0, 0, 'gun_nozzle');
        this.gunNozzle.setOrigin(0.5, 0.95);
        this.gunNozzle.setScale(gunScale);

        this.gunContainer.add(this.gunNozzle);
        // Distance from pivot (0.95) to nozzle tip (0.05)
        this.gunTipOffset = 400 * 0.90 * gunScale; // ~245px

        const initAngle = Phaser.Math.DegToRad(-58);
        this.gunContainer.setRotation(initAngle + Math.PI / 2);
    }

    setupUI() {
        const { width, height } = this.scale;

        this.topUI = this.add.container(width / 2, Math.max(50, height * 0.08));
        this.topUI.setDepth(30);

        this.titleText = this.add.text(0, -35, 'MAKEOVER ASMR: HOME CLEANUP', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this.topUI.add(this.titleText);

        this.progressBarBg = this.add.image(0, 5, 'progress_bg');
        this.progressBarBg.setDisplaySize(240, 36);
        this.topUI.add(this.progressBarBg);

        this.progressBarFill = this.add.image(-120, 5, 'progress_fill');
        this.progressBarFill.setOrigin(0, 0.5);
        this.progressBarFill.setDisplaySize(0, 36);
        this.maxFillWidth = 240;
        this.topUI.add(this.progressBarFill);

        this.percentText = this.add.text(0, 5, '0%', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#004d00',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.topUI.add(this.percentText);

        this.promptText = this.add.text(0, 35, 'Wash the Trophy!', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffea75',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.topUI.add(this.promptText);

        // this.ctaBtn = this.add.image(width / 2, height * 0.92, 'btn_try_now');
        // this.ctaBtn.setDepth(35);
        // this.ctaBtn.setScale(0.9);
        // this.ctaBtn.setInteractive({ useHandCursor: true });
        // this.ctaBtn.on('pointerdown', (pointer) => {
        //     pointer.event.stopPropagation();
        //     this.clickSound.play();
        //     this.ShowStore();
        // });

        this.tweens.add({
            targets: this.ctaBtn,
            scaleX: 0.98,
            scaleY: 0.98,
            yoyo: true,
            repeat: -1,
            duration: 750,
            ease: 'Sine.easeInOut'
        });
    }

    setupCameras() {
        const { width, height } = this.scale;
        this.uiCamera = this.cameras.add(0, 0, width, height);
        this.uiCamera.setZoom(1.0);

        // Main Camera ignores UI
        const uiElements = [this.topUI];
        if (this.ctaBtn) uiElements.push(this.ctaBtn);
        this.cameras.main.ignore(uiElements);

        // UI Camera ignores World objects
        const worldElements = [
            this.bg,
            this.trophyClean,
            this.trophyMud,
            this.trophyGlow,
            this.waterGraphics,
            this.waterStreamEmitter,
            this.waterEmitter,
            this.waterMistEmitter,
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
        const { width, height } = this.scale;
        this.tutorialContainer = this.add.container(width * 0.72, height * 0.78);
        this.tutorialContainer.setDepth(28);

        this.tutorialHand = this.add.image(0, 0, 'hand');
        this.tutorialHand.setScale(0.85);
        this.tutorialContainer.add(this.tutorialHand);

        this.tutorialTween = this.tweens.add({
            targets: this.tutorialHand,
            x: { from: 10, to: -60 },
            y: { from: 0, to: -80 },
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
        if (this.isGameEnd || !this.tutorialContainer) return;
        this.tutorialContainer.setVisible(true);
        if (this.tutorialTween) this.tutorialTween.resume();
    }

    startSpraySound() {
        if (this.sound.context && this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
        if (!this.isAudioPlaying) {
            if (this.spraySound && !this.spraySound.isPlaying) {
                this.spraySound.play();
            }
            this.isAudioPlaying = true;
        }
    }

    stopSpraySound() {
        if (this.isAudioPlaying) {
            if (this.spraySound && this.spraySound.isPlaying) {
                this.spraySound.stop();
            }
            this.isAudioPlaying = false;
        }
    }

    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameEnd) {
                return;
            }
            this.hideTutorial();
            if (this.tutorialTimer) this.tutorialTimer.remove();

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
            if (this.isSpraying && !this.isGameEnd) {
                this.handleSpray(pointer.worldX, pointer.worldY);
            }
        });

        this.input.on('pointerup', () => {
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

            this.waterGraphics.clear();
            this.waterStreamEmitter.stop();
            this.waterEmitter.stop();
            this.waterMistEmitter.stop();
            this.mudEmitter.stop();
            if (this.sprayDomeGlow) this.sprayDomeGlow.setVisible(false);

            if (!this.isGameEnd) {
                this.tutorialTimer = this.time.delayedCall(2500, () => {
                    this.showTutorial();
                });
            }
        });
    }

    handleSpray(pointerX, pointerY) {
        if (this.isGameEnd) return;

        // Position the tool directly at the player's touch / cursor
        const gunBaseX = pointerX;
        const gunBaseY = pointerY;

        this.gunContainer.setPosition(gunBaseX, gunBaseY);

        // Center-based smooth tilt: Straight UP (-90 deg) at center, smoothly tilts left/right based on position
        const centerX = this.gameWidth / 2;
        const offsetFromCenter = (gunBaseX - centerX) / (centerX * 1.1); // -1 (left) to +1 (right)
        const clampedOffset = Phaser.Math.Clamp(offsetFromCenter, -1, 1);
        
        // Smooth gentle tilt (up to +/- 18 degrees) without jitter
        const angleDeg = -90 + clampedOffset * 18;
        const angle = Phaser.Math.DegToRad(angleDeg);

        this.gunContainer.setRotation(angle + Math.PI / 2);

        // Nozzle tip coordinates
        const tipX = gunBaseX + Math.cos(angle) * this.gunTipOffset;
        const tipY = gunBaseY + Math.sin(angle) * this.gunTipOffset;

        // Water jet impact point ahead of the nozzle tip
        const jetLength = 120;
        const hitX = tipX + Math.cos(angle) * jetLength;
        const hitY = tipY + Math.sin(angle) * jetLength;

        // === WATER STREAM: emit water particles from tip flying along beam direction ===
        this.waterGraphics.clear();
        // Core beam line — wider for visibility
        this.waterGraphics.lineStyle(10, 0xd4f4ff, 0.5);
        this.waterGraphics.lineBetween(tipX, tipY, hitX, hitY);
        this.waterGraphics.lineStyle(5, 0xffffff, 0.8);
        this.waterGraphics.lineBetween(tipX, tipY, hitX, hitY);

        // Stream particles: shoot from nozzle tip in beam direction
        const angleDeg2 = Phaser.Math.RadToDeg(angle);
        this.waterStreamEmitter.setPosition(tipX, tipY);
        this.waterStreamEmitter.setAngle({ min: angleDeg2 - 4, max: angleDeg2 + 4 });
        if (!this.waterStreamEmitter.emitting) this.waterStreamEmitter.start();

        // Spawn extra particles along beam for full-length density
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const bx = tipX + Math.cos(angle) * jetLength * t;
            const by = tipY + Math.sin(angle) * jetLength * t;
            this.waterStreamEmitter.emitParticleAt(bx, by, 2);
        }

        // Impact particles at hit point
        this.waterEmitter.setPosition(hitX, hitY);
        this.waterEmitter.setAngle({ min: angleDeg2 + 110, max: angleDeg2 + 250 });
        if (!this.waterEmitter.emitting) this.waterEmitter.start();

        this.waterMistEmitter.setPosition(hitX, hitY);
        if (!this.waterMistEmitter.emitting) this.waterMistEmitter.start();

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

        const eraseCanvasRadius = 45 * (this.dirtyCanvasW / this.trophyDisplayW);

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
        const radiusU = 0.16; // UV radius coverage
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

            if (this.progress >= 85 && !this.isGameEnd) {
                this.triggerWin();
            }
        }
    }

    updateProgressBar() {
        const fillW = Math.max(1, (this.progress / 100) * this.maxFillWidth);
        this.progressBarFill.setDisplaySize(fillW, 36);
        this.percentText.setText(`${this.progress}%`);
    }

    triggerWin() {
        this.isGameEnd = true;
        this.isSpraying = false;
        this.stopSpraySound();
        this.waterGraphics.clear();
        this.waterEmitter.stop();
        this.mudEmitter.stop();
        this.hideTutorial();

        this.progress = 100;
        this.updateProgressBar();

        // Fade out mud layer completely
        this.tweens.add({
            targets: this.trophyMud,
            alpha: 0,
            duration: 350
        });

        // Retract water gun smoothly
        this.tweens.add({
            targets: this.gunContainer,
            y: this.gameHeight + 250,
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

        // // Trophy celebratory bounce & pulse
        // this.tweens.add({
        //     targets: this.trophyClean,
        //     scaleX: 1.08,
        //     scaleY: 1.08,
        //     duration: 550,
        //     yoyo: true,
        //     repeat: 2,
        //     ease: 'Back.easeOut'
        // });

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
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.gameWidth = width;
        this.gameHeight = height;

        if (this.uiCamera) {
            this.uiCamera.setSize(width, height);
        }

        this.baseTrophyY = height * 0.48;
        this.baseBgY = height / 2;
        this.trophyY = this.baseTrophyY + this.currentShiftY;
        this.trophyX = width / 2;

        this.resizeBackground();

        const targetTrophyHeight = Math.min(height * 0.58, 540);
        const scale = targetTrophyHeight / 1024;
        this.trophyScale = scale;
        this.trophyDisplayW = 492 * scale;
        this.trophyDisplayH = 1024 * scale;

        if (this.trophyClean) {
            this.trophyClean.setPosition(this.trophyX, this.trophyY).setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
            this.trophyGlow.setPosition(this.trophyX, this.trophyY);
            if (this.trophyMud) {
                this.trophyMud.setPosition(this.trophyX, this.trophyY).setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
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