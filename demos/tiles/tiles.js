const backgroundClr = '000';
const resX = 4;
const resY = 4;
const lineNum = 2;
const gapThickness = 5;

let tiler;

class Tile extends Fresco.Collection {
  constructor(lineNumber = 2, gap = 0) {
    super();
    if (Math.floor(lineNumber) != lineNumber) {
      console.log('Don\'t be a moron!');
      return;
    }
    this.lineCombination = [];
    this.square = new Fresco.Square(100);
    if (gap == 0) {
      this.attach(this.square);
    }
    this.throughCenter = false;
    this.stopAtCenter = false;
    this.lines = [];
    this.name = '';
    
    for (let i = 0; i < lineNumber; i++) {
      let nuLine = this.generateLine(i == lineNumber - 1);
      if (nuLine == null) {
        break;
      }
      if (gap == 0) {
        this.attach(nuLine);
      }
      this.lines.push(nuLine);
    }

    let textShapes = Fresco.Futural.drawText(this.name, 4, createVector(0, -75), true, false);
    textShapes.forEach(s => {
      this.attach(s);
    })

    if (gap > 0) {
      this.cutShape(gap);
    }
  }
  
  generateLine(isLast){
    let startPoint;
    let endPoint;
    let unique = false;
    let combination = '';
    let revertCombination = '';
    let counter = 0;

    let bufferThroughCenter = this.throughCenter;
    let bufferStopAtCenter = this.stopAtCenter;

    while (!unique && counter < 10) {
      this.throughCenter = bufferThroughCenter;
      this.stopAtCenter = bufferStopAtCenter;
      counter++;
      combination = '';
      // Generate first point
      let isEdgeMiddle = random() < 0.5;
      let vtxIdx = randomInt(4);
      if (isEdgeMiddle) {
        startPoint = this.getEdgeMiddle(vtxIdx);
        combination += vtxIdx + 'e';
      }
      else {
        startPoint = this.square.vertices[vtxIdx].copy();
        combination += vtxIdx + 'a';
      }

      // Generate second point
      let vtxType = randomInt(2);
      let forceCenter = false;
      if (isLast && !this.throughCenter) {
        if (!this.stopAtCenter) {
          vtxType = randomInt(2);
        }
        else if (isEdgeMiddle) {
          // vtxType = randomSelect([0, 2]);
          vtxType = 0;
          forceCenter = true;
        }
        else {
          // vtxType = randomInt(1, 3);
          vtxType = 1;
          forceCenter = true;
        }
      }

      switch (vtxType) {
        // Edge Middle
        case 0:
          if (isEdgeMiddle) {
            let idx = (vtxIdx + randomInt(1, 4)) % 4;
            if (forceCenter) {
              idx = (vtxIdx + 2) % 4;
            }
            endPoint = this.getEdgeMiddle(idx);
            combination += idx + 'e';
            if (idx == (vtxIdx + 2) % 4) {
              this.throughCenter = true;
            }
          }
          else {
            let idx = (vtxIdx + randomInt(1, 3)) % 4;
            endPoint = this.getEdgeMiddle(idx);
            combination += idx + 'e';
          }
          break;

        // Angle
        case 1:
          if (isEdgeMiddle) {
            let idx = (vtxIdx + randomInt(2, 4)) % 4;
            endPoint = this.square.vertices[idx].copy();
            combination += idx + 'a';
          } 
          else {
            let idx = (vtxIdx + 2) % 4;
            endPoint = this.square.vertices[idx].copy();
            combination += idx + 'a';
            this.throughCenter = true;
          }
          break;

        // Square Center
        case 2:
          endPoint = createPoint(0, 0);
          combination += 0 + 'c';
          if (this.stopAtCenter) {
            this.throughCenter = true;
          }
          this.stopAtCenter = true;
          break;
        }

        revertCombination = combination.substring(2) + combination.substring(0, 2);
        unique = this.lineCombination.indexOf(combination) == -1 && this.lineCombination.indexOf(revertCombination) == -1;
    }
    if (unique) {
      this.lineCombination.push(combination, revertCombination);
      this.name += combination;
      return new Fresco.Line(startPoint, endPoint);
    }
    else {
      return null;
    }
  }

  getEdgeMiddle(vtxIdx) {
    return this.square.vertices[vtxIdx].copy().add(this.square.vertices[vtxIdx + 1]).mult(0.5);
  }

