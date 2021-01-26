// window.socket = io(); // require('../lib/socket.io');
// window.socket.id = 1;
const socket = io();
class Intro extends Phaser.Scene {
    constructor () {
        super({ key: 'Intro'});
    }

    preload () {
        this.load.image('bg', './assets/bk.png');
        this.load.image('ufo', './assets/ufo.png');
        this.load.image('mask', './assets/mask.png');
        this.load.image('bullet', './assets/bullet.png');
        this.load.image('cd1', './assets/cd1.png');
        this.load.image('cd2', './assets/cd2.png');
        this.load.image('trophy', './assets/trophy.png');
        this.load.image('base', './assets/base.png');
        this.load.image('knob', './assets/knob.png');
        this.load.atlas('flares', './assets/particles/flares.png', './assets/particles/flares.json');
        this.load.plugin('rexvirtualjoystickplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js', true);
    }

    create (data) {
        this.entities = {};
        this.baseContainer = this.make.container(0, 0);
        //this.background = this.add.tileSprite(0, 0,  window.innerWidth, window.innerHeight, 'bg');
        this.rt = this.make.renderTexture({width: window.innerWidth, height: window.innerHeight, add: false});
        this.rt.tint = 0x123456;
        //this.baseContainer.add([this.background]);
        this.meData = null;
        this.fmanager = null;
        this.dmanager = null;
        this.diffs = null;
        this.pointerLocked = false;
        this.stopped = false;
        this.cd1Full = data.cd1;
        this.cd2Full= data.cd2;


        let rect = this.add.rectangle(1000, 1000, 2000, 2000, 0x273b44);
        this.baseContainer.add([rect]);

        window.entities = {};
        this.baseContainer.setMask(new Phaser.Display.Masks.BitmapMask(this, this.rt));
        this.baseContainer.depth = 1;
        this.meData = data.me;
        this.fmanager = new FrameManager({rate: data.rate});
        this.dmanager = new Diff(data.entities);
        for (let key in data.entities) {
            let entity = data.entities[key];
            if (entity.data.type === 'player') {
                this.entities[entity.id] = new PlayerBaseRender(entity, this, this.baseContainer, this.meData.id === entity.id);
            } else if (entity.data.type === 'bullet') {
                this.entities[entity.id] = new BulletBaseRender(entity, this, this.baseContainer);
            } else {
                this.entities[entity.id] = new ObjectBaseRender(entity, this, this.baseContainer);
            }
        }

        // Cameras
        this.me = this.entities[this.meData.id];
        this.cameras.main.setBounds(-2000, -2000, 8000, 8000);
        this.cameras.main.setZoom(0.7);
        this.cameras.main.zoomTo(1, 500);
        this.cameras.main.startFollow(this.me.body);

        socket.on("SYNC", (data) => {
            if (!this.meData || !this.fmanager || !this.dmanager) return;
            this.fmanager.push(data.entities);
            this.dmanager.refresh(data.entities);
            this.diffs = this.dmanager.refDiff();
            this.diffs.toAdd.forEach((entity) => {
                if (entity.data.type === 'player') {
                    this.entities[entity.id] = new PlayerBaseRender(entity, this, this.baseContainer, this.meData.id === entity.id);
                } else if (entity.data.type === 'bullet') {
                    this.entities[entity.id] = new BulletBaseRender(entity, this, this.baseContainer);
                } else {
                    this.entities[entity.id] = new ObjectBaseRender(entity, this, this.baseContainer);
                }
            });
            this.diffs.toRemove.forEach((entity) => {
                this.entities[entity.id].destroy(this);
                delete this.entities[entity.id];
            });
        });


        socket.on("SCORE", (data) => {
            let name = data.who.data.name || "GUEST";
            let text1 = this.add.text(window.innerWidth/2, window.innerHeight*0.9, `ELIMINATED PLAYER '${name}'`, {
                fontFamily: '"Verdana"',
                fontSize: "24px",
                strokeThickness: 1,
                color: '#FFD700'
            });
            text1.setAlpha(0.8);
            text1.setOrigin(0.5);
            text1.setDepth(100);
            let tween = this.tweens.add({
                targets: text1,
                alpha: 0.2,
                paused: false,
                yoyo: true,
                repeat: -1
            });
            text1.setScrollFactor(0,0);
            setTimeout(() => {
                tween.stop();
                text1.destroy();
            }, 3500);
        })

        socket.on("OUT", () => {
            let text1 = this.add.text(this.me.data.x, this.me.data.y, "YOU ARE ELIMINATED!", {
                fontFamily: '"Verdana"',
                fontSize: "64px",
                strokeThickness: 1
            });
            text1.setAlpha(0.8);
            text1.setOrigin(0.5);
            let text2 = this.add.text(this.me.data.x, this.me.data.y+80, "(Game restarting in 5 seconds)", {
                fontFamily: '"Verdana"',
                fontSize: "24px",
                strokeThickness: 1
            });
            text2.setAlpha(0.8);
            text2.setOrigin(0.5);
            var that = this;
            let tween = this.tweens.add({
                targets: text2,
                alpha: 0.2,
                paused: false,
                yoyo: true,
                repeat: -1
            });
            setTimeout(() => {
                tween.stop();
                that.scene.transition({target: "Prompt", duration: 0});
                location.reload();
                $('#container').show();
            }, 5000)
        })

        // Controls
        let that = this;
        this.input.keyboard.on('keydown-' + 'S', function (event) {
            if (that.stopped) return;
            socket.emit("STOP", { id: that.meData.id, stop: true });
            that.stopped = true;
        });
        this.input.keyboard.on('keyup-' + 'S', function (event) {
            socket.emit("STOP", { id: that.meData.id, stop: false});
            that.stopped = false;
        });


        // Display
        this.cd1 = this.add.sprite(window.innerWidth*0.1, window.innerHeight*0.9, 'cd1');
        this.cd1.setAlpha(0.2);
        this.cd1.setOrigin(0.5);
        this.cd1.setDepth(100);
        this.cd1.setScrollFactor(0,0);
        this.cd1.setScale(0.4);
        this.cd1text = this.add.text(window.innerWidth*0.1, window.innerHeight*0.95, "0%", {
            fontFamily: '"Verdana"',
            fontSize: "24px",
            strokeThickness: 1
        });
        this.cd1text.setAlpha(0.8);
        this.cd1text.setOrigin(0.5);
        this.cd1text.setDepth(111);
        this.cd1text.setScrollFactor(0,0);
        this.cd1.setInteractive().on('pointerdown', function(){
            socket.emit("FIRE", { id: that.meData.id});
        }, this)
        this.cd1.setInteractive().on('pointerover', function(e, pointer){
            if (pointer.isDown) socket.emit("FIRE", { id: that.meData.id});
        }, this);
        this.cd1text.blendMode = Phaser.BlendModes.NORMAL;

        this.cd2 = this.add.sprite(window.innerWidth*0.1+150, window.innerHeight*0.9, 'cd2');
        this.cd2.setAlpha(0.2);
        this.cd2.setOrigin(0.5);
        this.cd2.setDepth(1);
        this.cd2.setScrollFactor(0,0);
        this.cd2.setScale(0.4);
        this.cd2text = this.add.text(window.innerWidth*0.1+150, window.innerHeight*0.95, "0%", {
            fontFamily: '"Verdana"',
            fontSize: "24px",
            strokeThickness: 1
        });
        this.cd2text.setAlpha(0.8);
        this.cd2text.setOrigin(0.5);
        this.cd2text.setDepth(111);
        this.cd2text.setScrollFactor(0,0);
        this.cd2.setInteractive().on('pointerdown', function(){
            socket.emit("JUMP", { id: that.meData.id});
        }, this);
        this.cd2.setInteractive().on('pointerover', function(e, pointer){
            if (pointer.isDown) socket.emit("JUMP", { id: that.meData.id});
        }, this)


        if (isTouchDevice()) {
            let base = this.add.image(0,0, 'base');
            base.setAlpha(0.2);
            base.setOrigin(0.5);
            base.setScale(0.5);
            base.setDepth(111);
            let knob = this.add.image(0,0, 'knob');
            knob.setAlpha(0.9);
            knob.setOrigin(0.5);
            knob.setScale(0.5);
            knob.setDepth(111);
            this.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: window.innerWidth*0.8,
                y: window.innerHeight*0.8,
                radius: 100,
                base: base,
                thumb: knob,
                forceMin: 5,
                enable: true
            });
            this.joystick.on('update', function(){
                let angle = that.joystick.angle - 90;
                console.log(angle);
                let dir = {x: 0, y: 1};
                dir = mRot(angle * Math.PI/180, dir);
                that.me.probe.angle = angle;
    
                // Limit pointer move request
                if (that.pointerLocked) return;
                socket.emit("DIRECT", { id: that.meData.id, direction: dir, rotation: angle });
                that.pointerLocked = true;
                setTimeout(function () {
                    that.pointerLocked = false;
                }.bind(that), 100);
            });
        } else {
            this.input.on('pointermove', function (event) {
                that.pointerPosition = {x: event.worldX, y: event.worldY};

                if (!that.me) return;
                let dir = new Phaser.Math.Vector2(event.worldX - that.me.body.x, event.worldY - that.me.body.y).normalize();
                let angle = Math.atan2(dir.y, dir.x) * 180 / Math.PI + 90;
                that.me.probe.angle = angle;

                // Limit pointer move request
                if (that.pointerLocked) return;
                socket.emit("DIRECT", { id: that.meData.id, direction: dir, rotation: angle });
                that.pointerLocked = true;
                setTimeout(function () {
                    this.pointerLocked = false;
                }.bind(that), 100);
            });
            this.input.on('pointerdown', function(pointer){
                if (pointer.rightButtonDown()) {
                    socket.emit("JUMP", { id: that.meData.id});
                } else {
                    socket.emit("FIRE", { id: that.meData.id});
                }
            });
        }


    }

    makeMask = (source) => {
        let refPts = makeSightPolygon(source, this.entities);
        refPts = sortPoints(refPts, {x: source.x, y: source.y});
        let pts = [];
        refPts.forEach((pt) => {
            pts.push(pt.x);
            pts.push(pt.y);
        })
        let polygon = new Phaser.Geom.Polygon(pts);
        var graphics = this.make.graphics();
        graphics.fillStyle(0x00aa00, 0.8);
        graphics.beginPath();
        graphics.moveTo(polygon.points[0].x, polygon.points[0].y);

        for (var i = 1; i < polygon.points.length; i++)
        {
            graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
        }
        graphics.closePath();
        graphics.fillPath();
        return graphics;
    }

    update() {
        if (!this.meData || !this.fmanager || !this.dmanager || !this.fmanager.ready) return;

        // Entities with interpolated positions
        let entities = this.fmanager.pop();
        this.diffs.toUpdate.forEach((entity) => {
            this.entities[entity.id].update(entities[entity.id], this);
        });

        // Move background
        // this.background.tilePositionX = this.me.body.x;
        // this.background.tilePositionY = this.me.body.y;
        // this.background.x = this.me.body.x;
        // this.background.y = this.me.body.y;

        // Cast shadows
        this.rt.clear();
        this.rt.x = this.me.data.x - window.innerWidth/2;
        this.rt.y = this.me.data.y - window.innerHeight/2;

        // // Soft Shadow
        // // for (let i = -20; i <= 20; i+=10) {
        // //     for (let j = -20; j <= 20; j+=10) {
        // //         let g = this.makeMask({x: this.me.data.x+i, y: this.me.data.y+j});
        // //         this.rt.draw(g, -this.me.data.x + window.innerWidth/2, -this.me.data.y + window.innerHeight/2);
        // //     }
        // // }

        let g = this.makeMask({x: this.me.data.x, y: this.me.data.y});
        this.rt.draw(g, -this.me.data.x + window.innerWidth/2, -this.me.data.y + window.innerHeight/2);

        // Update GUI
        let pct1 = (100 - (100* Math.max(this.me.data.data.cd1, 0) / this.cd1Full)).toFixed(0) + '%';
        if (pct1 == "100%") {
            pct1 = "READY!";
            this.cd1.setAlpha(0.9);
        } else {
            this.cd1.setAlpha(0.2);
        }
        let pct2 = (100 - (100* Math.max(this.me.data.data.cd2, 0) / this.cd2Full)).toFixed(0) + '%';
        if (pct2 == "100%") {
            pct2 = "READY!";
            this.cd2.setAlpha(0.9);
        } else {
            this.cd2.setAlpha(0.2);
        }
        this.cd1text.setText(pct1);
        this.cd2text.setText(pct2);
    }
}

