const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const http = require('http').createServer(app);
const io = require('socket.io')(http, {wsEngineL: 'ws'});

// My homemade physics engine
const Impact2d = require('impact2d');
const {Engine, Shapes, Util, ForceField} = Impact2d;
const {Circle, Polygon, Rect, Hexagon, RegPoly} = Shapes;


app.use(express.static(__dirname + "/public"));
app.get("/", function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});
http.listen(port, () => console.log(`Server running on port ${port}!`));

const TICK_RATE = 30;
const WORLD_SCALE = 2000;
const CD1 = 10;
const CD2 = 10;

const CD3 = 100;
const CD4 = 100;
const EVENTS = {
    JOIN: "JOIN",
    JOINACK: "JOINACK",
    DIR: "DIRECT",
    STOP: "STOP",
    FIRE: "FIRE",
    JUMP: "JUMP",
    SYNC: "SYNC",
    OUT: "OUT",
    PING: "PING",
    PONG: "PONG",
    SCORE: "SCORE"
}
Object.freeze(EVENTS);

var clients = {};
io.on('connection', (socket) => {
    console.log(`Client ${socket.id} Connected`);
    clients[socket.id] = socket;

    socket.on(EVENTS.PING, () => {
        socket.emit(EVENTS.PONG);
    });

    socket.on(EVENTS.JOIN, (data) => {
        // Register
        let pos = {x: 200, y: 200} // getRandomSpawnPosition();
        let geom = new Circle({
            id: socket.id,
            x: pos.x,
            y: pos.y,
            r: 32,
            m: 10,
            v: {x:0,y:0},
            color: '',
            data: {
                type: 'player',
                name: data.name,
                cd1: CD1,
                cd2: CD2,
                cd3: 0,
                health: 100,
                healthFull: 100,
            }
        });
        engine.addEntity(geom);
        socket.emit(EVENTS.JOINACK, {
            time: new Date().getTime(),
            me: engine.entities[socket.id],
            scale: WORLD_SCALE,
            rate: TICK_RATE,
            cd1: CD1,
            cd2: CD2,
            entities: engine.entities
        });
        console.log(`Player ${socket.id} joined the game!`);
    });

    socket.on(EVENTS.DIR, (data) => {
        let entity = engine.entities[data.id];
        if (entity && data.direction) {
            entity.data.angle = data.rotation;
            let speed = entity.data.jumping? 1000 : 500;
            if (entity.data.stop) {
                entity.data.vPrev = {x: data.direction.x*speed, y: data.direction.y*speed};
            } else {
                entity.v = {x: data.direction.x*speed, y: data.direction.y*speed};
            }
        }
    });

    socket.on(EVENTS.JUMP, (data) => {
        console.log(`Jump entity ${socket.id}`);
        let entity = engine.entities[data.id];
        if (entity) {
            if (entity.data.cd2 > 0) return;
            entity.data.cd2 = CD2;
            let dir = entity.data.stop? Util.clone(entity.data.vPrev) : Util.clone(entity.v);
            dir = Util.normalize(dir);
            engine.applyForce(entity, Util.vMul(dir, 8000));
            entity.data.jumping = true;
            setTimeout(() => {
                entity.v = Util.vMul(Util.normalize(entity.v), 500);
                entity.data.jumping = false;
            }, 500);
        }
    });

    socket.on(EVENTS.STOP, (data) => {
        console.log(`Stop entity ${socket.id}`);

        let entity = engine.entities[data.id];
        if (entity) {
            entity.data.stop = data.stop;
            if (data.stop) {
                entity.data.vPrev = entity.v;
                entity.v = {x: 0, y: 0};
            } else {
                entity.v = entity.data.vPrev;
            }
        }
    });

    socket.on(EVENTS.FIRE, (data) => {
        console.log(`Fire entity ${socket.id}`);
        let entity = engine.entities[data.id];
        if (entity) {
            if (entity.data.cd1 > 0) return;
            entity.data.cd1 = CD1;
            let bid = Math.round(Math.random() * 1000);
            let dir = entity.data.stop? Util.clone(entity.data.vPrev) : Util.clone(entity.v);
            dir = Util.normalize(dir);
            let geom = new Circle({
                id: socket.id + bid,
                ttl: 200,
                x: entity.x + dir.x*10,
                y: entity.y + dir.y*10,
                m: 1,
                v: {x:0,y:0},
                r: 8,
                color: '',
                percise: true,
                data: {
                    type: 'bullet',
                    boost: entity.data.boost1,
                    angle: Math.atan2(dir.y, dir.x) * 180/Math.PI + 90 // entity.data.angle Math.atan2(dir)
                },
                onCollide: function(target) {
                    // Remove dead player if any
                    if (clients[target.id]) {
                        target.data.health -= 34;
                        if (target.data.health <= 0) {
                            engine.removeEntityRuntime(target);
                            clients[target.id].emit(EVENTS.OUT, {who: entity});
                            clients[data.id].emit(EVENTS.SCORE, {who: entity});
                        }
                    }
                    engine.removeEntityRuntime(this);
                },
                ignoreIf: function(target) {
                    if (entity.data.boost1) {
                        return (!clients[target.id] && !target.data.isWall) || target.id === data.id;
                    } else {
                        return target.id === data.id;
                    }
                }
            });
            engine.addEntity(geom);
            if (entity.data.boost1) {
                engine.applyForce(geom, Util.vMul(dir, 5000));
            } else {
                engine.applyForce(geom, Util.vMul(dir, 3500));
            }
        }
    });

    socket.on("disconnect", () => {
      let entity = engine.entities[socket.id];
      entity && engine.removeEntity(entity);
      delete clients[socket.id];
      console.log(`Player ${socket.id} has left!`);
    });
});

