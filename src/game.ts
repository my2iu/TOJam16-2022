import { Events } from 'matter';
import 'phaser';
import * as tiled from './tiled';

type CustomTileProperties = {
    isBumper: boolean,
    isDeath: boolean
}

// Special scene that will load in a tiled map and the referenced
// resources in that map.
export class GameTiledLoader extends Phaser.Scene {
    constructor() {
        super('GameSceneLoader');
    }

    preload() {
        this.load.json('map', 'assets/map.tmj');

        // We want to override the loading of one of the images with a spritesheet
        // instead
        this.load.spritesheet('images/round.png', 'assets/images/roundsheet.png', {
            frameWidth: 90
        });
    }

    findResourcesFromTiledMap(key: string) {
        const json = this.cache.json.get(key);

        // Get reference to image collection tilesets
        const backgroundImagesTiles = json['tilesets'][0];
        tiled.loadTiledTilesetImages(backgroundImagesTiles, this.load);
    }

    create() {
        this.findResourcesFromTiledMap('map');
        this.load.on(Phaser.Loader.Events.COMPLETE, () => {
            this.scene.start('GameScene');
        });
        this.load.start();
    }
}


export class GameScene extends Phaser.Scene {
    scenery: MatterJS.BodyType | undefined;
    ball: Phaser.Physics.Matter.Sprite | undefined;
    instructionText: Phaser.GameObjects.Text | undefined;

    bumperSound: Phaser.Sound.BaseSound | undefined;
    loseSound: Phaser.Sound.BaseSound | undefined;

    // For showing feedback on 
    forceCircle: Phaser.GameObjects.Arc | undefined;

    // Tracks information about user touches on screen
    pointerdown = false;
    pointerStartTime = 0;
    forceCircleStartStrokeWidth = 0;
    forceCircleMaxRadius = 0;

    constructor() {
        super('GameScene');
    }

    preload() {
        // The default tiled loader doesn't handle collision data on
        // image collections properly, so we'll just load manually
        this.load.json('map', 'assets/map.tmj');
        this.load.image('ball', 'assets/images/ball.png');

        this.load.audio('collideAudio', 'assets/audio/Hit_hurt 5.mp3');
        this.load.audio('bumperAudio', 'assets/audio/Blip_select 40.mp3');
        this.load.audio('hitAudio', 'assets/audio/woosh.mp3');
        this.load.audio('loseAudio', 'assets/audio/lose.mp3');
    }

    private makeStaticObjectFromTiledMap(objJson: any, tile: tiled.ObjectTile<CustomTileProperties>) {
        // Create an image for each background object
        let gid = objJson.gid as number;
        let x = objJson.x as number;
        let y = objJson.y as number;
        let h = objJson.height as number;
        let w = objJson.width as number;
        let body = this.add.image(x + w / 2, y - h / 2, tile.image);

        // Create a collision object too
        if (tile.collision) {
            tile.collision.forEach((collisionPoly) => {
                let body = tiled.makeBodyFromCollisionObject(x, y, w, h, collisionPoly,
                    this.matter,
                    {
                        isStatic: true
                    });
                this.matter.world.add(body);
            });
        }
        return body;
    }

    private makeStaticCollidingImageObjectFromTiledMap(objJson: any, tile: tiled.ObjectTile<CustomTileProperties>) {
        // Create an image for each background object
        let gid = objJson.gid as number;
        let x = objJson.x as number;
        let y = objJson.y as number;
        let h = objJson.height as number;
        let w = objJson.width as number;
        let body = this.matter.add.sprite(x + w / 2, y - h / 2, tile.image);
        if (w != tile.imagewidth || h != tile.imageheight) {
            body.scaleX = w / tile.imagewidth;
            body.scaleY = h / tile.imageheight;
        }
        // Only take the first collision shape for now
        let collisionShape = tile.collision[0];
        let matterBody = tiled.makeBodyFromCollisionObject(x, y, w, h, collisionShape,
            this.matter,
            {
                isStatic: true
            });
        body.setExistingBody(matterBody);
        return body;
    }