  offsetLine(line, gap) {
    let normals = line.computeNormals();
    let offset1 = normals[0].copy().mult(gap);
    let offset2 = normals[0].copy().mult(-gap);
    let vtx1 = [];
    let vtx2 = [];
    line.vertices.forEach(v => {
      vtx1.push(v.copy().add(offset1));
      vtx2.push(v.copy().add(offset2));
    })
    let line1 = new Fresco.Line(...vtx1);
    let line2 = new Fresco.Line(...vtx2);

    return [line1, line2];
  }

  lineCut(line, shape) {
    let centerCut = this.isCenterLine(line)

    let dir =  line.vertices[1].copy().sub(line.vertices[0]);
    let intersections = [];
    for (let i = 0; i < shape.vertices.length - 1; i++) {
      let inter = lineSegmentIntersection(line.vertices[0], dir, shape.vertices[i], shape.vertices[i + 1], true);
      // if there is an interesection which isn't the fist vertex of the edge (this avoids duplicate detections at vertices)
      if (inter.length > 0 && inter[1] > 0) {
        // If it is a center cut, the interesection is only valid if it is along the direction from the center to the edge.
        // Because the line always ends with the center, this means the interpolent must be negative
        if (!centerCut || inter[2] < 0) {
          intersections.push([inter[0], i]);
        }
      }
    }

    if (intersections.length == 0) {
      return [shape];
    }
    else {
      if (intersections.length > 2) {
        // remove duplicates that would correspond to an intersection at a vertex
      }
      if (intersections.length == 1) {
        return [shape]
      }

      // create 2 halves
      let firstHalfVtx = shape.vertices.slice(intersections[0][1] + 1, intersections[1][1] + 1);
      firstHalfVtx.push(intersections[1][0]);
      firstHalfVtx.push(intersections[0][0]);
      firstHalfVtx.push(firstHalfVtx[0]);
      let firstHalf = new Fresco.Shape(firstHalfVtx);

      let halfVtx = shape.vertices.slice(0, intersections[0][1] + 1);
      halfVtx.push(intersections[0][0]);
      halfVtx.push(intersections[1][0]);
      halfVtx.push(...shape.vertices.slice(intersections[1][1] + 1));
      let secondHalf = new Fresco.Shape(halfVtx);

      return [firstHalf, secondHalf];
    }
  }

  isCenterLine(line) {
    // because the line always ends with the center we only need to test the second vertex
    return line.vertices[1].x == 0 && line.vertices[1].y == 0;
  } 