const DEFAULT_COLOR_CODE='0x4E7607';
const COVER_W = 2000;
const COVER_H = 2000;
const GAME_JOIN = 'game.join';
const PING_TEST = 'ping.test';
const PONG_TEST = 'pong.test';
window.W = 5000;
window.H = 5000;

class GameScenePrompt extends Phaser.Scene {
    constructor() {
        super({key: "Prompt", active: true});
    }

    preload() {}

    create() {
        let selected = DEFAULT_COLOR_CODE;
        let $container = $('#container');
        let $joinBtn = $('#join');
        let $signal = $('.signal');

        var that = this;
        that.time = new Date().getTime();
        that.avg = 0;

        // Join Game
        $joinBtn.click(function () {
            $container.hide();
            socket.emit("JOIN", {
                id: socket.id,
                name: document.getElementById("name").value,
                color: ""
            });
        });

        socket.on("JOINACK", (data) => {
            that.interval && clearInterval(that.interval);
            that.scene.start("Intro", data);
        });

        // Pong test
        socket.on("PONG", function(data) {
            let gap = new Date().getTime() - that.time;
            let lag = Math.abs(gap - 500);
            that.avg = that.avg * 0.9 + lag * 0.1;

            $signal.text(Math.ceil(that.avg) + 'ms');
            if (that.avg < 100) {
                $signal.css('background-color', '#16a085');
            } else if (that.avg < 150) {
                $signal.css('background-color', '#79ff00');
            } else if (that.avg < 250) {
                $signal.css('background-color', '#ffda00');
            } else {
                $signal.css('background-color', '#ff5521');
            }
            that.time = new Date().getTime();
        });

        that.interval = setInterval(() => {
            socket.emit("PING");
        }, 500);
    }
}


