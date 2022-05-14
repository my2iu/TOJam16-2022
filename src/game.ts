import 'phaser';
import * as tiled from './tiled';

export class GameScene extends Phaser.Scene
{
    scenery: MatterJS.BodyType | undefined;
    ball: MatterJS.BodyType | undefined;
    
    // For showing feedback on 
    forceCircle : Phaser.GameObjects.Arc | undefined;
    
    // Tracks information about user touches on screen
    pointerdown = false;
    pointerStartTime = 0;
    forceCircleStartStrokeWidth = 0;
    
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
        
        // Read background layer
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
                
                // Read the object layer
                const objectLayer = json['layers'][1];
                (objectLayer.objects as any[]).forEach((objJson) => {
                    if (objJson.point) {
                        if (objJson.name == 'StartPoint') {
                            this.ball = this.matter.add.circle(
                                objJson.x as number, objJson.y as number, 10, {
                                    friction: 0.01,
                                    frictionStatic: 0
                                });
                            }
                        }
                    });
                    
                }
                
                create ()
                {
                    // Configure general physics parameters
                    this.matter.world.setGravity(0, 1, 0.0005);
                    this.matter.world.engine.positionIterations = 20;
                    this.matter.world.engine.velocityIterations = 20;
                    
                    this.add.graphics();

                    // Load up the map
                    this.buildFromTiledMap('map');
                    
                    this.forceCircle = this.add.circle(0, 0).setVisible(false);
                    
                    // Some instruction text
                    const instructionText = this.add.text(0, 0, 
                        'Tap the screen\nto move the ball\n ',
                        {
                            fontSize: '30px',
                            color: 'black', 
                            fontFamily: 'sans-serif',
                            align: 'center',
                            shadow: {blur: 5, color: 'rgba(128, 128, 128, 0.5)', fill: true}
                        }).setScrollFactor(0);
                    instructionText.setPosition(240 - instructionText.width / 2, 100);
                    this.time.delayedCall(3000, () => {
                        instructionText.setVisible(false);
                    });

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
                    // var text = this.add.text(0, 0, 'In Game', {fontSize: '30px', color: 'black', fontFamily: 'sans-serif'}).setScrollFactor(0);
                    
                    
                    // this.scenery = this.matter.add.fromVertices(250, 700,  
                    //    '20 700 300 750 450 700 300 760',
                    //     {
                    //         isStatic: true
                    //     });
                    
                    // this.cameras.main.setBounds(-2000, -2000, 2000, 2000);
                    // this.cameras.main.startFollow(this.ball);
                    
                    this.input.on('pointerdown', (pointer : Phaser.Input.Pointer) => {
                        this.pointerdown = true;
                        this.pointerStartTime = this.time.now
                    });
                    this.input.on('pointerup', (pointer : Phaser.Input.Pointer) => {
                        if (!this.pointerdown) return;
                        this.pointerdown = false;
                        let deltaX = pointer.worldX - this.ball?.position.x!;
                        let deltaY = pointer.worldY - this.ball?.position.y!;
                        let force = 0.01;
                        const maxForce = 0.05;
                        const minForce = 0.003;
                        const pointerHoldTime = 500;
                        // The longer the finger is pressed down, the stronger the force (500ms for full force)
                        force = force * (this.time.now - this.pointerStartTime) / pointerHoldTime;
                        if (force < minForce) force = minForce;
                        if (force > maxForce) force = maxForce;
                        // The more distant the finger is from the ball, the weaker the force
                        force = force * (1 - Phaser.Math.Clamp((Math.sqrt(deltaY * deltaY + deltaX * deltaX) - 50) / 200, 0, 1));
                        this.matter.applyForceFromAngle(this.ball!, force, Math.atan2(-deltaY, -deltaX));
                        // Set up animation of the force circle
                        this.pointerStartTime = this.time.now;
                        this.forceCircle?.setPosition(pointer.worldX, pointer.worldY);
                        this.forceCircleStartStrokeWidth = Phaser.Math.Linear(1, 100, Phaser.Math.Clamp((this.time.now - this.pointerStartTime) / pointerHoldTime, 0, 1));
                        this.forceCircleStartStrokeWidth = 5;
                        this.forceCircle?.setRadius(0);
                        this.forceCircle?.setStrokeStyle(this.forceCircleStartStrokeWidth, 0x000088);
                        this.forceCircle?.setVisible(true);
                    });
                }
                
                update(time: number, delta: number): void {
                    // Scroll camera so that it is centered on the player
                    this.cameras.main.scrollY = this.ball?.position.y! - this.game.scale.height / 2;
                    this.cameras.main.scrollX = this.ball?.position.x! - this.game.scale.width / 2;
                    
                    // Animate the force circle if it is showing
                    if (this.forceCircle?.visible)
                    {
                        if (!this.pointerdown) {
                            const expandDuration = 150;
                            if (time - this.pointerStartTime < expandDuration) {
                                let lerp = (time - this.pointerStartTime) / expandDuration;
                                this.forceCircle?.setRadius(lerp * 100);
                                this.forceCircle?.setAlpha(1 - lerp);
                                this.forceCircle?.setStrokeStyle(Phaser.Math.Linear(this.forceCircleStartStrokeWidth, 0, lerp), 0x000088);
                            } else
                            this.forceCircle?.setVisible(false);
                        }
                    }
                }
            }