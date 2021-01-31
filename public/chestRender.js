class ChestBaseRender {
    constructor(data, scene, base, isMe) {
      this.data = data;
      this.isMe = isMe;
      this.body = scene.add.container(data.x, data.y);
      this.chest = scene.add.sprite(0, 0, data.data.template || 'chest1');
      this.chest.depth = 1;
      this.chest.setScale(data.data.scale || 0.2)

      this.base = base;
      this.body.add([this.chest]);
      this.base.add([this.body]);

      data.data.consume && scene.tweens.add({
        targets: this.body,
        alpha: 0.5,
        paused: false,
        yoyo: true,
        duration: 500,
        repeat: -1
      });
    }
  
    update(data) {
      this.body.x = data.x;
      this.body.y = data.y;
      this.data = data;
    }
  
    destroy(scene) {
        this.body.destroy();
    }

  }