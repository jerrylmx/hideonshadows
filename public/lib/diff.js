// Homemade diff tool for frame updates
class Diff {

  // Init the first frame
  constructor(frameInit) {
    this.frameOld = {};
    this.frameNew = frameInit;
  }

  refresh(frameNew) {
    this.frameOld = this.frameNew;
    this.frameNew = frameNew;
  }

  // Find reference diff between frames
  refDiff() {
    let res = {
      toAdd: [],
      toRemove: [],
      toUpdate: [],
    };
    Object.keys(this.frameNew).forEach((key) => {
        !this.frameOld[key] && res.toAdd.push(this.frameNew[key]);
        this.frameOld[key]  && res.toUpdate.push(this.frameNew[key]);
    });
    Object.keys(this.frameOld).forEach((key) => {
        !this.frameNew[key] && res.toRemove.push(this.frameOld[key]);
    });
    return res;
  }

  // Find deep value diff between frames
  valDiff(toUpdate) {
    let res = {};
    toUpdate.forEach((entity) => {
        res[entity.id] = {};
        Object.keys(entity).forEach((key) => {
            if (this.frameNew[entity.id][key] === undefined ||
                this.frameOld[entity.id][key] === undefined) {
                res[entity.id][key] = 0;
            } else {
                res[entity.id][key] = this.frameNew[entity.id][key] - this.frameOld[entity.id][key];
            }
        });
    });
    return res;
  }
}