  cutShape(gap) {
    this.square = subdivide(this.square, 1);
    let buffer = [this.square];

    // Sort lines such that those stopping at the center are at the end.
    // This way, granted we don't only have "center" lines, the intersection
    // with one such line can be delt with almost like a normal cut 
    let lineBuf = [];
    let allCentered = true;
    this.lines.forEach(l => {
      if (this.isCenterLine(l)) {
        lineBuf.push(l);
      }
      else {
        lineBuf.unshift(l);
        allCentered = false;
      }
    })

    // if all centered, we must deal with the first 2 lines manually
    if (allCentered) {
      let line1 = lineBuf.pop();
      let line2 = lineBuf.pop();

      let inter1 = -1;
      let inter2 = -1;
      for (let i = 0; i < this.square.vertices.length; i++) {
        if (this.square.vertices[i].x == line1.vertices[0].x && this.square.vertices[i].y == line1.vertices[0].y) {
          inter1 = i;
        }
        if (this.square.vertices[i].x == line2.vertices[0].x && this.square.vertices[i].y == line2.vertices[0].y) {
          inter2 = i;
        }
        if (inter1 > 0 && inter2 > 0) {
          break;
        }
      }

      let point1;
      let point2;
      if (inter1 < inter2) {
        point1 = line1.vertices[0];
        point2 = line2.vertices[0];
      }
      else {
        point1 = line2.vertices[0];
        point2 = line1.vertices[0];
      }

      // let theta = point1.angleBetween()(point2);

      let half1Vtx = this.square.vertices.slice(0, Math.min(inter1, inter2) + 1);
      let idx1 = half1Vtx.length - 1;
      let zeroIdx = half1Vtx.length;
      half1Vtx.push(createPoint(0, 0));
      half1Vtx.push(...this.square.vertices.slice(Math.max(inter1, inter2)));

      // offset vertices around center
      idx1 = (idx1 + half1Vtx.length) % half1Vtx.length;
      let idx12 = (idx1 - 1 + half1Vtx.length) % half1Vtx.length;
      let dir1 = half1Vtx[idx1].copy().sub(half1Vtx[idx12]).normalize().mult(-gap);
      half1Vtx[idx1] = half1Vtx[idx1].copy().add(dir1);

      idx1 = (idx1 + 2) % half1Vtx.length;
      idx12 = (idx1 + 1) % half1Vtx.length;
      dir1 = half1Vtx[idx12].copy().sub(half1Vtx[idx1]).normalize().mult(gap);
      half1Vtx[idx1] = half1Vtx[idx1].copy().add(dir1);

      half1Vtx[zeroIdx].add();
      
      let half1 = new Fresco.Shape(half1Vtx);

      let half2Vtx = this.square.vertices.slice(Math.min(inter1, inter2), Math.max(inter1, inter2) + 1);
      let idx2 = half2Vtx.length - 1;
      half2Vtx.push(createPoint(0, 0));
      
      // offset vertices around center
      let idx22 = (idx2 - 1) % half2Vtx.length;
      let dir2 = half2Vtx[idx2].copy().sub(half2Vtx[idx22]).normalize().mult(-gap);
      half2Vtx[idx2] = half2Vtx[idx2].copy().add(dir2);
      
      idx2 = 0;
      idx22 = 1;
      dir2 = half2Vtx[idx22].copy().sub(half2Vtx[idx2]).normalize().mult(gap);
      half2Vtx[idx2] = half2Vtx[idx2].copy().add(dir2);
      
      let dir3 = point1.copy().add(point2.copy()).normalize().mult(0.5 * gap);
      half1Vtx[zeroIdx].add(dir3);
      half2Vtx[half2Vtx.length - 1].add(dir3.mult(-1));

      half2Vtx.push(half2Vtx[0]);
      
      let half2 = new Fresco.Shape(half2Vtx);
      buffer = [half1, half2];
    }
    lineBuf.forEach(l => {
      let [line1, line2] = this.offsetLine(l, gap); 
      let newBuffer = [];
      buffer.forEach(s => {
        newBuffer.push(...this.lineCut(line1, s));
      });

      let newNewBuffer = [];
      newBuffer.forEach(s => {
        s.isPolygonal = true;
        newNewBuffer.push(...this.lineCut(line2, s));
      });

      buffer = [];
      newNewBuffer.forEach(s => {
        let throwAway = false;
        for (let i = 0; i < s.vertices.length; i++) {
          for (let j = 0; j < 2; j++) {
            if (s.vertices[i].x == l.vertices[j].x && s.vertices[i].y == l.vertices[j].y) {
              throwAway = true;
              break;
            }
          }
          if (throwAway) {
            break;
          }
        }
        if (!throwAway) {
          buffer.push(s);
        }
      })
    });

    // attach all shapes
    buffer.forEach(s => {
      s.isPolygonal = true;
      this.attach(s);
    });
  }
}

class Tiler {
  constructor(tileClass, num_x, num_y, margin_x, margin_y, classParams) {
    this.tiles = [];
    let incX = (width - 2 * margin_x) / num_x;
    let incY = (height - 2 * margin_y) / num_y;
    let X = -width / 2 + margin_x + incX / 2;
    for (let i = 0; i < num_x; i++) {
      let Y = -height / 2 + margin_y + incY / 2;
      for (let j = 0; j < num_y; j++) {
        let nuTile = new tileClass(...classParams);
        nuTile.setPosition(createVector(X, Y));
        this.tiles.push(nuTile);
        Y += incY;
      }
      X += incX;
    }
  }

  draw() {
    this.tiles.forEach(t => t.draw());
  }
}

function setup() {
  createSVGCanvas(1000, 1000);
  background(colorFromHex(backgroundClr));
  setSeed(8062);
  loadFonts();

  Fresco.Futural.fontSpacing = 4;

  tiler = new Tiler(Tile, resX, resY, 0, 0, [lineNum, gapThickness]);
  // tiler = new Tile(lineNum, gapThickness);
}

// draw function which is automatically 
// called in a loop
function draw() {
  tiler.draw();
  noLoop();
}