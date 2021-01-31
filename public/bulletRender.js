class BulletBaseRender {
    constructor(data, scene, base, isMe) {
      this.data = data;
      this.isMe = isMe;
      this.body = scene.add.container(data.x, data.y);
      this.bullet = scene.add.sprite(0, 0, data.data.boost? 'bullet3' : 'bullet2');
      this.bullet.setOrigin(0.5);
      this.bullet.depth = 1;
      this.bullet.setScale(1);
      this.bullet.setAngle(data.data.angle);

      //emitter.startFollow(this.body);
      this.base = base;


      if (data.data.boost) {
        this.bullet.setScale(1, 1.5);
      }

      this.body.add([this.bullet]);
      base.add([this.body]);

      let particles = scene.add.particles('flares');
      let emitter = particles.createEmitter({
          frame: 'blue',
          lifespan: 300,
          scale: { start: 0.2, end: 0 },
          quantity: 10,
          blendMode: 'ADD'
      });
      emitter.setPosition(this.data.x, this.data.y);
      this.base.add([particles]);
      emitter.explode();
    }
  
    update(data) {
      this.body.x = data.x;
      this.body.y = data.y;
      this.data = data;
    }
  
    destroy(scene) {
      this.makeExplosionEffect(scene);
      this.body.destroy();
    }

    makeExplosionEffect(scene) {
      let particles = scene.add.particles('flares');
      let emitter = particles.createEmitter({
          frame: 'blue',
          lifespan: 300,
          speed: 200,
          scale: { start: 0.2, end: 0 },
          quantity: 10,
          blendMode: 'ADD'
      });
      emitter.setPosition(this.data.x, this.data.y);
      this.base.add([particles]);
      emitter.explode();
    }
  }