    private buildFromTiledMap(key: string) {
        const json = this.cache.json.get(key);

        // Get reference to image collection tilesets
        const backgroundImagesTiles = json['tilesets'][0];
        const backgroundTiles: tiled.ObjectTile<CustomTileProperties>[] = tiled.loadTiledTileset(backgroundImagesTiles, this.matter);

        // Read background layer
        const backgroundLayer = json['layers'][0];
        (backgroundLayer.objects as any[]).forEach((objJson) => {
            let gid = objJson.gid as number;
            let tile = backgroundTiles[gid];
            this.makeStaticObjectFromTiledMap(objJson, tile);
        });

        // Read the object layer
        const objectLayer = json['layers'][1];
        (objectLayer.objects as any[]).forEach((objJson) => {
            if (objJson.point) {
                if (objJson.name == 'StartPoint') {
                    this.ball?.setPosition(objJson.x as number, objJson.y as number);
                }
            } else if (objJson.gid) {
                let gid = objJson.gid as number;
                let tile = backgroundTiles[gid];
                if (tile.properties.isDeath) {
                    let body = this.makeStaticCollidingImageObjectFromTiledMap(objJson, tile);
                    //@ts-ignore
                    body.setOnCollideWith(this.ball, () => {
                        this.loseSound?.play();
                        this.scene.launch('gameover', { isWin: false });
                        this.instructionText?.setVisible(false);
                        this.scene.pause();
                    });
                } else if (tile.properties.isBumper) {
                    let body = this.makeStaticCollidingImageObjectFromTiledMap(objJson, tile);
                    body.setData('isBumper', true);
                    //@ts-ignore
                    body.setOnCollideWith(this.ball, (ball, pair) => {
                        body.setFrame(1);
                        this.time.delayedCall(75, () => {
                            body.setFrame(0);
                        });
                        let ballSprite: Phaser.Physics.Matter.Sprite = ball.gameObject;
                        let deltaX = ballSprite.x - body.x;
                        let deltaY = ballSprite.y - body.y;
                        let vec = new Phaser.Math.Vector2(deltaX, deltaY);
                        // You can't apply forces inside a collision (because
                        // forces are cleared right afterwards), so we need
                        // to set an event to update the forces afterward
                        this.matter.world.once('beforeupdate', () => {
                            ballSprite.applyForce(vec.setLength(0.006));
                        });
                        this.bumperSound?.play();
                    });
                } else if (tile.properties.isWin) {
                    let body = this.makeStaticCollidingImageObjectFromTiledMap(objJson, tile);
                    //@ts-ignore
                    body.setOnCollideWith(this.ball, () => {
                        this.scene.launch('gameover', { isWin: true });
                        this.instructionText?.setVisible(false);
                        this.scene.pause();
                    });
                } else {
                    this.makeStaticObjectFromTiledMap(objJson, tile);
                }
            }
        });
    }


    create() {
        // Get sounds ready
        const tapSound: Phaser.Sound.BaseSound = this.sound.add('hitAudio');
        const collideSound: Phaser.Sound.BaseSound = this.sound.add('collideAudio');
        this.bumperSound = this.sound.add('bumperAudio');
        this.loseSound = this.sound.add('loseAudio');

        // Configure general physics parameters
        this.matter.world.setGravity(0, 1, 0.0005);
        this.matter.world.engine.positionIterations = 20;
        this.matter.world.engine.velocityIterations = 20;

        // Create the initial player
        this.ball = this.matter.add.sprite(
            0, 0,
            'ball', 0);
        this.ball.setCircle(10, {
            friction: 0.01,
            frictionStatic: 0,
            restitution: 0.75
        });
        this.ball.setOnCollide((pair: { bodyA: { gameObject?: Phaser.GameObjects.GameObject }, bodyB: { gameObject?: Phaser.GameObjects.GameObject } }) => {
            if (pair.bodyA.gameObject?.getData('isBumper')) return;
            if (pair.bodyB.gameObject?.getData('isBumper')) return;
            collideSound.play();
        });


        // Load up the map
        this.buildFromTiledMap('map');

        this.forceCircle = this.add.circle(0, 0).setVisible(false);

        // Some instruction text
        this.instructionText = this.add.text(0, 0,
            'Tap the screen\nto move the ball\n\n'
            + 'Tap closer to the ball\nto move it less',
            {
                fontSize: '30px',
                color: 'black',
                fontFamily: 'sans-serif',
                align: 'center',
                shadow: { blur: 8, color: 'rgba(255, 255, 255, 1)', fill: true }
            }).setScrollFactor(0);
        this.instructionText.setPosition(240 - this.instructionText.width / 2, 100);
        this.time.delayedCall(5000, () => {
            this.instructionText?.setVisible(false);
        });

        // Game input handling
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.pointerdown = true;
            this.pointerStartTime = this.time.now
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!this.pointerdown) return;
            this.pointerdown = false;
            let deltaX = pointer.worldX - this.ball?.body.position.x!;
            let deltaY = pointer.worldY - this.ball?.body.position.y!;

