import Phaser from 'phaser';

import bgImg from './assets/Texture/bg_stadium.webp';
import sinkDirtyImg from './assets/Texture/sink_dirty.webp';
import sinkCleanImg from './assets/Texture/sink_clean.webp';
import waterImg from './assets/Texture/water.webp';
import plungerImg from './assets/Texture/boncau.webp';
import plungerPressedImg from './assets/Texture/boncau_1.webp';
import trash1Img from './assets/Texture/trash1.webp';
import trash2Img from './assets/Texture/trash2.webp';
import trash3Img from './assets/Texture/trash3.webp';
import trash4Img from './assets/Texture/trash4.webp';
import clothImg from './assets/Texture/sweat_cloth.webp';
import handImg from './assets/Texture/hand.webp';
import btnTryNowImg from './assets/Texture/btn_try_now.webp';
import clickSnd from './assets/Sound/click.mp3';
import winSnd from './assets/Sound/win.mp3';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('bg_stadium', bgImg);
        this.load.image('sink_dirty', sinkDirtyImg);
        this.load.image('sink_clean', sinkCleanImg);
        this.load.image('water', waterImg);
        this.load.image('boncau', plungerImg);
        this.load.image('boncau_1', plungerPressedImg);
        this.load.image('trash1', trash1Img);
        this.load.image('trash2', trash2Img);
        this.load.image('trash3', trash3Img);
        this.load.image('trash4', trash4Img);
        this.load.image('sweat_cloth', clothImg);
        this.load.image('hand', handImg);
        this.load.image('btn_try_now', btnTryNowImg);
        this.load.audio('click', clickSnd);
        this.load.audio('win', winSnd);
    }

    create() {
        this.gameWidth = 450;
        this.gameHeight = 800;
        this.state = 'plunger';
        this.isGameEnd = false;
        this.remainingTrash = 4;
        this.trashItems = [];
        this.clickSound = this.sound.add('click', { volume: 0.8 });
        this.winSound = this.sound.add('win', { volume: 0.9 });

        const actualWidth = this.scale.width;
        const actualHeight = this.scale.height;
        const dx = (actualWidth - this.gameWidth ) / 2;
        const dy = (actualHeight - this.gameHeight) / 2;
        this.cameras.main.setScroll(-dx, -dy);
        this.cameras.main.setZoom(1 / 1.4);
        this.background = this.add.image(this.gameWidth / 2, this.gameHeight / 2, 'bg_stadium').setDepth(-5);
        this.resizeBackground();

        this.setupSink();
        this.setupTrash();
        this.setupPlunger();
        this.tweens.add({
            targets: this.plunger,
            x: this.sinkX,
            y: this.sinkY + 255,
            duration: 700,
            delay: 180,
            ease: 'Sine.easeOut'
        });
        this.scale.on('resize', this.handleResize, this);

        if (typeof window.gameReady === 'function') window.gameReady();
    }

    setupSink() {
        this.sinkX = this.gameWidth / 2;
        this.sinkY = this.gameHeight * 0.5 - 50;
        this.sinkWidth = Math.min(this.gameWidth * 0.9, 410);
        this.sinkHeight = this.sinkWidth * (1536 / 1152);

        this.sinkClean = this.add.image(this.sinkX, this.sinkY, 'sink_clean')
            .setDisplaySize(this.sinkWidth, this.sinkHeight).setAlpha(1).setDepth(1);
        const dirtySource = this.textures.get('sink_dirty').getSourceImage();
        this.dirtyCanvas = this.textures.createCanvas('sink_dirty_canvas', dirtySource.width, dirtySource.height);
        this.dirtyCanvas.context.drawImage(dirtySource, 0, 0);
        this.dirtyCanvas.refresh();
        this.sinkDirty = this.add.image(this.sinkX, this.sinkY, 'sink_dirty_canvas')
            .setDisplaySize(this.sinkWidth, this.sinkHeight).setDepth(3);
        this.water = this.add.image(this.sinkX, this.sinkY + 30, 'water')
            .setDisplaySize(this.sinkWidth * 0.78, this.sinkWidth * 0.78)
            .setDepth(10).setAlpha(1);
    }

    setupPlunger() {
        this.plunger = this.add.image(this.gameWidth + 500, this.sinkY + 150, 'boncau')
            .setDisplaySize(92, 175).setDepth(11)
            .setInteractive({ useHandCursor: true });
        this.plungerPressed = this.add.image(this.gameWidth + 100, this.sinkY + 150, 'boncau_1')
            .setDisplaySize(92, 175).setDepth(11).setVisible(false);
        this.plunger.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            if (this.state === 'plunger' && !this.isGameEnd) this.startDrainSequence();
        });
        this.addHintPulse(this.plunger);
    }

    setupTrash() {
        const trashLayout = [
            { texture: 'trash1', x: -105, y: 20, size: 66, rotation: -0.2 },
            { texture: 'trash2', x: 100, y: 30, size: 70, rotation: 0.16 },
            { texture: 'trash3', x: -85, y: 150, size: 72, rotation: -0.22 },
            { texture: 'trash4', x: 92, y: 155, size: 78, rotation: 0.2 }
        ];
        trashLayout.forEach((item) => {
            const trash = this.add.image(this.sinkX + item.x, this.sinkY + item.y, item.texture)
                .setDisplaySize(item.size, item.size).setRotation(item.rotation)
                .setDepth(5).setAlpha(1).setInteractive({ useHandCursor: true });
            trash.disableInteractive();
            trash.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                this.removeTrash(trash);
            });
            this.trashItems.push(trash);
        });
    }

    startDrainSequence() {
        this.state = 'draining';
        this.clickSound.play();
        this.removeHint(this.plunger);
        this.tweens.add({
            targets: this.plunger, x: this.sinkX, y: this.sinkY + 30,
            duration: 650, ease: 'Sine.easeInOut',
            onComplete: () => {
                this.plunger.setVisible(false);
                this.plungerPressed.setPosition(this.plunger.x, this.plunger.y).setVisible(true);
                this.time.addEvent({
                    delay: 170,
                    repeat: 7,
                    callback: () => {
                        const pressed = this.plungerPressed.visible;
                        this.plungerPressed.setVisible(!pressed);
                        this.plunger.setPosition(this.plungerPressed.x, this.plungerPressed.y).setVisible(pressed);
                    },
                    callbackScope: this
                });
                this.time.delayedCall(170 * 8, () => this.drainWater());
            }
        });
    }

    drainWater() {
        this.tweens.add({
            targets: this.water, scaleX: 0, scaleY: 0, alpha: 0,
            duration: 1100, ease: 'Sine.easeIn',
            onComplete: () => {
                this.tweens.add({
                    targets: [this.plunger, this.plungerPressed],
                    x: this.gameWidth + 120,
                    duration: 550,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        this.plunger.setVisible(false);
                        this.plungerPressed.setVisible(false);
                    }
                });
                this.state = 'trash';
                this.revealTrash();
            }
        });
    }

    revealTrash() {
        this.trashItems.forEach((trash, index) => {
            this.time.delayedCall(index * 90, () => {
                trash.setInteractive({ useHandCursor: true });
                this.addHintPulse(trash);
            });
        });
    }

    removeTrash(trash) {
        if (this.state !== 'trash' || !trash.active) return;
        this.clickSound.play();
        this.removeHint(trash);
        trash.disableInteractive();
        this.tweens.add({
            targets: trash, y: trash.y - 28, duration: 180, ease: 'Quad.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: trash, x: -90, y: trash.y - 18, alpha: 0,
                    duration: 500, ease: 'Sine.easeIn',
                    onComplete: () => {
                        trash.destroy();
                        this.remainingTrash -= 1;
                        if (this.remainingTrash === 0) this.revealCloth();
                    }
                });
            }
        });
    }

    revealCloth() {
        this.state = 'cloth';
        this.initCleaningProgress();
        const clothTargetX = this.sinkX;
        const clothTargetY = this.sinkY + 280;
        this.cloth = this.add.image(this.gameWidth + 140, clothTargetY, 'sweat_cloth')
            .setDisplaySize(115, 105).setDepth(7)
            .setInteractive({ useHandCursor: true });
        this.clothHintHand = this.add.image(this.gameWidth + 185, clothTargetY + 45, 'hand')
            .setDisplaySize(78, 78).setDepth(8).setVisible(false);
        this.cloth.disableInteractive();
        this.cloth.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.hideClothHintHand();
            this.isDraggingCloth = true;
            this.cleanAt(pointer.worldX, pointer.worldY);
        });
        this.input.on('pointermove', this.handleClothMove, this);
        this.input.on('pointerup', this.stopClothDrag, this);
        this.tweens.add({
            targets: this.cloth,
            x: clothTargetX,
            duration: 650,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.cloth.setInteractive({ useHandCursor: true });
                this.addHintPulse(this.cloth);
                this.startClothHintHand(clothTargetX, clothTargetY);
            }
        });
    }

    startClothHintHand(clothX, clothY) {
        if (!this.clothHintHand || this.isGameEnd) return;
        this.clothHintHand.setPosition(clothX + 45, clothY + 45).setVisible(true);
        this.clothHintHand.setAlpha(1);
        this.clothHintTween = this.tweens.add({
            targets: this.clothHintHand,
            x: this.sinkX + 30,
            y: this.sinkY + 70,
            duration: 1200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            hold: 250,
            repeatDelay: 250
        });
    }

    hideClothHintHand() {
        if (this.clothHintTween) {
            this.clothHintTween.stop();
            this.clothHintTween = null;
        }
        if (this.clothHintHand) {
            this.clothHintHand.setVisible(false);
            this.clothHintHand.disableInteractive();
        }
    }

    handleClothMove(pointer) {
        if (!this.isDraggingCloth || this.state !== 'cloth' || this.isGameEnd) return;
        this.cleanAt(pointer.worldX, pointer.worldY);
    }

    stopClothDrag() {
        this.isDraggingCloth = false;
    }

    initCleaningProgress() {
        this.cleaningGrid = [];
        this.cleanedGridPoints = 0;
        this.cleaningGridColumns = 24;
        this.cleaningGridRows = 32;
        this.totalGridPoints = this.cleaningGridColumns * this.cleaningGridRows;

        for (let row = 0; row < this.cleaningGridRows; row++) {
            for (let column = 0; column < this.cleaningGridColumns; column++) {
                this.cleaningGrid.push({
                    x: ((column + 0.5) / this.cleaningGridColumns) * this.dirtyCanvas.width,
                    y: ((row + 0.5) / this.cleaningGridRows) * this.dirtyCanvas.height,
                    cleaned: false
                });
            }
        }
    }

    updateCleaningProgress(canvasX, canvasY, radius) {
        const radiusSquared = radius * radius;
        for (const point of this.cleaningGrid) {
            if (point.cleaned) continue;
            const distanceX = point.x - canvasX;
            const distanceY = point.y - canvasY;
            if (distanceX * distanceX + distanceY * distanceY <= radiusSquared) {
                point.cleaned = true;
                this.cleanedGridPoints += 1;
            }
        }
    }

    cleanAt(x, y) {
        if (!this.cloth || this.state !== 'cloth') return;
        this.removeHint(this.cloth);
        this.cloth.setPosition(x, y);

        const left = this.sinkX - this.sinkWidth / 2;
        const top = this.sinkY - this.sinkHeight / 2;
        const canvasX = ((x - left) / this.sinkWidth) * this.dirtyCanvas.width;
        const canvasY = ((y - top) / this.sinkHeight) * this.dirtyCanvas.height;
        const radius = this.dirtyCanvas.width * 0.11;
        const context = this.dirtyCanvas.context;
        context.save();
        context.globalCompositeOperation = 'destination-out';
        context.beginPath();
        context.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
        this.dirtyCanvas.refresh();

        this.updateCleaningProgress(canvasX, canvasY, radius);
        const cleanedRatio = this.cleanedGridPoints / this.totalGridPoints;
        if (cleanedRatio >= 0.8) this.completeClothCleaning();
    }

    completeClothCleaning() {
        if (this.state !== 'cloth') return;
        this.state = 'cleaning';
        this.stopClothDrag();
        this.tweens.add({
            targets: this.sinkDirty, alpha: 0, duration: 500, ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: this.sinkClean, alpha: 1, duration: 700, ease: 'Sine.easeInOut',
            onComplete: () => this.finishGame()
        });
    }

    finishGame() {
        this.isGameEnd = true;
        this.state = 'complete';
        this.cloth.setVisible(false);
        this.winSound.play();
        this.ShowStore();
        if (typeof window.gameEnd === 'function') window.gameEnd();
        this.time.delayedCall(800, () => this.showEndcardOverlay());
    }

    addHintPulse(target) {
        target.clearTint();
        target.hintTween = null;
        target.setAlpha(1);
    }

    removeHint(target) {
        if (target.hintTween) target.hintTween.stop();
        target.clearTint();
        target.setAlpha(1);
    }

    showEndcardOverlay() {
        const endcard = this.add.container(this.gameWidth / 2, this.gameHeight * 0.84)
            .setDepth(30).setScale(0);
        const button = this.add.image(0, 0, 'btn_try_now').setScale(0.9)
            .setInteractive({ useHandCursor: true });
        const label = this.add.text(0, 0, 'PLAY NOW', {
            fontFamily: 'Arial, sans-serif', fontSize: '30px', fontStyle: 'bold',
            color: '#fff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        button.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.clickSound.play();
            this.ShowStore();
        });
        endcard.add([button, label]);
        this.tweens.add({ targets: endcard, scale: 1, duration: 450, ease: 'Back.easeOut' });
    }

    resizeBackground() {
        const scale = Math.max(this.gameWidth / this.background.width,
            this.gameHeight / this.background.height) * 1.8;
        this.background.setScale(scale);
    }

    handleResize(gameSize) {
        this.gameWidth = gameSize.width;
        this.gameHeight = gameSize.height;
        this.sinkX = this.gameWidth / 2;
        this.sinkY = this.gameHeight * 0.5 - 50;
        this.resizeBackground();
        if (this.sinkDirty) {
            this.sinkDirty.setPosition(this.sinkX, this.sinkY);
            this.sinkClean.setPosition(this.sinkX, this.sinkY);
            this.water.setPosition(this.sinkX, this.sinkY + 30);
        }
    }

    ShowStore() {
        const storeUrl = 'https://play.google.com/store/apps/details?id=com.d28.makeover.asmr.home.cleaning.game';
        if (typeof window.install === 'function') return window.install();
        if (typeof ExitApi !== 'undefined' && typeof ExitApi.exit === 'function') return ExitApi.exit();
        if (typeof mraid !== 'undefined' && typeof mraid.open === 'function') return mraid.open(storeUrl);
        if (typeof window.openAppStore === 'function') return window.openAppStore();
        window.open(storeUrl, '_blank');
    }
}