const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // pixelArt: true,
    scene: [GameScenePrompt, Intro],
    parent: "game",
    // antialias: true
};
const game = new Phaser.Game(config);
game.input.addPointer();
game.input.addPointer();
game.input.addPointer();
document.addEventListener('contextmenu', event => event.preventDefault());

function makeSightPolygon(me, entities) {
    let solutions = [];
    let mePt = {x: me.x, y: me.y};
    let polys = [];
    let bb = {
        vertices: [
            {x: mePt.x - window.innerWidth/2, y: mePt.y - window.innerHeight/2},
            {x: mePt.x + window.innerWidth/2, y: mePt.y - window.innerHeight/2},
            {x: mePt.x + window.innerWidth/2, y: mePt.y + window.innerHeight/2},
            {x: mePt.x - window.innerWidth/2, y: mePt.y + window.innerHeight/2}
        ],
        x: 0,
        y: 0
    }
    // polys.push(bb);
    for (let key in entities) {
        if (entities[key].data.data.type === "object"){// && !entities[key].data.id.includes('wall')) {
            polys.push(entities[key].data);
        } 
    }
    let allVertices = [];
    let allFaces = [];
    polys.forEach((e) => {
        let vWorld = e.vertices.map((pt) => {
            return {x: pt.x+e.x, y: pt.y+e.y}
        });
        allVertices = [...allVertices, ...vWorld];
        allFaces = [...allFaces, ...getFaces(vWorld)];
    });

    allVertices.forEach((v) => {
        let best = 1000000000000;
        let bestPt = null;
        let pt1 = mePt;
        let pt2 = mRotAbout(0.01, v, pt1);
        let vector = normalize({x: pt2.x-pt1.x, y: pt2.y-pt1.y});
        let pt2a = vAdd(pt1, vMul(vector, 10000));
        allFaces.forEach((face) => {
            let pt3 = face[0];
            let pt4 = face[1];
            let intersects = lineSegLineSegIntersect(pt1, pt2a, pt3, pt4);
            intersects.forEach((i) => {
                let dist = distSq(mePt, i);
                if (dist < best) {
                    best = dist;
                    bestPt = i;
                }
            })
        });
        if (bestPt) {
            bestPt.angle = Math.atan2(bestPt.y - pt1.y, bestPt.x - pt1.x);
            solutions.push(bestPt);
        }

        best = 1000000000000;
        bestPt = null;
        pt2 = mRotAbout(-0.01, v, pt1);
        vector = normalize({x: pt2.x-pt1.x, y: pt2.y-pt1.y});
        pt2a = vAdd(pt1, vMul(vector, 10000));
        allFaces.forEach((face) => {
            let pt3 = face[0];
            let pt4 = face[1];
            let intersects = lineSegLineSegIntersect(pt1, pt2a, pt3, pt4);
            intersects.forEach((i) => {
                let dist = distSq(mePt, i);
                if (dist < best) {
                    best = dist;
                    bestPt = i;
                }
            });
        });
        if (bestPt) {
            bestPt.angle = Math.atan2(bestPt.y - pt1.y, bestPt.x - pt1.x);
            solutions.push(bestPt);
        }
    });
    return solutions;
}

