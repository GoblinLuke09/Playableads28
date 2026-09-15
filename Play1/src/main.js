import Phaser from 'phaser';
import { GameScene } from './GameScene.js';

window.Phaser = Phaser;

const baseWidth = 450;
const baseHeight = 800;
const windowRatio = window.innerWidth / window.innerHeight;
const baseRatio = baseWidth / baseHeight;

let gameWidth = baseWidth;
let gameHeight = baseHeight;

if (windowRatio > baseRatio) {
    // Screen is wider (e.g. iPad, landscape) -> keep height, expand width
    gameWidth = baseHeight * windowRatio;
} else {
    // Screen is taller (e.g. most mobile devices) -> keep width, expand height
    gameHeight = baseWidth / windowRatio;
}

const config = {
    type: Phaser.AUTO,
    width: gameWidth,
    height: gameHeight,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT, // Scale canvas to fit device screen
        autoCenter: Phaser.Scale.CENTER_BOTH // Center canvas on screen
    },
    backgroundColor: '#1a1a1a',
    scene: [GameScene]
};

const game = new Phaser.Game(config);

// Resize listener
window.addEventListener('resize', () => {
    if (game && game.scale) {
        game.scale.resize(window.innerWidth, window.innerHeight);
    }
});

// Expose global methods for Playturbo / Mintegral / Ad networks
window.gameStart = function() {
    console.log("Playturbo: gameStart triggered");
    if (game && game.sound && game.sound.context && game.sound.context.state === 'suspended') {
        game.sound.context.resume();
    }
};

window.gameClose = function() {
    console.log("Playturbo: gameClose triggered");
};

