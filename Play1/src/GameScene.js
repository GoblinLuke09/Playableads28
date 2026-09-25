import Phaser from 'phaser';

// Import all textures
import bgImg from './assets/Texture/bg_stadium.webp';
import trophyCleanImg from './assets/Texture/trophy_clean.webp';
import trophyWetImg from './assets/Texture/trophy_wet.webp';
import trophyDirtyImg from './assets/Texture/trophy_dirty.webp';
import trophySoapImg from './assets/Texture/trophy_soap.webp';
import trophyRubsoapImg from './assets/Texture/trophy_rubsoap.webp';
import trophyShadowImg from './assets/Texture/shadow.webp';
import sparkleImg from './assets/Texture/sparkle.webp';
import radialGlowImg from './assets/Texture/radial_glow.webp';
import btnTryNowImg from './assets/Texture/btn_try_now.webp';
import progressBgImg from './assets/Texture/progress_bg.webp';
import progressFillImg from './assets/Texture/progress_fill.webp';
import gunNozzleImg from './assets/Texture/gun_nozzle.webp';
import gunNozzle1Img from './assets/Texture/gun_nozzle1.webp';
import rubsoapImg from './assets/Texture/rubsoap.webp';
import sweatClothImg from './assets/Texture/sweat_cloth.webp';
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

