import Phaser from 'phaser';

// Import all textures
import bgImg from './assets/Texture/bg_stadium.png';
import trophyCleanImg from './assets/Texture/trophy_clean.png';
import trophyDirtyImg from './assets/Texture/trophy_dirty.png';
import waterDropsImg from './assets/Texture/water_drops.png';
import mudSplatterImg from './assets/Texture/mud_splatter.png';
import sparkleImg from './assets/Texture/sparkle.png';
import radialGlowImg from './assets/Texture/radial_glow.png';
import btnTryNowImg from './assets/Texture/btn_try_now.png';
import progressBgImg from './assets/Texture/progress_bg.png';
import progressFillImg from './assets/Texture/progress_fill.png';
import gunNozzleImg from './assets/Texture/gun_nozzle.png';
import handImg from './assets/Texture/hand.png';

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
        this.load.image('water_drops', waterDropsImg);
        this.load.image('mud_splatter', mudSplatterImg);
        this.load.image('sparkle', sparkleImg);
        this.load.image('radial_glow', radialGlowImg);
        this.load.image('btn_try_now', btnTryNowImg);
        this.load.image('progress_bg', progressBgImg);
        this.load.image('progress_fill', progressFillImg);
        this.load.image('gun_nozzle', gunNozzleImg);
        this.load.image('hand', handImg);

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
        this.progress = 0;
        this.cleanedPointsCount = 0;
        this.lastWashSoundTime = 0;
        this.lastCanvasX = null;
        this.lastCanvasY = null;

        // Sound instances
        this.spraySound = this.sound.add('spray', { loop: true, volume: 0.6 });
        this.mudWashSound = this.sound.add('mud_wash', { volume: 0.7 });
        this.sparkleSound = this.sound.add('sparkle', { volume: 0.8 });
        this.winSound = this.sound.add('win', { volume: 0.9 });
        this.clickSound = this.sound.add('click', { volume: 0.8 });

        // 1. Background — cover full canvas
        const { width, height } = this.scale;
        this.bg = this.add.image(width / 2, height / 2, 'bg_stadium');
        this.bg.setDepth(-1);
        const bgScaleX = width / this.bg.width;
        const bgScaleY = height / this.bg.height;
        this.bg.setScale(Math.max(bgScaleX, bgScaleY));

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

        // 7. Input listeners
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
        this.bg.setPosition(width / 2, height / 2);
        const scaleX = width / this.bg.width;
        const scaleY = height / this.bg.height;
        const maxScale = Math.max(scaleX, scaleY);
        this.bg.setScale(maxScale);
    }

    setupTrophy() {
        const { width, height } = this.scale;
        this.trophyX = width / 2;
        this.trophyY = height * 0.48;

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
        // Water beam graphic (Depth 15)
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(15);

        // Water droplet particle manager (Depth 16)
        this.waterEmitter = this.add.particles(0, 0, 'water_drops', {
            speed: { min: 90, max: 240 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.12, end: 0 },
            alpha: { start: 0.85, end: 0 },
            lifespan: 350,
            blendMode: 'ADD',
            emitting: false
        });
        this.waterEmitter.setDepth(16);

        // Mud splatter particles (Depth 16)
        this.mudEmitter = this.add.particles(0, 0, 'mud_splatter', {
            speed: { min: 70, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.15, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 420,
            tint: [0x5c3317, 0x4a2810, 0x784420],
            emitting: false
        });
        this.mudEmitter.setDepth(16);

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
        this.gunContainer = this.add.container(width * 0.82, height * 0.85);
        this.gunContainer.setDepth(25);

        this.gunNozzle = this.add.image(0, 0, 'gun_nozzle');
        this.gunNozzle.setOrigin(0.5, 0.95);
        this.gunNozzle.setScale(0.85);

        this.gunContainer.add(this.gunNozzle);
        this.gunTipOffset = 360 * 0.85;
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
        this.progressBarFill.setDisplaySize(1, 36);
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

    setupTutorial() {
        const { width, height } = this.scale;
        this.tutorialContainer = this.add.container(width / 2, this.trophyY);
        this.tutorialContainer.setDepth(28);

        this.tutorialHand = this.add.image(0, 0, 'hand');
        this.tutorialHand.setScale(0.85);
        this.tutorialContainer.add(this.tutorialHand);

        this.tutorialTween = this.tweens.add({
            targets: this.tutorialHand,
            x: { from: 20, to: 90 },
            y: { from: -80, to: 0 },
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

    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameEnd) {
                //this.ShowStore();
                return;
            }
            this.hideTutorial();
            if (this.tutorialTimer) this.tutorialTimer.remove();

            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }

            this.isSpraying = true;
            if (!this.spraySound.isPlaying) {
                this.spraySound.play();
            }

            this.lastCanvasX = null;
            this.lastCanvasY = null;
            this.lastU = null;
            this.lastV = null;
            this.handleSpray(pointer.x, pointer.y);
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isSpraying && !this.isGameEnd) {
                this.handleSpray(pointer.x, pointer.y);
            }
        });

        this.input.on('pointerup', () => {
            this.isSpraying = false;
            this.lastCanvasX = null;
            this.lastCanvasY = null;
            this.lastU = null;
            this.lastV = null;

            if (this.spraySound.isPlaying) {
                this.spraySound.stop();
            }
            this.waterGraphics.clear();
            this.waterEmitter.stop();
            this.mudEmitter.stop();

            if (!this.isGameEnd) {
                this.tutorialTimer = this.time.delayedCall(2500, () => {
                    this.showTutorial();
                });
            }
        });
    }

    handleSpray(targetX, targetY) {
        if (this.isGameEnd) return;

        // Position gun below-right and aim towards target
        const gunBaseX = Math.min(this.gameWidth * 0.94, targetX + 110);
        const gunBaseY = Math.max(this.gameHeight * 0.78, targetY + 180);

        this.gunContainer.setPosition(gunBaseX, gunBaseY);

        const angle = Phaser.Math.Angle.Between(gunBaseX, gunBaseY, targetX, targetY);
        this.gunContainer.setRotation(angle + Math.PI / 2);

        // Gun tip coordinates
        const tipX = gunBaseX + Math.cos(angle) * this.gunTipOffset;
        const tipY = gunBaseY + Math.sin(angle) * this.gunTipOffset;

        // Draw high pressure water jet stream
        this.waterGraphics.clear();

        // Outer translucent water stream
        this.waterGraphics.lineStyle(16, 0x7fe3ff, 0.5);
        this.waterGraphics.lineBetween(tipX, tipY, targetX, targetY);

        // Inner intense white stream
        this.waterGraphics.lineStyle(7, 0xffffff, 0.95);
        this.waterGraphics.lineBetween(tipX, tipY, targetX, targetY);

        // Emit water particles at impact point
        this.waterEmitter.setPosition(targetX, targetY);
        if (!this.waterEmitter.emitting) this.waterEmitter.start();

        // Calculate position relative to trophy
        const trophyLeft = this.trophyX - this.trophyDisplayW / 2;
        const trophyTop = this.trophyY - this.trophyDisplayH / 2;

        const curCanvasX = ((targetX - trophyLeft) / this.trophyDisplayW) * this.dirtyCanvasW;
        const curCanvasY = ((targetY - trophyTop) / this.trophyDisplayH) * this.dirtyCanvasH;

        const curU = (targetX - trophyLeft) / this.trophyDisplayW;
        const curV = (targetY - trophyTop) / this.trophyDisplayH;

        const eraseCanvasRadius = 42 * (this.dirtyCanvasW / this.trophyDisplayW);

        // Check if pointer is in or near trophy bounds
        if (targetX >= trophyLeft - 30 && targetX <= trophyLeft + this.trophyDisplayW + 30 &&
            targetY >= trophyTop - 30 && targetY <= trophyTop + this.trophyDisplayH + 30) {
            
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
            this.mudEmitter.setPosition(targetX, targetY);
            if (!this.mudEmitter.emitting) this.mudEmitter.start();

            // ASMR mud wash squish sound
            const now = this.time.now;
            if (now - this.lastWashSoundTime > 150) {
                this.lastWashSoundTime = now;
                this.mudWashSound.play({ rate: Phaser.Math.FloatBetween(0.9, 1.2) });
            }

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
        if (this.spraySound.isPlaying) this.spraySound.stop();
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

        // Trophy celebratory bounce & pulse
        this.tweens.add({
            targets: this.trophyClean,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 550,
            yoyo: true,
            repeat: 2,
            ease: 'Back.easeOut'
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
        bigBtn.setScale(1.25);
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

        this.tweens.add({
            targets: endcard,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 500,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: bigBtn,
            scaleX: 1.35,
            scaleY: 1.35,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // this.input.on('pointerdown', () => {
        //     this.ShowStore();
        // });
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.gameWidth = width;
        this.gameHeight = height;

        this.resizeBackground();
        this.trophyX = width / 2;
        this.trophyY = height * 0.48;

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