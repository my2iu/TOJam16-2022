// Reads object data from a tiled map file

import 'phaser';

export class ObjectTile<PropertiesType> {
    gid: number;
    image: string;
    imageheight: number;
    imagewidth: number;
    collision: CollisionObject[];

    properties: PropertiesType | any;

    constructor() {
        this.gid = 0;
        this.image = '';
        this.imagewidth = 0;
        this.imageheight = 0;
        this.collision = [];
        this.properties = {};
    }
}

export class CollisionObject {
    constructor() { }
}

export class CollisionPolygon extends CollisionObject {
    centerX: number = 0;
    centerY: number = 0;
    path: string;

    // MatterJS keeps moving the bodies around, so we need to track
    // the position of the first vertex so we know how far to move
    // the body so that it ends up at the right position
    vertex0X = 0;
    vertex0Y = 0;

    constructor(points: number[]) {
        super();
        // let minX, minY, maxX, maxY: number;
        // this.vertex0X = minX = maxX = points[0];
        // this.vertex0Y = minY = maxY = points[1];
        // for (let n = 0; n < points.length; n += 2) {
        //     minX = Math.min(minX, points[n]);
        //     maxX = Math.max(maxX, points[n]);
        //     minY = Math.min(minY, points[n + 1]);
        //     maxY = Math.max(maxY, points[n + 1]);
        // }
        // this.centerX = (maxX + minX) / 2;
        // this.centerY = (maxY + minY) / 2;
        this.path = points.join(' ');
        // this.centerX = centroid.x;
        // this.centerY = centroid.y;
    }
}

export class CollisionCircle extends CollisionObject {
    centerX = 0;
    centerY = 0;
    radius = 0;

    // width and height of the image (not the circle) in case the image is
    // scaled and we need to determine scaling factors for the circle
    w = 0;
    h = 0;

    constructor(x: number, y: number, w: number, h: number,
        imagewidth: number, imageheight: number) {
        super();
        this.centerX = (x + x + w) / 2;
        this.centerY = (y + y + h) / 2;
        this.radius = (w + h) / 4;
        this.w = imagewidth;
        this.h = imageheight;
    }
}

export class CollisionRectangle extends CollisionObject {
    centerX = 0;
    centerY = 0;
    width = 0;
    height = 0;

    constructor(x: number, y: number, w: number, h: number) {
        super();
        this.centerX = (x + x + w) / 2;
        this.centerY = (y + y + h) / 2;
        this.width = w;
        this.height = h;
    }

}

export function makeBodyFromCollisionObject(
    x: number, y: number, w: number, h: number,
    obj: CollisionObject, matter: Phaser.Physics.Matter.MatterPhysics,
    options?: Phaser.Types.Physics.Matter.MatterBodyConfig) {
    if (obj instanceof CollisionPolygon) {
        //@ts-ignore
        // let rawVertices = matter.vertices.fromPath(obj.path);
        // let centroid = matter.vertices.centre(rawVertices);
        let body = matter.bodies.fromVertices(
            // x + w / 2, y - h / 2,
            x + obj.centerX,
            y - h + obj.centerY,
            //@ts-ignore
            matter.vertices.fromPath(obj.path),
            options);
        // We need to know the center of mass in order to
        // adjust its position on-screen
        // matter.body.setPosition(body,
        //     {
        //         x: x + obj.centerX,
        //         y: y - h + obj.centerY
        //     });
        return body;
    } else if (obj instanceof CollisionCircle) {
        let scaleX = w / obj.w;
        let scaleY = h / obj.h;
        let scale = (scaleX + scaleY) / 2
        //@ts-ignore
        let body = matter.bodies.circle(x + obj.centerX * scale, y - obj.centerY * scale, obj.radius * scale, options);
        return body;
    } else if (obj instanceof CollisionRectangle) {
        //@ts-ignore
        let body = matter.bodies.rectangle(x + obj.centerX, y - h + obj.centerY, obj.width, obj.height, options);
        return body;
    } else {
        //@ts-ignore
        let body = matter.bodies.rectangle((x + x + w) / 2, (y + y - h) / 2, w, h, options);
        return body;
    }
}

export function loadTiledTilesetImages(json: any, load: Phaser.Loader.LoaderPlugin) {
    json['tiles'].forEach((tileJson: any) => {
        const image: string = tileJson['image'];
        load.image(image, 'assets/' + image);
    });
}

export function loadTiledTileset(json: any, matter?: Phaser.Physics.Matter.MatterPhysics): any[] {
    const tiles: any[] = [];
    const firstgid: number = json['firstgid'];
    json['tiles'].forEach((tileJson: any) => {
        const id: number = tileJson['id'];
        const tile = new ObjectTile();
        tile.gid = id + firstgid;
        tile.image = tileJson['image'];
        tile.imagewidth = tileJson['imagewidth'];
        tile.imageheight = tileJson['imageheight'];
        if (tileJson['objectgroup']) {
            (tileJson['objectgroup']['objects'] as any[]).forEach((objJson: any) => {
                let x = objJson.x as number;
                let y = objJson.y as number;
                let vectorVals: number[] = [];
                if (objJson.polygon) {
                    // When importing polygons, do NOT use concave polygons. Although
                    // Matter can decompose concave polygons into convex ones, it ends up
                    // moving the vertices around during the decomposition, and shapes
                    // will no longer line up with other shapes afterwards.
                    (objJson.polygon as { x: number, y: number }[]).forEach((vertex) => {
                        vectorVals.push(vertex.x);
                        vectorVals.push(vertex.y);
                    });
                    // @ts-ignore
                    let rawVerts = matter!.vertices.fromPath(vectorVals.join(' '), null);
                    let centroid = matter!.vertices.centre(rawVerts);
                    for (let n = 0; n < vectorVals.length; n += 2) {
                        vectorVals[n] -= centroid.x;
                        vectorVals[n + 1] -= centroid.y;
                    }
                    let collisionPoly = new CollisionPolygon(vectorVals);
                    collisionPoly.centerX = x + centroid.x;
                    collisionPoly.centerY = y + centroid.y;
                    tile.collision.push(collisionPoly);
                } else if (objJson.ellipse) {
                    let collision = new CollisionCircle(
                        objJson.x as number, objJson.y as number,
                        objJson.width as number, objJson.height as number,
                        tile.imagewidth, tile.imageheight);
                    tile.collision.push(collision);
                } else {
                    let collision = new CollisionRectangle(
                        objJson.x as number, objJson.y as number,
                        objJson.width as number, objJson.height as number);
                    tile.collision.push(collision);
                }
            });
            // Read in any custom properties
            if (tileJson.properties) {
                (tileJson.properties as { name: string, type: string, value: any }[]).forEach((prop) => {
                    tile.properties[prop.name] = prop.value;
                });
            }
        }
        tiles[tile.gid] = tile;
    });
    return tiles;
}