function getFaces(vertices) {
    let pairs = [];
    for (let i = 0; i < vertices.length; i++) {
      let v0 = vertices[i];
      let v1 = i === vertices.length-1? vertices[0]:vertices[i+1];
      pairs.push([v0, v1]);
    }
    return pairs;
}

function getLine(pt1, pt2) {
    let x1 = pt1.x;
    let y1 = pt1.y;
    let x2 = pt2.x;
    let y2 = pt2.y;
    if (x1 === x2) return {c: x1}
    let a = (y2 - y1) / (x2 - x1);
    return {a: a, b: y1 - a * x1};
}

function normalize(v, scale = 1) {
    let norm = Math.sqrt(v.x * v.x + v.y * v.y);
    if (norm !== 0) {
        v.x = scale * v.x / norm;
        v.y = scale * v.y / norm;
        return v;
    } else {
      return {x: 0, y: 0};
    }
}

function vAdd(v1, v2) {
    return {x: v1.x+v2.x, y: v1.y+v2.y}
}

function vMul(v, c) {
    return {x: v.x*c, y: v.y*c}
}

function lineSegLineSegIntersect(p1, p2, p3, p4) {
    let line1 = getLine(p1, p2);
    let line2 = getLine(p3, p4);
    let pts = [];

    let line1a = line1.a;
    let line1b = line1.b;
    let line1c = line1.c || -1;
    let line2a = line2.a;
    let line2b = line2.b;
    let line2c = line2.c || -1;
    // Co-linear p1, p2, p3, p4 are on the same line
    if ((!isUndefined(line1a) && line1a === line2a && line1b === line2b) || (line1c !== -1 && line1c === line2c)) {
      let distMap = {
        [distSq(p1, p2)]: [p1, p2],
        [distSq(p2, p3)]: [p2, p3],
        [distSq(p3, p4)]: [p3, p4],
        [distSq(p1, p3)]: [p1, p3],
        [distSq(p2, p4)]: [p2, p4],
        [distSq(p1, p4)]: [p1, p4]
      }
      let min = Math.min(...Object.keys(distMap));
      let max = Math.max(...Object.keys(distMap));
      if (distSq(p1, p2) + distSq(p3, p4) < max) {
        return [];
      }
      if (distMap[min]) {
        return distMap[min];
      } else {
        return [];
      }
    }
    if ('c' in line1) {
      pts = [{x: line1c, y: line2a*line1c+line2b}];
    } else if ('c' in line2) {
      pts = [{x: line2c, y: line1a*line2c+line1b}];
    } else {
      let X = (line2b-line1b)/(line1a-line2a);
      pts = [{x: X, y: line1a*X+line1b}];
    }

    return pts.filter((pt) => {
      return isInDomain(p1, p2, pt) && isInDomain(p3, p4, pt);
    });
}

