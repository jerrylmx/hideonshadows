class PlayerBaseRender {
    constructor(data, scene, base, isMe) {
      this.data = data;
      this.isMe = isMe;
      this.body = scene.add.container(data.x, data.y);
      this.probe = scene.add.sprite(0, 0, 'ufo');
      this.probe.name = data.id;
      this.probe.depth = 1;
      this.probe.setScale(0.5);

      this.particles = scene.add.particles('flares');
      let emitter = this.particles.createEmitter({
          frame: 'yellow',
          lifespan: 300,
          speed: 20,
          scale: { start: 0.3, end: 0 },
          quantity: 2,
          blendMode: 'ADD'
      });

      this.emitterAcc = this.particles.createEmitter({
        frame: 'red',
        lifespan: 300,
        speed: 20,
        scale: { start: 0.3, end: 0 },
        quantity: 2,
        blendMode: 'ADD',
        visible: false
     });

      let infoBody = scene.add.container(0, 0);
      let namePlate = scene.add.text(0, -40, data.data.name || "Guest", {
          fontFamily: '"Verdana"',
          strokeThickness: 1
      });
      namePlate.setAlpha(0.8);
      namePlate.setOrigin(0.5);

      emitter.startFollow(this.body);
      this.emitterAcc.startFollow(this.body);

      infoBody.add(namePlate);
      this.body.add([this.probe, infoBody]);
      base.add([this.body, this.particles]);
    }
  
    update(data) {
      this.body.x = data.x;
      this.body.y = data.y;
      this.data = data;
      if (!this.isMe) {
        this.probe.angle = data.data?.angle || 0;
      }
      if (data.data.jumping) {
        this.emitterAcc.visible = true;
      } else {
        this.emitterAcc.visible = false;
      }
    }
  
    destroy(scene) {
      this.makeExplosionEffect(scene);
      this.body.destroy();
      this.particles.destroy();
    }

    makeHealthBarGraphics(scene) {
      let pts = [0, 0, 0, -10, 10, -10, 10, 0];
      let polygon = new Phaser.Geom.Polygon(pts);

      var graphics = scene.add.graphics({ x: 0, y: 0 });
      graphics.lineStyle(1, 0xa83232, 0.9);
      graphics.fillStyle(0xa83232, 0.8);
      graphics.beginPath();
      graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (var i = 1; i < polygon.points.length; i++)
      {
          graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      graphics.closePath();
      graphics.strokePath();
      graphics.fillPath();
      graphics.generateTexture("test");
      graphics.destroy();
    }

    makeExplosionEffect(scene) {
      let particles = scene.add.particles('flares');
      let emitter = particles.createEmitter({
          frame: 'red',
          lifespan: 2000,
          speed: 40,
          scale: { start: 0.3, end: 0 },
          quantity: 20,
          blendMode: 'ADD'
      });
      emitter.setPosition(this.data.x, this.data.y);
      emitter.explode();
    }
  }