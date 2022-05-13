import 'phaser'

export class GameScene extends Phaser.Scene
{
    scenery: MatterJS.BodyType | undefined;
    ball: MatterJS.BodyType | undefined;

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

        this.ball = this.matter.add.circle(50, 50, 10, {
            friction: 0.01,
            frictionStatic: 0
        });

        this.matter.world.setGravity(0, 1, 0.0005);
        this.matter.world.engine.positionIterations = 20;
        this.matter.world.engine.velocityIterations = 20;
        this.scenery = this.matter.add.fromVertices(250, 700,  
           '20 700 300 750 450 700 300 760',
            {
                isStatic: true
            });
    }

    update(time: number, delta: number): void {
    }
}