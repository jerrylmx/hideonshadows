// Homemade frame interpolation helper
class FrameManager {
  constructor(config = {}) {
      // Server rate
      this.rate = config.rate || 50;

      // Circular frame queue
      this.queue = [];

      // Queue size. Longer queue means more stability but also more latency
      this.capacity = 4;

      // Next slot
      this.top = 0;

      // Filled to capacity or not
      this.ready = false;

      this.enabled = true;
      this.currentFrame = null;
  }

  push(data) {
    // Real frame from server
    let frame = {
        time: new Date().getTime(), // Frame timestamp
        payload: data
    };
    this.currentFrame = frame;

    // Filling stage
    if (this.queue.length < this.capacity) {
        this.queue.push(frame);
        this.top++;
        return;
    } else {
      this.ready = true;
    }

    this.top = this.top % this.capacity;
    this.queue[this.top] = frame;
    this.top++;
  }

  // x1, x2, . . ., xnew, x1
  pop() {
    let xnew = this.queue[(this.top - 1 + this.capacity) % this.capacity];
    let x2 = this.queue[(this.top + 1) % this.capacity];
    let x1 = this.queue[(this.top + 0) % this.capacity];

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
            let r = (new Date().getTime() - xnew.time) / gap;
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

