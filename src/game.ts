import 'phaser';

export default class Demo extends Phaser.Scene
{
    constructor ()
    {
        super('demo');
    }

    preload ()
    {
    }

    create ()
    {
        var text = this.add.text(0, 0, 'Hello World', {fontSize: '30px', color: 'black', fontFamily: 'sans-serif'});
    }
}

const config : Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#125555',
    scale: {
        mode: Phaser.Scale.FIT,
        width: 600,
        height: 800
    },
    
    scene: Demo
};

const game = new Phaser.Game(config);