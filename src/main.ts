import 'phaser';
import { GameScene } from './game';

const DEBUG = true;

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('title');
    }

    preload() {
        this.load.image('title', 'assets/images/title.png');
    }

    create() {
        let screen = this.add.image(240, 400, 'title', 0);
        screen.setInteractive();
        screen.on('pointerup', () => {
            this.scene.start('GameScene');
        });
        // var text = this.add.text(0, 0, 'Start', { fontSize: '30px', color: 'black', fontFamily: 'sans-serif' });
        // text.setInteractive();
        // text.on('pointerdown', () => {
        //     this.scene.start('GameScene');
        // });

    }
}

export class GameOverOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'gameover' });
    }

    preload() {
    }

    create() {
        var text = this.add.text(0, 0, 'Game Over',
            {
                fontSize: '30px',
                color: 'red',
                fontFamily: 'sans-serif',
                fontStyle: 'bold',
                align: 'center',
                shadow: {
                    blur: 5, color: 'rgba(128, 128, 128, 0.5)',
                    fill: true
                }
            }).setScrollFactor(0);
        text.setPosition(this.game.scale.width / 2 - text.width / 2, this.game.scale.height / 2 - text.height / 2);

        text.setInteractive();
        text.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#fff',
    scale: {
        mode: Phaser.Scale.FIT,
        width: 480,
        height: 800
    },
    physics: {
        default: 'matter',
        matter: {
            debug: DEBUG ? {
                showAxes: true,
                showAngleIndicator: true,
                showCollisions: true
            } : false,
            //enableSleeping: true
        }
    },
    scene: [TitleScene, GameScene, GameOverOverlayScene]
};

const game = new Phaser.Game(config);