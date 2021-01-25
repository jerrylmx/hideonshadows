class ObjectBaseRender {
    constructor(data, scene, base) {
      this.data = data;
      let pts = [];
      data.vertices.forEach((pt) => {
        pts.push(pt.x + data.x);
        pts.push(pt.y + data.y);
      })
      let polygon = new Phaser.Geom.Polygon(pts);

      this.graphics = scene.add.graphics({ x: 0, y: 0 });

      this.graphics.lineStyle(10, 0xa83232, 0.9);
      this.graphics.fillStyle(0xa83232, 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(polygon.points[0].x, polygon.points[0].y);

      for (var i = 1; i < polygon.points.length; i++)
      {
        this.graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
      this.graphics.fillPath();


      this.body = scene.add.container(data.x, data.y);
      base.add([this.body, this.graphics]);
    }
  
    update(data) {
      this.body.x = data.x;
      this.body.y = data.y;
      this.data = data;
    }
  
    destroy() {
      this.graphics.destroy();
    }
  }