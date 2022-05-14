// Reads object data from a tiled map file

export class ObjectTile
{
    gid : number;
    image : string;
    imageheight : number;
    imagewidth  : number;
    collision : CollisionPolygon[];

    constructor()
    {
        this.gid = 0;
        this.image = '';
        this.imagewidth = 0;
        this.imageheight = 0;
        this.collision = [];
    }
}

export class CollisionPolygon
{
    centerX : number;
    centerY : number;
    path : string;

    constructor(points : number[])
    {
        let minX, minY, maxX, maxY : number;
        minX = maxX = points[0];
        minY = maxY = points[1];
        for (let n = 0; n < points.length; n += 2) {
            minX = Math.min(minX, points[n]);
            maxX = Math.max(maxX, points[n]);
            minY = Math.min(minY, points[n + 1]);
            maxY = Math.max(maxY, points[n + 1]);
        }
        this.centerX = (maxX + minX) / 2;
        this.centerY = (maxY + minY) / 2;
        this.path = points.join(' ');
    }
}

export function loadTiledTileset(json : any) : any[]
{
    const tiles : any[] = [];
    const firstgid : number = json['firstgid'];
    json['tiles'].forEach((tileJson : any) => {
        const id : number = tileJson['id'];
        const tile = new ObjectTile();
        tile.gid = id + firstgid;
        tile.image = tileJson['image'];
        tile.imagewidth = tileJson['imagewidth'];
        tile.imageheight = tileJson['imageheight'];
        if (tileJson['objectgroup']) {
            (tileJson['objectgroup']['objects'] as any[]).forEach((objJson: any) => {
                let x = objJson.x as number;
                let y = objJson.y as number;
                let vectorVals : number[] = [];
                (objJson.polygon as {x:number,y:number}[]).forEach((vertex) => {
                    vectorVals.push(vertex.x + x);
                    vectorVals.push(vertex.y + y);
                });
                let collisionPoly = new CollisionPolygon(vectorVals);
                tile.collision.push(collisionPoly);
            });
        }
        tiles[tile.gid] = tile;
    });
    return tiles;
}

