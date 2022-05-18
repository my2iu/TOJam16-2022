import 'phaser';
import { GameScene, GameTiledLoader } from './game';

const DEBUG = false;

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
            this.scene.start('GameSceneLoader');
        });
        // var text = this.add.text(0, 0, 'Start', { fontSize: '30px', color: 'black', fontFamily: 'sans-serif' });
        // text.setInteractive();
        // text.on('pointerdown', () => {
        //     this.scene.start('GameScene');
        // });

    }
}

export class GameOverOverlayScene extends Phaser.Scene {
    isWin = false;

    constructor() {
        super({ key: 'gameover' });
    }

    init(data: any) {
        this.isWin = data.isWin;
    }

    preload() {
    }

    create() {
        let text = this.add.text(0, 0, this.isWin ? "You Win!" : 'Game Over',
            {
                fontSize: '60px',
                color: 'red',
                fontFamily: 'sans-serif',
                fontStyle: 'bold',
                align: 'center',
                shadow: {
                    blur: 8, color: 'rgba(255, 255, 255, 1)',
                    fill: true
                }
            }).setScrollFactor(0);
        text.setPosition(this.game.scale.width / 2 - text.width / 2, this.game.scale.height / 2 - text.height / 2);

        // text.setInteractive();
        // text.on('pointerdown', () => {
        //     this.scene.start('GameScene');
        // });

        this.time.delayedCall(500, () => {
            let text = this.add.text(0, 0, 'Tap to exit',
                {
                    fontSize: '20px',
                    color: 'darkred',
                    fontFamily: 'sans-serif',
                    align: 'center',
                    shadow: {
                        blur: 8, color: 'rgba(255, 255, 255, 1)',
                        fill: true
                    }
                }).setScrollFactor(0);
            text.setPosition(this.game.scale.width / 2 - text.width / 2, this.game.scale.height / 2 - text.height / 2 + 75);
            text.setAlpha(0);
            this.tweens.add({
                targets: text,
                duration: 200,
                repeat: 0,
                alpha: 1
            });


            this.input.once('pointerup', () => {
                this.scene.stop();
                this.scene.stop('GameScene')
                this.scene.start('title')
            });
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
    scene: [TitleScene, GameTiledLoader, GameScene, GameOverOverlayScene]
};

const game = new Phaser.Game(config);