class PlayerBaseRender {
    constructor(data, scene, base, isMe) {
      this.data = data;
      this.isMe = isMe;
      this.scene = scene;
      this.body = scene.add.container(data.x, data.y);
      this.probeBody = scene.add.container(0, 0);

      let shadow = scene.add.sprite(0, 0, 'shadow');
      shadow.name = data.id + 'shadow';
      shadow.depth = 10;
      shadow.alpha = 0.2;
      shadow.setScale(0.51);


      this.probe = scene.add.sprite(0, 0, 'ufo');
      this.probe.name = data.id;
      this.probe.depth = 10;
      this.probe.setScale(0.5);
      this.probeBody.add([shadow, this.probe]);

      if (isMe) {
        this.arrow = scene.add.sprite(0, -100, 'arrow');
        this.arrow.name = data.id + 'arrow';
        this.arrow.depth = 10;
        this.arrow.alpha = 0.4;
        this.arrow.setScale(0.2);
        this.probeBody.add([this.arrow]);
      }

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
      let namePlate = scene.add.text(0, -50, data.data.name || "Guest", {
          fontFamily: '"Verdana"',
          strokeThickness: 1
      });
      namePlate.setAlpha(0.8);
      namePlate.setOrigin(0.5);
      let health1 = scene.add.rectangle(0, -35, 70, 10, 0x000000);
      this.health2 = scene.add.rectangle(0, -35, 70, 10, 0x00B403);

      emitter.startFollow(this.body);
      this.emitterAcc.startFollow(this.body);

      infoBody.add([namePlate, health1, this.health2]);
      this.body.add([this.probeBody, infoBody]);
      base.add([this.body, this.particles]);
    }
  
    update(data) {
      const lerpColor = function(a, b, amount) {
          const ar = a >> 16,
                ag = a >> 8 & 0xff,
                ab = a & 0xff,
      
                br = b >> 16,
                bg = b >> 8 & 0xff,
                bb = b & 0xff,
      
                rr = ar + amount * (br - ar),
                rg = ag + amount * (bg - ag),
                rb = ab + amount * (bb - ab);
    
          return (rr << 16) + (rg << 8) + (rb | 0);
      };

      this.body.x = data.x;
      this.body.y = data.y;


      this.health2.width = (data.data.health/data.data.healthFull)*70;
      this.health2.fillColor = lerpColor(0x990000, 0x00B403, data.data.health/data.data.healthFull);
      if (this.data.data.health > data.data.health) {
        this.scene.tweens.add({
          targets: this.body,
          alpha: 0.5,
          paused: false,
          yoyo: true,
          duration: 200,
          repeat: 5,
          scale: 1.1
        });
      }

      if (!this.data.data.boost1 && data.data.boost1) {
        let text = this.scene.add.text(this.body.x, this.body.y, "Enhanced Laser!", {
            fontFamily: '"Verdana"',
            fontSize: "24px",
            strokeThickness: 1
        });
        text.setAlpha(0.8);
        text.setOrigin(0.5);
        this.scene.baseContainer.add([text]);
        let tween = this.scene.tweens.add({
            targets: text,
            alpha: 0.5,
            paused: false,
            yoyo: true,
            duration: 300,
            scale: 1.2,
            repeat: 3,
            onComplete: function () {
              text.destroy();
            }
        });
      }

      if (!this.isMe) {
        this.probe.angle = data.data?.angle || 0;
      }
      if (data.data.jumping) {
        this.emitterAcc.visible = true;
      } else {
        this.emitterAcc.visible = false;
      }
      this.data = data;
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
          frame: 'blue',
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