            let angle = Math.atan2(-deltaY, -deltaX);
            const maxPush = 15;
            const minPush = 1;
            // The closer the finger is from the ball, the stronger the force
            const minForceDistance = 50;
            const maxForceDistance = 200;
            const pushAmount = (Phaser.Math.Clamp(Math.sqrt(deltaY * deltaY + deltaX * deltaX), minForceDistance, maxForceDistance) - minForceDistance) / (maxForceDistance - minForceDistance);
            const push = Phaser.Math.Linear(minPush, maxPush, pushAmount);
            let xSpeed = Math.cos(angle) * push;
            let ySpeed = Math.sin(angle) * push;
            if (Math.sign(xSpeed) == Math.sign(this.ball?.body.velocity.x!)
                && Math.abs(xSpeed) < Math.abs(this.ball?.body.velocity.x!))
                xSpeed = this.ball?.body.velocity.x!;
            if (Math.sign(ySpeed) == Math.sign(this.ball?.body.velocity.y!)
                && Math.abs(ySpeed) < Math.abs(this.ball?.body.velocity.y!))
                ySpeed = this.ball?.body.velocity.y!;
            this.matter.body.setVelocity(this.ball!.body as MatterJS.BodyType, { x: xSpeed, y: ySpeed });

            // let force = 0.01;
            // const maxForce = 0.05;
            // const minForce = 0.003;
            // const pointerHoldTime = 500;
            // // The longer the finger is pressed down, the stronger the force (500ms for full force)
            // force = force * (this.time.now - this.pointerStartTime) / pointerHoldTime;
            // if (force < minForce) force = minForce;
            // if (force > maxForce) force = maxForce;
            // // The more distant the finger is from the ball, the weaker the force
            // const minForceDistance = 50;
            // const maxForceDistance = 200;
            // force = force * (1 - Phaser.Math.Clamp((Math.sqrt(deltaY * deltaY + deltaX * deltaX) - minForceDistance) / maxForceDistance, 0, 1));
            // this.matter.applyForceFromAngle(this.ball!, force, Math.atan2(-deltaY, -deltaX));


            // Set up animation of the force circle
            this.pointerStartTime = this.time.now;
            this.forceCircle?.setPosition(pointer.worldX, pointer.worldY);
            // this.forceCircleStartStrokeWidth = Phaser.Math.Linear(1, 100, Phaser.Math.Clamp((this.time.now - this.pointerStartTime) / pointerHoldTime, 0, 1));
            this.forceCircleStartStrokeWidth = 5;
            this.forceCircle?.setRadius(0);
            this.forceCircle?.setAlpha(1);
            this.forceCircle?.setStrokeStyle(this.forceCircleStartStrokeWidth, 0x000088);
            this.forceCircle?.setVisible(true);
            this.tweens.add({
                targets: this.forceCircle!,
                ease: 'Linear',
                alpha: 0,
                repeat: 0,
                radius: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                duration: 150,
                onComplete: () => {
                    this.forceCircle?.setVisible(false);
                }
            });

            tapSound.play();
        });
    }

    update(time: number, delta: number): void {
        // Scroll camera so that it is centered on the player
        this.cameras.main.scrollY = this.ball?.body.position.y! - this.game.scale.height / 2;
        this.cameras.main.scrollX = this.ball?.body.position.x! - this.game.scale.width / 2;

        // Animate the force circle if it is showing
        if (this.forceCircle?.visible) {
            if (!this.pointerdown) {
                //     const expandDuration = 150;
                //     if (time - this.pointerStartTime < expandDuration) {
                //         let lerp = (time - this.pointerStartTime) / expandDuration;
                //         this.forceCircle?.setRadius(lerp * 100);
                //         this.forceCircle?.setAlpha(1 - lerp);
                //         this.forceCircle?.setStrokeStyle(Phaser.Math.Linear(this.forceCircleStartStrokeWidth, 0, lerp), 0x000088);
                //     } else
                //         this.forceCircle?.setVisible(false);
            }
        }
    }
}