// Init world
let engine = new Engine({
    scale: WORLD_SCALE,
    lv: 3,
    delta: 0.02,
    onAdd: ()=>{},
    onRemove: ()=>{},
    postTick: ()=>{}
});

// Wall
engine.addEntity(new Rect({data: {type: 'object', isWall: true}, eternal: true, static: true, id: 'wall_bot', x: WORLD_SCALE/2, y: WORLD_SCALE-100, w: WORLD_SCALE-165, h: 30, m: 100000}));
engine.addEntity(new Rect({data: {type: 'object', isWall: true}, eternal: true, static: true, id: 'wall_top', x: WORLD_SCALE/2, y: 100, w: WORLD_SCALE-165, h: 30, m: 100000}));
engine.addEntity(new Rect({data: {type: 'object', isWall: true}, eternal: true, static: true, id: 'wall_left', x: 100, y: WORLD_SCALE/2, w: 30, h: WORLD_SCALE-165, m: 100000}));
engine.addEntity(new Rect({data: {type: 'object', isWall: true}, eternal: true, static: true, id: 'wall_right', x: WORLD_SCALE-100, y: WORLD_SCALE/2, w: 30, h: WORLD_SCALE-165, m: 100000}));

// Objects
let blk1 = [
    {x: 1000, y: 500},
    {x: 1300, y: 500},
    {x: 1200, y: 800}
]
let blk2 = [
    {x: 500, y: 1200},
    {x: 600, y: 1300},
    {x: 570, y: 1350}
]
let blk3 = [
    {x: 1451, y: 1259}, 
    {x: 1090, y: 1612},
    {x: 1600, y: 1612}
]
let blk4 = [
    {x: 1023, y: 952}, 
    {x: 1366, y: 850},
    {x: 1555, y: 1144}
]
let blk6 = [
    {x: 500, y: 500}, 
    {x: 600, y: 300},
    {x: 900, y: 500}
]


engine.addEntity(new Polygon({data: {type: 'object'}, eternal: true, static: true, id: 'blk3', vertices:blk3,  m: 100000}));
engine.addEntity(new Polygon({data: {type: 'object'}, eternal: true, static: true, id: 'blk4', vertices:blk4,  m: 100000}));
engine.addEntity(new RegPoly({data: {type: 'object'}, eternal: true, static: true, id: 'blk1', m: 100000, sides: 6, x: 1300, y: 500, r: 200}));
engine.addEntity(new Rect({data: {type: 'object'}, eternal: true, static: true, id: 'blk5', m: 100000, w: 20, h: 400, x: 570, y: 300}));
engine.addEntity(new Rect({data: {type: 'object'}, eternal: true, static: true, id: 'blk6', m: 100000, w: 335, h: 50, x: 600, y: 515}));
engine.addEntity(new Rect({data: {type: 'object'}, eternal: true, static: true, id: 'blk7', m: 100000, w: 500, h: 80, x: 515, y: 710}));
engine.addEntity(new Rect({data: {type: 'object'}, eternal: true, static: true, id: 'blk8', m: 100000, w: 80, h: 80, x: 150, y: 710}));
engine.addEntity(new Rect({data: {type: 'object'}, eternal: true, static: true, id: 'blk9', m: 100000, w: 200, h: 200, x: 500, y: 1400}));

