import 'phaser';
import {GameScene} from './game';

const DEBUG = true;

export default class TitleScene extends Phaser.Scene
{
    constructor ()
    {
        super('title');
    }

    preload ()
    {
    }

    create ()
    {
        var text = this.add.text(0, 0, 'Start', {fontSize: '30px', color: 'black', fontFamily: 'sans-serif'});
        text.setInteractive();
        text.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

    }
}

const config : Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#fff',
    scale: {
        mode: Phaser.Scale.FIT,
        width: 600,
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
    scene: [TitleScene, GameScene]
};

const game = new Phaser.Game(config);