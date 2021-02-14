// Homemade frame interpolation helper
class FrameManager {
    constructor(config = {}) {
        // Server rate
        this.rate = config.rate || 50;
  
        // Circular frame queue
        this.queue = [];
  
        // Queue size. Longer queue means more stability but also more latency
        this.capacity = 2;
  
        // Next slot
        this.top = 0;
  
        // Filled to capacity or not
        this.ready = false;
  
        this.enabled = true;
        this.currentFrame = null;

        setInterval(() => {
            if (this.ready && this.queue.length >= 3) {
                this.queue.shift();  
            }
        }, this.rate);
    }
  
    push(data) {
      // Real frame from server
      let frame = {
          time: new Date().getTime(), // Frame timestamp
          payload: data
      };
      this.currentFrame = frame;

      this.queue.push(frame);
      if (this.queue.length >= 3) {
        this.ready = true;
      }
    }
  
    // x1, x2, . . ., xnew
    pop() {
      let x2 = this.queue[1];
      let x1 = this.queue[0];
  
      let res = {...x1.payload};
      if (!this.enabled) return res;
      for (let i = 0; i < Object.keys(x2.payload).length; i++) {
          let key = Object.keys(x2.payload)[i];
          let ref1 = x2.payload[key];
          let ref0 = x1.payload[key];
  
          // No interpolation on non-spacial, or new objects
          if (!ref1 || !ref1.x || !ref1.y || !ref0 || !ref0.x || !ref0.y) {
              continue;
          } else {
              let gap = this.rate;
              let r = (new Date().getTime() - this.currentFrame.time) / gap;
              let dx = ref1.x - ref0.x;
              let dy = ref1.y - ref0.y;
              let da = ref1.data.angle - ref0.data.angle;
              res[key].x = ref0.x + dx * r;
              res[key].y = ref0.y + dy * r;
              res[key].data.angle = res[key].data.angle + da * r;
          }
      }
      return res;
    }
  }
  
  function clone(obj) {
    if (obj == null || typeof (obj) != 'object')
        return obj;
    var temp = new obj.constructor();
    for (var key in obj)
        temp[key] = clone(obj[key]);
    return temp;
  }
  
  