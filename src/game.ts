import 'phaser'

export class GameScene extends Phaser.Scene
{
    constructor ()
    {
        super('GameScene');
    }

    preload ()
    {
    }

    create ()
    {
        var text = this.add.text(0, 0, 'In Game', {fontSize: '30px', color: 'black', fontFamily: 'sans-serif'});
    }
}