engine.addEntity(new Rect({data: {type: 'chest', template: 'chest1'}, static: true, eternal: true, id: 'c1', m: 10, w: 40, h: 45, x: 1200, y: 1200}));
engine.addEntity(new Rect({data: {type: 'chest', template: 'chest1'}, static: true, eternal: true, id: 'c2', m: 20, w: 40, h: 45, x: 1250, y: 1200}));
engine.addEntity(new Rect({data: {type: 'chest', template: 'chest1'}, static: true, eternal: true, id: 'c3', m: 30, w: 40, h: 45, x: 1200, y: 1250}));
engine.addEntity(new Rect({data: {type: 'chest', template: 'chest1'}, static: true, eternal: true, id: 'c4', m: 30, w: 40, h: 45, x: 1200, y: 1250}));


// for (let i = 0; i < 4; i++) {
//     for (let j = 0; j < 2; j++) {
//         let x = 600 + i * 50;
//         let y = 1000 + j * 50;
//         engine.addEntity(new Rect({data: {type: 'chest', template: 'chest3'}, static: true, eternal: true, id: 'c'+Math.random(), m: 30, w: 40, h: 40, x: x, y: y}));
//     }
// }

// for (let i = 0; i < 3; i++) {
//     for (let j = 0; j < 3; j++) {
//         let x = 600 + i * 50;
//         let y = 1600 + j * 50;
//         engine.addEntity(new Rect({data: {type: 'chest', template: 'chest2'}, static: true, eternal: true, id: 'c'+Math.random(), m: 30, w: 40, h: 40, x: x, y: y}));
//     }
// }

// for (let i = 0; i < 3; i++) {
//     for (let j = 0; j < 3; j++) {
//         let x = 1600 + i * 50;
//         let y = 600 + j * 50;
//         engine.addEntity(new Rect({data: {type: 'chest', template: 'chest4'}, static: true, eternal: true, id: 'c'+Math.random(), m: 30, w: 40, h: 40, x: x, y: y}));
//     }
// }

// engine.addEntity(new Rect({data: {type: 'chest', template: 'med1'}, id: 'c4', m: 30, w: 40, h: 40, x: 1200, y: 1250}));


// Stable interval solution from stackoverflow
let tick = function() {
    engine.tick()
    Object.keys(clients).forEach((id) => {
      let entity = engine.entities[id];
      if (entity) {
        entity.data.cd1--;
        entity.data.cd2--;

        if (entity.data.cd3 > 0) {
            entity.data.cd3--;
        } else {
            entity.data.cd3 = 0;
            entity.data.boost1 = false;
        }


      }
      clients[id].emit(EVENTS.SYNC, {
        time: new Date().getTime(),
        entities: engine.entities
      });
    });
}

// Spawn loop
setInterval(() => {
    let rand = Math.random() * 10;
    let pos = getRandomSpawnPosition();
    if (rand < 3) {
        engine.addEntity(new Rect({
            ttl: 200, data: {scale: 0.1, type: 'chest', template: 'consume1', consume: true}, id: 'c' + Math.random(), m: 10, w: 40, h: 40, x: pos.x, y: pos.y,
            onCollide: function(target) {
                // Remove dead player if any
                if (clients[target.id]) {
                    target.data.boost1 = true;
                    target.data.cd3 = CD3;
                    engine.removeEntityRuntime(this);
                }
            }
        }));
    } else if (rand < 6) {
        engine.addEntity(new Rect({
            ttl: 200, data: {scale: 0.1, type: 'chest', template: 'consume2', consume: true}, id: 'c' + Math.random(), m: 10, w: 40, h: 40, x: pos.x, y: pos.y,
            onCollide: function(target) {
                // Remove dead player if any
                if (clients[target.id]) {
                    engine.removeEntityRuntime(this);
                }
            }
        }));
    } else {
        engine.addEntity(new Rect({
            ttl: 200, data: {scale: 0.25, type: 'chest', template: 'med1', consume: true}, id: 'c' + Math.random(), m: 10, w: 40, h: 40, x: pos.x, y: pos.y,
            onCollide: function(target) {
                // Remove dead player if any
                if (clients[target.id]) {
                    target.data.health = Math.min(target.data.healthFull, target.data.health + 25);
                    engine.removeEntityRuntime(this);
                }
            }
        }));
    }
}, 5000);

let tickLengthMs = TICK_RATE
let previousTick = Date.now();
let gameLoop = function () {
  let now = Date.now()
  if (previousTick + tickLengthMs <= now) {
    previousTick = now
    tick();
  }
  if (Date.now() - previousTick < tickLengthMs - 16) {
    setTimeout(gameLoop)
  } else {
    setImmediate(gameLoop)
  }
}
gameLoop();


// Helpers
function getRandomSpawnPosition() {
    return {
        x: Math.random() * (WORLD_SCALE - 200) + 100,
        y: Math.random() * (WORLD_SCALE - 200) + 100
    }
}