const STEPS = [
    {
        id: 1,
        toolKey: 'gun_nozzle',
        toolType: 'gun',
        currentTexture: 'trophy_dirty',
        nextTexture: 'trophy_soap',
        prompt: 'FOAM',
        cleanRadius: 48,
        streamOffsetY: 0,
        hasPipe: false
    },
    {
        id: 2,
        toolKey: 'rubsoap',
        toolType: 'rub',
        currentTexture: 'trophy_soap',
        nextTexture: 'trophy_rubsoap',
        prompt: 'RUB & SCRUB',
        cleanRadius: 52,
        streamOffsetY: 0,
        hasPipe: false
    },
    {
        id: 3,
        toolKey: 'gun_nozzle1',
        toolType: 'gun',
        currentTexture: 'trophy_rubsoap',
        nextTexture: 'trophy_wet',
        prompt: 'RINSE WITH WATER',
        cleanRadius: 55,
        streamOffsetY: 50,
        hasPipe: true
    },
    {
        id: 4,
        toolKey: 'sweat_cloth',
        toolType: 'cloth',
        currentTexture: 'trophy_wet',
        nextTexture: 'trophy_clean',
        prompt: 'DRY & POLISH',
        cleanRadius: 52,
        streamOffsetY: 0,
        hasPipe: false
    }
];

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
        this.load.image('trophy_soap', trophySoapImg);
        this.load.image('trophy_rubsoap', trophyRubsoapImg);
        this.load.image('trophy_shadow', trophyShadowImg);
        this.load.image('sparkle', sparkleImg);
        this.load.image('radial_glow', radialGlowImg);
        this.load.image('btn_try_now', btnTryNowImg);
        this.load.image('progress_bg', progressBgImg);
        this.load.image('progress_fill', progressFillImg);
        this.load.image('gun_nozzle', gunNozzleImg);
        this.load.image('gun_nozzle1', gunNozzle1Img);
        this.load.image('rubsoap', rubsoapImg);
        this.load.image('sweat_cloth', sweatClothImg);
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

        // Confetti texture
        let cGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        cGraphics.fillStyle(0xffffff, 1);
        cGraphics.fillRect(0, 0, 10, 6);
        cGraphics.generateTexture('confetti', 10, 6);
    }

    create() {
        this.gameWidth = 450;
        this.gameHeight = 800;
        this.isGameEnd = false;
        this.isCleaning = false;
        this.hasStartedInteracting = false;
        this.isAudioPlaying = false;
        this.canClean = false;
        this.currentStepIndex = 0;
        this.progress = 0;
        this.cleanedPointsCount = 0;
        this.lastCanvasX = null;
        this.lastCanvasY = null;
        this.lastU = null;
        this.lastV = null;

        // Particle timing throttles
        this.lastRubBubbleTime = 0;
        this.lastSprayBubbleTime = 0;
        this.lastWaterSplashTime = 0;
        this.lastClothSparkleTime = 0;

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

        // High-pressure water procedural audio
        this.createProceduralWaterSound();

        const actualWidth = this.scale.width;
        const actualHeight = this.scale.height;
        const dx = (actualWidth - this.gameWidth) / 2;
        const dy = (actualHeight - this.gameHeight) / 2;
        this.cameras.main.setScroll(-dx, -dy);

        // Background
        this.bg = this.add.image(this.gameWidth / 2 - 10, this.baseBgY - 150, 'bg_stadium');
        this.bg.setDepth(-1);
        const bgScaleX = this.gameWidth / this.bg.width;
        const bgScaleY = this.gameHeight / this.bg.height;
        this.bg.setScale(Math.max(bgScaleX, bgScaleY) * 2.45);

        // Initial camera zoom
        this.cameraZoomTween = null;
        this.cameras.main.setZoom(1 / 1.4);

        // Trophy Setup
        this.setupTrophy();

        // Effects & Particles
        this.setupEffects();

        // Tools Setup (Gun, Rubsoap, SweatCloth)
        this.setupTools();

        // UI Setup
        this.setupUI();

        // Tutorial Hand
        this.setupTutorial();

        // Cameras
        this.setupCameras();

        // Input
        this.setupInput();

        // Resize handler
        this.scale.on('resize', this.handleResize, this);

        // Notify Playturbo
        if (typeof window.gameReady === 'function') {
            window.gameReady();
        }

        // Start Step 1 automatically
        this.startStep(0);
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
        const scale = targetTrophyHeight / 1000;
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

        // Base Trophy underneath (Depth 5) - starts with trophy_dirty so NO foam leaks!
        this.trophyBase = this.add.image(this.trophyX, this.trophyY, 'trophy_dirty');
        this.trophyBase.setDepth(5);
        this.trophyBase.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);

        // Dynamic Canvas Texture on top (Depth 10) - starts completely transparent
        const dirtySource = this.textures.get('trophy_dirty').getSourceImage();
        this.dirtyCanvasW = 1040;
        this.dirtyCanvasH = 1000;

        if (this.textures.exists('mud_canvas_tex')) {
            this.textures.remove('mud_canvas_tex');
        }

        this.mudCanvas = this.textures.createCanvas('mud_canvas_tex', this.dirtyCanvasW, this.dirtyCanvasH);
        this.mudCtx = this.mudCanvas.context;
        this.mudCtx.clearRect(0, 0, this.dirtyCanvasW, this.dirtyCanvasH);
        this.mudCanvas.refresh();

        this.trophyMud = this.add.image(this.trophyX, this.trophyY, 'mud_canvas_tex');
        this.trophyMud.setDepth(10);
        this.trophyMud.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);

        this.dirtyHintTween = null;
        this.hintTimer = null;

        this.initProgressGrid();
    }

    initProgressGrid() {
        this.samplePoints = [];
        const cols = 32;
        const rows = 32;

        try {
            // Sample actual non-transparent pixels from the source texture for 100% precision
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cols;
            tempCanvas.height = rows;
            const ctx = tempCanvas.getContext('2d');
            const dirtySource = this.textures.get('trophy_dirty').getSourceImage();
            ctx.drawImage(dirtySource, 0, 0, cols, rows);
            const imgData = ctx.getImageData(0, 0, cols, rows).data;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = (r * cols + c) * 4;
                    const alpha = imgData[idx + 3];
                    if (alpha > 40) {
                        const u = (c + 0.5) / cols;
                        const v = (r + 0.5) / rows;
                        this.samplePoints.push({ u, v, cleaned: false });
                    }
                }
            }
        } catch (e) {
            // Fallback grid if canvas sampling is unavailable
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const u = (c + 0.5) / cols;
                    const v = (r + 0.5) / rows;
                    const relX = (u - 0.5) * 2;
                    if (Math.abs(relX) <= 0.85 && v >= 0.05 && v <= 0.95) {
                        this.samplePoints.push({ u, v, cleaned: false });
                    }
                }
            }
        }

        this.totalPoints = this.samplePoints.length;
        this.cleanedPointsCount = 0;
    }

    setupEffects() {
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(14);

        // Water Stream for gun_nozzle
        this.waterStreamEmitter_nozzle = this.add.particles(0, 0, 'water', {
            speed: { min: 450, max: 700 },
            angle: { min: -95, max: -85 },
            scale: { start: 0.05, end: 0.1 },
            alpha: { start: 0.95, end: 0.15 },
            lifespan: { min: 220, max: 280 },
            tint: [0xffffff, 0xe0f7ff, 0xafe5ff, 0x78d4ff],
            frequency: 2,
            quantity: 5,
            emitting: false
        });
        this.waterStreamEmitter_nozzle.setDepth(16);

        // Water Stream for gun_nozzle1
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

        this.waterStreamEmitter = this.waterStreamEmitter_nozzle;

        // Water Impact drops (Fixed at origin, emits in world space)
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

        // Mist splash (Fixed at origin, emits in world space)
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

        // Soft glow at impact point
        this.sprayDomeGlow = this.add.image(0, 0, 'radial_glow');
        this.sprayDomeGlow.setDepth(13);
        this.sprayDomeGlow.setTint(0x88ddff);
        this.sprayDomeGlow.setAlpha(0.35);
        this.sprayDomeGlow.setScale(1.2);
        this.sprayDomeGlow.setBlendMode('ADD');
        this.sprayDomeGlow.setVisible(false);

        // Bubble Particles for spray tools (gun_nozzle & gun_nozzle1) - Fixed at origin, emits in world space
        this.bubbleEmitter = this.add.particles(0, 0, 'bubble', {
            speed: { min: 50, max: 140 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.25, end: 0.45 },
            alpha: { start: 0.95, end: 0 },
            lifespan: { min: 800, max: 1500 },
            gravityY: -35,
            emitting: false
        });
        this.bubbleEmitter.setDepth(19);

        // Bubble Particles for rubsoap - Fixed at origin, stays in place where rubbed and gently floats upwards
        this.rubBubbleEmitter = this.add.particles(0, 0, 'bubble', {
            speed: { min: 25, max: 65 },
            angle: { min: -120, max: -60 }, // Floats upwards in world space
            scale: { start: 0.25, end: 0.45 },
            alpha: { start: 0.85, end: 0 },
            lifespan: { min: 900, max: 1500 },
            gravityY: -50,
            emitting: false
        });
        this.rubBubbleEmitter.setDepth(19);

        // Sparkles (Fixed at origin, emits in world space)
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

    setupTools() {
        const width = this.gameWidth;
        const height = this.gameHeight;

        // 1. Water Gun Container (for gun_nozzle & gun_nozzle1)
        this.gunContainer = this.add.container(width * 0.5, height + 500);
        this.gunContainer.setDepth(25);

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

        // 2. Rub Soap Container (for rubsoap)
        this.rubContainer = this.add.container(width * 0.5, height + 500);
        this.rubContainer.setDepth(25);
        this.rubSoap = this.add.image(0, 0, 'rubsoap');
        this.rubSoap.setOrigin(0.5, 0.5);
        this.rubSoap.setScale(0.55);
        this.rubContainer.add(this.rubSoap);

        // 3. Sweat Cloth Container (for sweat_cloth)
        this.clothContainer = this.add.container(width * 0.5, height + 500);
        this.clothContainer.setDepth(25);
        this.sweatCloth = this.add.image(0, 0, 'sweat_cloth');
        this.sweatCloth.setOrigin(0.5, 0.5);
        this.sweatCloth.setScale(0.55);
        this.clothContainer.add(this.sweatCloth);

        this.toolContainers = {
            gun: this.gunContainer,
            rub: this.rubContainer,
            cloth: this.clothContainer
        };
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

        this.promptText = this.add.text(0, 35, STEPS[0].prompt, {
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

    startStep(stepIndex) {
        if (stepIndex >= STEPS.length) {
            this.triggerWin();
            return;
        }

        this.currentStepIndex = stepIndex;
        const step = STEPS[stepIndex];
        this.canClean = false;
        this.isCleaning = false;
        this.progress = 0;
        this.updateProgressBar();

        // 1. Base Trophy (Bottom) shows the current start texture
        this.trophyBase.setTexture(step.currentTexture);
        this.trophyBase.setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);

        // 2. Top Canvas starts completely empty/transparent (NO leaking borders!)
        this.mudCtx.clearRect(0, 0, this.dirtyCanvasW, this.dirtyCanvasH);
        this.mudCanvas.refresh();

        // 3. Prepare Pattern of the next texture to paint on top as player cleans
        let patternSource = this.textures.get(step.nextTexture).getSourceImage();
        // Guarantee source is exactly sized to the canvas (1040x1000) so no image is ever smaller or shifted!
        if (patternSource.width !== this.dirtyCanvasW || patternSource.height !== this.dirtyCanvasH) {
            if (!this.scaledPatternCanvas) {
                this.scaledPatternCanvas = document.createElement('canvas');
                this.scaledPatternCanvas.width = this.dirtyCanvasW;
                this.scaledPatternCanvas.height = this.dirtyCanvasH;
            }
            const pCtx = this.scaledPatternCanvas.getContext('2d');
            pCtx.clearRect(0, 0, this.dirtyCanvasW, this.dirtyCanvasH);
            pCtx.drawImage(patternSource, 0, 0, this.dirtyCanvasW, this.dirtyCanvasH);
            patternSource = this.scaledPatternCanvas;
        }

        this.currentNextSource = patternSource;
        this.currentPattern = this.mudCtx.createPattern(patternSource, 'no-repeat');

        this.trophyMud.setAlpha(1);
        this.stopDirtyHint();

        // Reset progress grid for this step
        if (this.samplePoints && this.samplePoints.length > 0) {
            for (let i = 0; i < this.samplePoints.length; i++) {
                this.samplePoints[i].cleaned = false;
            }
            this.cleanedPointsCount = 0;
        } else {
            this.initProgressGrid();
        }

        // 4. Setup Tool & Emitters according to step
        this.currentCleanRadius = step.cleanRadius;
        this.currentStreamOffsetY = step.streamOffsetY;

        if (step.toolKey === 'gun_nozzle1') {
            this.waterStreamEmitter = this.waterStreamEmitter_nozzle1;
            this.gunPipe.setVisible(true);
            this.gunNozzle.setTexture('gun_nozzle1');
        } else if (step.toolKey === 'gun_nozzle') {
            this.waterStreamEmitter = this.waterStreamEmitter_nozzle;
            this.gunPipe.setVisible(false);
            this.gunNozzle.setTexture('gun_nozzle');
        }

        // 5. UI Prompt Text
        this.promptText.setText(step.prompt);
        this.promptText.setColor('#ffea75');

        // 6. Position & Animate Active Tool Container
        const activeContainer = this.toolContainers[step.toolType];
        this.activeToolContainer = activeContainer;

        // Hide other tool containers
        Object.values(this.toolContainers).forEach(c => {
            if (c !== activeContainer) {
                c.setPosition(this.gameWidth * 0.5, this.gameHeight + 500);
            }
        });

        // Slide tool up into view
        const targetY = step.toolType === 'gun' ? this.gameHeight * 0.9 : this.gameHeight * 0.82;
        activeContainer.setPosition(this.gameWidth * 0.5, this.gameHeight + 450);
        activeContainer.setRotation(step.toolType === 'gun' ? Math.PI / 2 + Phaser.Math.DegToRad(-90) : 0);

        this.tweens.add({
            targets: activeContainer,
            y: targetY,
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

        const uiElements = [this.topUI];
        if (this.ctaBtn) uiElements.push(this.ctaBtn);
        this.cameras.main.ignore(uiElements);

        const worldElements = [
            this.bg,
            this.trophyBase,
            this.trophyMud,
            this.trophyGlow,
            this.trophyShadow,
            this.waterGraphics,
            this.waterStreamEmitter_nozzle,
            this.waterStreamEmitter_nozzle1,
            this.waterEmitter,
            this.waterMistEmitter,
            this.bubbleEmitter,
            this.rubBubbleEmitter,
            this.sparkleEmitter,
            this.gunContainer,
            this.rubContainer,
            this.clothContainer,
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
        if (!this.hasStartedInteracting || !this.canClean || this.isGameEnd) return;
        if (this.dirtyHintTween) {
            this.dirtyHintTween.stop();
        }
        this.dirtyHintTween = this.tweens.add({
            targets: this.trophyGlow,
            alpha: 0.35,
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
        if (this.trophyGlow && !this.isGameEnd) {
            this.trophyGlow.setAlpha(0);
        }
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
            this.stopDirtyHint();
            if (this.tutorialTimer) this.tutorialTimer.remove();
            if (this.hintTimer) this.hintTimer.remove();

            this.isCleaning = true;
            const currentStep = STEPS[this.currentStepIndex];

            if (currentStep.toolType === 'gun') {
                this.startSpraySound();
            }

            this.setCameraZoomSmooth(1 / 1.2, 700);

            this.lastCanvasX = null;
            this.lastCanvasY = null;
            this.lastU = null;
            this.lastV = null;
            this.handleCleaning(pointer.worldX, pointer.worldY);
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isCleaning && !this.isGameEnd && this.canClean) {
                this.handleCleaning(pointer.worldX, pointer.worldY);
            }
        });

        this.input.on('pointerup', () => {
            if (!this.canClean) return;
            this.isCleaning = false;
            this.stopSpraySound();
            this.lastCanvasX = null;
            this.lastCanvasY = null;
            this.lastU = null;
            this.lastV = null;

            if (!this.isGameEnd) {
                this.setCameraZoomSmooth(1 / 1.4, 700);
            }

            this.targetShiftX = 0;
            this.targetBgShiftX = 0;

            this.waterGraphics.clear();
            this.waterStreamEmitter.stop();
            if (this.sprayDomeGlow) this.sprayDomeGlow.setVisible(false);

            if (!this.isGameEnd && this.canClean) {
                this.tutorialTimer = this.time.delayedCall(2000, () => {
                    this.showTutorial();
                });
                this.hintTimer = this.time.delayedCall(800, () => {
                    this.startDirtyHint();
                });
            }
        });
    }

    handleCleaning(pointerX, pointerY) {
        if (this.isGameEnd || !this.canClean) return;

        const currentStep = STEPS[this.currentStepIndex];
        const stepType = currentStep.toolType;

        const centerX = this.gameWidth / 2;
        const diffX = pointerX - centerX;
        const deadZone = 35;
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

        let hitX = pointerX;
        let hitY = pointerY;
        const now = this.time.now;

        if (stepType === 'gun') {
            const gunBaseX = pointerX;
            const gunBaseY = pointerY + 100;
            this.gunContainer.setPosition(gunBaseX, gunBaseY);

            const offsetFromCenter = (gunBaseX - centerX) / (centerX * 1.1);
            const clampedOffset = Phaser.Math.Clamp(offsetFromCenter, -1, 1);
            const angleDeg = -90 + clampedOffset * 18;
            const angle = Phaser.Math.DegToRad(angleDeg);

            this.gunContainer.setRotation(angle + Math.PI / 2);

            const tipX = gunBaseX + Math.cos(angle) * this.gunTipOffset;
            const tipY = gunBaseY + Math.sin(angle) * this.gunTipOffset;

            const jetLength = 150;
            hitX = tipX + Math.cos(angle) * jetLength;
            hitY = tipY + Math.sin(angle) * jetLength;

            const angleDeg2 = Phaser.Math.RadToDeg(angle);

            // Water stream connects to nozzle tip
            this.waterStreamEmitter.setPosition(tipX, tipY + (this.currentStreamOffsetY || 0));
            this.waterStreamEmitter.setEmitterAngle({ min: angleDeg2 - 18, max: angleDeg2 + 18 });
            if (!this.waterStreamEmitter.emitting) this.waterStreamEmitter.start();

            // Water splash & mist emitted at world coordinates (never dragged with tool)
            if (now - this.lastWaterSplashTime > 50) {
                this.lastWaterSplashTime = now;
                this.waterEmitter.emitParticleAt(hitX, hitY, 1);
                this.waterMistEmitter.emitParticleAt(hitX, hitY, 1);
            }

            // Spray bubbles emitted at world coordinates (stays floating in place)
            if (currentStep.id === 1 || currentStep.id === 3) {
                if (now - this.lastSprayBubbleTime > 55) {
                    this.lastSprayBubbleTime = now;
                    const bx = hitX + Phaser.Math.Between(-20, 20);
                    const by = hitY + Phaser.Math.Between(-20, 20);
                    this.bubbleEmitter.emitParticleAt(bx, by, Phaser.Math.Between(1, 3));
                }
            }

            if (this.sprayDomeGlow) {
                this.sprayDomeGlow.setPosition(hitX, hitY);
                this.sprayDomeGlow.setVisible(true);
            }
        } else if (stepType === 'rub') {
            // rubsoap follows pointer
            hitX = pointerX;
            hitY = pointerY;
            this.rubContainer.setPosition(pointerX, pointerY);

            // Gentle wobble when rubbing
            const wobble = Math.sin(this.time.now * 0.015) * 0.15;
            this.rubContainer.setRotation(wobble);

            // Gentle occasional bubbles (spawns 1-2 bubbles at the exact rub location in world space, never follows tool)
            if (now - this.lastRubBubbleTime > 180) {
                this.lastRubBubbleTime = now;
                const bx = hitX + Phaser.Math.Between(-15, 15);
                const by = hitY + Phaser.Math.Between(-15, 15);
                this.rubBubbleEmitter.emitParticleAt(bx, by, Phaser.Math.Between(1, 2));
            }
        } else if (stepType === 'cloth') {
            // sweat_cloth follows pointer (Step 4 only - polish with sparkles at world position)
            hitX = pointerX;
            hitY = pointerY;
            this.clothContainer.setPosition(pointerX, pointerY);

            const tilt = Math.cos(this.time.now * 0.012) * 0.12;
            this.clothContainer.setRotation(tilt);

            if (now - this.lastClothSparkleTime > 75) {
                this.lastClothSparkleTime = now;
                const sx = hitX + Phaser.Math.Between(-20, 20);
                const sy = hitY + Phaser.Math.Between(-20, 20);
                this.sparkleEmitter.emitParticleAt(sx, sy, 1);
            }
        }

        // Calculate position relative to trophy
        const trophyLeft = this.trophyX - this.trophyDisplayW / 2;
        const trophyTop = this.trophyY - this.trophyDisplayH / 2;

        const curCanvasX = ((hitX - trophyLeft) / this.trophyDisplayW) * this.dirtyCanvasW;
        const curCanvasY = ((hitY - trophyTop) / this.trophyDisplayH) * this.dirtyCanvasH;

        const curU = (hitX - trophyLeft) / this.trophyDisplayW;
        const curV = (hitY - trophyTop) / this.trophyDisplayH;

        const cleanRadius = this.currentCleanRadius || 48;
        const eraseCanvasRadius = cleanRadius * (this.dirtyCanvasW / this.trophyDisplayW);

        // Check if impact is within trophy bounds
        if (hitX >= trophyLeft - 40 && hitX <= trophyLeft + this.trophyDisplayW + 40 &&
            hitY >= trophyTop - 40 && hitY <= trophyTop + this.trophyDisplayH + 40) {

            this.mudCtx.save();
            this.mudCtx.globalCompositeOperation = 'source-over';
            this.mudCtx.fillStyle = this.currentPattern;
            this.mudCtx.strokeStyle = this.currentPattern;
            this.mudCtx.lineWidth = eraseCanvasRadius * 2;
            this.mudCtx.lineCap = 'round';
            this.mudCtx.lineJoin = 'round';

            this.mudCtx.beginPath();
            if (this.lastCanvasX !== null && this.lastCanvasY !== null) {
                this.mudCtx.moveTo(this.lastCanvasX, this.lastCanvasY);
                this.mudCtx.lineTo(curCanvasX, curCanvasY);
                this.mudCtx.stroke();
            }

            this.mudCtx.beginPath();
            this.mudCtx.arc(curCanvasX, curCanvasY, eraseCanvasRadius, 0, Math.PI * 2);
            this.mudCtx.fill();
            this.mudCtx.restore();

            this.mudCanvas.refresh();

            this.checkProgressUV(curU, curV);
        }

        this.lastCanvasX = curCanvasX;
        this.lastCanvasY = curCanvasY;
        this.lastU = curU;
        this.lastV = curV;
    }

    checkProgressUV(targetU, targetV) {
        const cleanRadius = this.currentCleanRadius || 48;
        // Radius in UV space exactly matches the screen display dimensions
        const radiusU = cleanRadius / this.trophyDisplayW;
        const aspect = this.trophyDisplayH / this.trophyDisplayW;
        let newlyCleaned = 0;

        const checkPoint = (u, v) => {
            for (let i = 0; i < this.samplePoints.length; i++) {
                const pt = this.samplePoints[i];
                if (!pt.cleaned) {
                    const du = u - pt.u;
                    const dv = (v - pt.v) * aspect;
                    if (Math.hypot(du, dv) <= radiusU) {
                        pt.cleaned = true;
                        this.cleanedPointsCount++;
                        newlyCleaned++;
                    }
                }
            }
        };

        if (this.lastU !== null && this.lastV !== null) {
            const dist = Math.hypot(targetU - this.lastU, (targetV - this.lastV) * aspect);
            const steps = Math.max(1, Math.ceil(dist / (radiusU * 0.4)));
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

            // Sparkle bursts during cleaning ONLY on the final step (sweat_cloth)
            if (this.currentStepIndex === STEPS.length - 1) {
                if (this.progress % 15 === 0 || newlyCleaned > 4) {
                    const trophyLeft = this.trophyX - this.trophyDisplayW / 2;
                    const trophyTop = this.trophyY - this.trophyDisplayH / 2;
                    this.sparkleEmitter.emitParticleAt(trophyLeft + targetU * this.trophyDisplayW, trophyTop + targetV * this.trophyDisplayH, 4);
                }
            }

            // Threshold to complete current step (98%)
            if (this.progress >= 98 && !this.isGameEnd) {
                this.completeCurrentStep();
            }
        }
    }

    completeCurrentStep() {
        this.canClean = false;
        this.isCleaning = false;
        this.stopSpraySound();

        this.waterGraphics.clear();
        this.waterStreamEmitter.stop();
        if (this.sprayDomeGlow) this.sprayDomeGlow.setVisible(false);

        this.hideTutorial();
        this.stopDirtyHint();
        if (this.hintTimer) this.hintTimer.remove();

        this.progress = 100;
        this.updateProgressBar();

        // Play sound: sparkle sound only on the last step, click sound on previous steps
        if (this.currentStepIndex === STEPS.length - 1) {
            this.sparkleSound.play();
        } else {
            this.clickSound.play();
        }

        // Ensure 100% full reveal on canvas
        this.mudCtx.save();
        this.mudCtx.globalCompositeOperation = 'source-over';
        this.mudCtx.clearRect(0, 0, this.dirtyCanvasW, this.dirtyCanvasH);
        this.mudCtx.drawImage(this.currentNextSource, 0, 0, this.dirtyCanvasW, this.dirtyCanvasH);
        this.mudCtx.restore();
        this.mudCanvas.refresh();

        const currentStep = STEPS[this.currentStepIndex];
        const activeContainer = this.toolContainers[currentStep.toolType];

        // Retract current tool off screen
        this.tweens.add({
            targets: activeContainer,
            y: this.gameHeight + 450,
            duration: 450,
            ease: 'Back.easeIn'
        });

        // Flash completion prompt
        this.promptText.setText('✨ GREAT! ✨');
        this.promptText.setColor('#00ff7f');

        const nextStepIndex = this.currentStepIndex + 1;

        if (nextStepIndex < STEPS.length) {
            this.time.delayedCall(450, () => {
                this.startStep(nextStepIndex);
            });
        } else {
            this.triggerWin();
        }
    }

    updateProgressBar() {
        const fillW = this.progress / 100;
        this.setFillAmount(fillW);
        this.percentText.setText(`${this.progress}%`);
    }

    setFillAmount(amount) {
        amount = Phaser.Math.Clamp(amount, 0, 1);
        const sourceWidth = this.progressBarFill.width;
        const sourceHeight = this.progressBarFill.height;

        this.progressBarFill.setCrop(
            0,
            0,
            sourceWidth * amount,
            sourceHeight
        );
    }

    triggerWin() {
        if (this.isGameEnd) return;
        this.isGameEnd = true;
        this.canClean = false;
        this.isCleaning = false;
        this.targetShiftX = 0;
        this.targetBgShiftX = 0;
        this.stopSpraySound();

        this.waterGraphics.clear();
        this.waterStreamEmitter.stop();
        this.hideTutorial();
        this.stopDirtyHint();
        if (this.hintTimer) this.hintTimer.remove();

        this.progress = 100;
        this.updateProgressBar();

        // Final trophy is 100% clean
        this.trophyBase.setTexture('trophy_clean');
        this.mudCtx.clearRect(0, 0, this.dirtyCanvasW, this.dirtyCanvasH);
        this.mudCanvas.refresh();

        // Retract all tool containers
        Object.values(this.toolContainers).forEach(c => {
            this.tweens.add({
                targets: c,
                y: this.gameHeight + 2500,
                duration: 600,
                ease: 'Back.easeIn'
            });
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

        // Confetti burst
        this.createConfetti();

        // Sparkle burst around the trophy
        this.time.addEvent({
            delay: 160,
            repeat: 20,
            callback: () => {
                const rx = this.trophyX + Phaser.Math.Between(-this.trophyDisplayW * 0.4, this.trophyDisplayW * 0.4);
                const ry = this.trophyY + Phaser.Math.Between(-this.trophyDisplayH * 0.45, this.trophyDisplayH * 0.45);
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

        // Notify gameEnd
        if (typeof window.gameEnd === 'function') {
            window.gameEnd();
        }

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
    }

    update(time, delta) {
        const lerpFactor = 0.06;
        this.currentShiftX += (this.targetShiftX - this.currentShiftX) * lerpFactor;

        this.trophyX = this.baseTrophyX + this.currentShiftX;

        if (this.bg) {
            this.bg.x = this.baseBgX + this.currentShiftX;
        }

        if (this.trophyShadow) {
            this.trophyShadow.x = this.trophyX;
        }

        if (this.trophyBase) {
            this.trophyBase.x = this.trophyX;
            if (this.trophyMud) this.trophyMud.x = this.trophyX;
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
        const scale = targetTrophyHeight / 1000;
        this.trophyScale = scale;
        this.trophyDisplayW = 1040 * scale;
        this.trophyDisplayH = 1000 * scale;

        if (this.trophyBase) {
            this.trophyBase.setPosition(this.trophyX, this.trophyY).setDisplaySize(this.trophyDisplayW, this.trophyDisplayH);
            if (this.trophyShadow) {
                this.trophyShadow.setPosition(this.trophyX, this.trophyY + 145);
            }
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