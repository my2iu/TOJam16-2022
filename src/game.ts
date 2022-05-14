import 'phaser';
import * as tiled from './tiled';

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
        // The default tiled loader doesn't handle collision data on
        // image collections properly, so we'll just load manually
        this.load.json('map', 'assets/map.tmj');
        this.load.image('background.png', 'assets/background.png');
    }

    private buildFromTiledMap(key: string)
    {
        const json = this.cache.json.get(key);
        
        // Get reference to image collection tilesets
        const backgroundImagesTiles = json['tilesets'][0];
        const backgroundTiles : tiled.ObjectTile[] = tiled.loadTiledTileset(backgroundImagesTiles);

        // Read object layer
        const backgroundLayer = json['layers'][0];
        (backgroundLayer.objects as any[]).forEach((objJson) => {
            // Create an image for each background object
            let gid = objJson.gid as number;
            let x = objJson.x as number;
            let y = objJson.y as number;
            let h = objJson.height as number;
            let w = objJson.width as number;
            let tile = backgroundTiles[gid];
            this.add.image(x + w / 2, y - h / 2, tile.image);

            // Create a collision object too
            if (tile.collision) {
                tile.collision.forEach((collisionPoly) => {
                    let body = this.matter.add.fromVertices(
                        // x + w / 2, y - h / 2,
                        0, 
                        0,  
                        collisionPoly.path,
                        {
                            isStatic: true
                        });
                    // We need to know the center of mass in order to
                    // adjust its position on-screen
                    this.matter.body.setPosition(body, 
                        {
                            x: body.centerOffset.x + x, 
                            y: body.centerOffset.y + y - h
                        });
                });
            }
        });



    }

    create ()
    {
        // Configure general physics parameters
        this.matter.world.setGravity(0, 1, 0.0005);
        this.matter.world.engine.positionIterations = 20;
        this.matter.world.engine.velocityIterations = 20;

        // Load up the map
        this.buildFromTiledMap('map');

        // Load in map data
        // const map = this.make.tilemap({ key: 'map' });
        // const backgroundImages = map.getTileset('BackgroundImages');
        // map.getObjectLayer('Background').ob
        // const backgroundObjects = map.createFromObjects('Background', {
        //     name: 'Start'
        // });
        // backgroundObjects.forEach( obj => {
        //     (obj as Phaser.GameObjects.Sprite).texture
        // });
        // const backgroundLayer = map.createLayer('Background', backgroundImages, 0, 0);


        // Show some random things on the screen
        var text = this.add.text(0, 0, 'In Game', {fontSize: '30px', color: 'black', fontFamily: 'sans-serif'});

        this.ball = this.matter.add.circle(50, 50, 10, {
            friction: 0.01,
            frictionStatic: 0
        });

        // this.scenery = this.matter.add.fromVertices(250, 700,  
        //    '20 700 300 750 450 700 300 760',
        //     {
        //         isStatic: true
        //     });
    }

    update(time: number, delta: number): void {
    }
}