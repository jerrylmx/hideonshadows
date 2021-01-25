class BulletBaseRender {
    constructor(data, scene, base, isMe) {
      this.data = data;
      this.isMe = isMe;
      this.body = scene.add.container(data.x, data.y);
      this.bullet = scene.add.sprite(0, 0, 'bullet');
      this.bullet.depth = 1;
      this.bullet.setScale(0.5);
      this.bullet.setAngle(data.data.angle);

      //emitter.startFollow(this.body);
      this.body.add([this.bullet]);
      base.add([this.body]);
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
          frame: 'red',
          lifespan: 300,
          speed: 200,
          scale: { start: 0.2, end: 0 },
          quantity: 10,
          blendMode: 'ADD'
      });
      emitter.setPosition(this.data.x, this.data.y);
      emitter.explode();
    }
  }