function isUndefined(obj) {
    return typeof obj === 'undefined';
}

function distSq(bodyA, bodyB) {
    return Math.pow(bodyA.x - bodyB.x, 2) + Math.pow(bodyA.y - bodyB.y, 2);
}

function isInDomain(pt1, pt2, pt) {
    pt1 = vRound(pt1);
    pt2 = vRound(pt2);
    pt = vRound(pt);
    let xlo = Math.min(pt1.x, pt2.x);
    let xhi = Math.max(pt1.x, pt2.x);
    let ylo = Math.min(pt1.y, pt2.y);
    let yhi = Math.max(pt1.y, pt2.y);
    return pt.x >= xlo && pt.x <= xhi && pt.y >= ylo && pt.y <= yhi;
}

function mRotAbout(theta, v, pt) {
    let local = {x: v.x - pt.x, y: v.y - pt.y}
    let localRot = mRot(theta, local);
    return {x: localRot.x + pt.x, y: localRot.y + pt.y};
}

function mRot(theta, v) {
    let mat = [
        [Math.cos(theta), -Math.sin(theta)],
        [Math.sin(theta), Math.cos(theta)]
    ]
    return mMul(mat, v);
}

function mMul(mat, v) {
    return {
        x: mat[0][0]*v.x + mat[0][1]*v.y,
        y: mat[1][0]*v.x + mat[1][1]*v.y
    }
}


function sortPoints(points, p0) {
    points = points.splice(0);
    points.sort((a,b)=>a.angle - b.angle);
    return points;
};


function angleCompare(p0, a, b) {
    var left = isLeft(p0, a, b);
    if (left == 0) return distCompare(p0, a, b);
    return left;
}
function isLeft(p0, a, b) {
    return (a.x-p0.x)*(b.y-p0.y) - (a.y-p0.y)*(b.x-p0.x);
}
function distCompare(p0, a, b) {
    var distA = (p0.x-a.x)*(p0.x-a.x) + (p0.y-a.y)*(p0.y-a.y);
    var distB = (p0.x-b.x)*(p0.x-b.x) + (p0.y-b.y)*(p0.y-b.y);
    return distA - distB;
}

function isSamePt(A, B) {
    return A.x === B.x && A.y === B.y;
}

function vRound(v) {
    let vx = Math.round((v.x + Number.EPSILON) * 1000) / 1000;
    let vy = Math.round((v.y + Number.EPSILON) * 1000) / 1000;
    return {x: vx, y: vy}
}

function isTouchDevice() {
return (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0));
}