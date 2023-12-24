'use strict';

const BLOCK_SIZE = 55;
const MAX_ZOOM = 2.5
const MIN_ZOOM = 0.5

const canvas = document.getElementById('playground');
const context = canvas.getContext('2d');

let projectModules = [];

const Tools = {
  Select: 0,
  Move: 1,
}

let currentTool = Tools.Select;
let isDragging = false;
let dragCoords = [0, 0]
let scale = 1;
let cameraOffset = { x: 0, y: 0 };
let lastMouseCoords = { x: 0, y: 0 };
const history = [];
const HistoryType = {
  Delete: 0,
  Create: 1,
  Move: 2,
  Rotate: 3,
}

let selectCoords = [[-1, -1], [-1, -1]];

const generateId = () => `id${Math.random().toString(16).slice(2)}`

const setGradient = (ctx, x1, y1, x2, y2, colors) => {
  const fillGradient = ctx.createLinearGradient(x1, y1, x2, y2);
  for (let i = 0; i < colors.length; i++) {
    fillGradient.addColorStop(i / (colors.length - 1), colors[i]);
  }
  return fillGradient
}

class Module {
  constructor(x, y) {
    this.id = generateId()
    this.x = x;
    this.y = y;
    this.hovered = false;
    this.active = false;
    this.selected = false;
    this.mouseOffset = { x: 0, y: 0 };
    this._x = this.xPx;
    this._y = this.yPx;
  }

  get offset() {
    return this.hovered ? 1 : this.active ? 2 : 0;
  }

  get width() {
    return BLOCK_SIZE + this.offset;
  }

  get height() {
    return BLOCK_SIZE + this.offset;
  }

  get xPx() {
    const x = this.active ? this._x : this.x * BLOCK_SIZE;
    return (x - this.offset / 2);
  }

  get yPx() {
    const y = this.active ? this._y : this.y * BLOCK_SIZE;
    return (y - this.offset / 2);
  }

  activate() {
    this.active = !this.active;
  }

  hover() {
    this.hovered = !this.hovered;
  }

  drawSelectedBox(ctx) {
    ctx.strokeStyle = "#0028B6"
    ctx.lineWidth = 3;
    ctx.strokeRect(this.xPx, this.yPx, this.width, this.height);
  }

  _draw(ctx) {
    this.draw(ctx);
    if (this.selected) this.drawSelectedBox(ctx)
  }

  draw() {
    throw new Error("Funktion fuers Zeichnen fehlt")
  }

  setGradient(ctx, colors) {
    return setGradient(ctx, this.xPx, this.yPx, this.xPx, this.yPx + this.height, colors);
  }

  drawOutputLight(ctx, output, index = 0) {
    if (!output) return
    const [x, y] = [this.xPx + this.width, this.yPx + index * BLOCK_SIZE]
    const lightGradient = setGradient(ctx, x, y, x, y + BLOCK_SIZE, ["#F8B50A", "#FEE709", "#F8B50A"]);
    ctx.fillStyle = lightGradient

    ctx.beginPath();
    ctx.moveTo(x + 1, y + 18)
    ctx.lineTo(x + 28, y + 15);
    ctx.lineTo(x + 28, y + 40)
    ctx.lineTo(x + 1, y + 35)
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7E5B00";
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }
}

const getOutput = (x, y) => {
  const block = getBlock(x, y);
  if (!block) return false;
  return block.output;
}

class BausteinBlock {
  constructor(party, index) {
    this.party = party;
    this.index = index;
  }

  get id() {
    return this.party.id;
  }

  get input() {
    return getOutput(this.party.x - 1, this.party.y + this.index)
  }

  get output() {
    throw new Error("No output logic added")
  }

  get x() {
    return this.party.x;
  }

  get y() {
    return this.party.y + this.index;
  }

  drawInputIndicator(ctx) {
    ctx.fillStyle = this.input ? "#F8B50A" : "#333";
    ctx.beginPath();
    const [x, y] = [this.party.xPx, this.party.yPx + this.index * BLOCK_SIZE + 0.5 * BLOCK_SIZE]
    ctx.arc(x, y, 12.5, Math.PI / 2, 1.5 * Math.PI, true);
    ctx.lineTo(x, y)
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }

  draw(ctx) {
    this.drawInputIndicator(ctx);
    this.drawOutputLight(ctx)
  }

  drawOutputLight(ctx) {
    const nextBlock = getBlock(this.party.x + 1, this.party.y + this.index);
    if (!nextBlock) this.party.drawOutputLight(ctx, this.output, this.index)
  }
}

class BausteinParty extends Module {
  constructor(x, y, bausteinClass) {
    super(x, y);
    this.blocks = [new bausteinClass(this, 0), new bausteinClass(this, 1)];
    this.gradientColors = ["#888", "#ff0000"]
  }

  get height() {
    return 2 * BLOCK_SIZE + this.offset;
  }

  draw(ctx) {
    this.fill(ctx);
    this.stroke(ctx);
    for (const block of this.blocks) block.draw(ctx);
  }

  stroke(ctx) {
    ctx.strokeStyle = "#000"
    ctx.lineWidth = this.hovered ? 2 : 1;
    ctx.strokeRect(this.xPx, this.yPx, this.width, this.height);
  }

  fill(ctx) {
    const gradient = this.setGradient(ctx, this.gradientColors);
    ctx.fillStyle = gradient;
    ctx.shadowColor = `rgba(0, 0, 0, ${this.active ? "0.8" : "0.3"})`;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = this.active ? 0 : 5;
    ctx.fillRect(this.xPx, this.yPx, this.width, this.height);
    ctx.shadowColor = "transparent";
  }
}

const getFontSize = (ctx, text, maxHeight, maxWidth) => {
  ctx.font = `bold ${maxHeight}px Arial`;
  const { width } = ctx.measureText(text);
  if (width > maxWidth) maxHeight -= 1;
  else return maxHeight;
  return getFontSize(ctx, text, maxHeight, maxWidth)
}

class LichtEmpfaenger extends Module {
  constructor(x, y) {
    super(x, y);
    this.caption = "L";
  }

  get input() {
    return getOutput(this.x - 1, this.y);
  }

  getDrawCoords(ctx, fontSize) {
    const _oldFont = ctx.font
    ctx.font = `bold ${fontSize}px Arial`
    const { width } = ctx.measureText(this.caption);
    const x = (BLOCK_SIZE - width) / 2;
    // TODO: Magic NUmber
    const y = (BLOCK_SIZE + fontSize) / 2.2
    ctx.font = _oldFont
    return [x + this.xPx, y + this.yPx]
  }

  draw(ctx) {
    const fontSize = getFontSize(ctx, this.caption, 30, BLOCK_SIZE)
    ctx.font = `bold ${fontSize}px Arial`
    ctx.fillStyle = this.input ? "#ADFF00" : "#FF0000";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    const [x, y] = this.getDrawCoords(ctx, fontSize)
    ctx.fillText(this.caption, x, y)
    ctx.strokeText(this.caption, x, y)
  }
}

class Quelle extends Module {
  constructor(x, y) {
    super(x, y);
    this.output = false;
    this.caption = "Q";
  }

  getSquareGradient(ctx) {
    return this.setGradient(ctx, ["#D9EFFD", "#fff", "#D9EFFD"]);
  }

  getTrapezGradient(ctx) {
    return this.setGradient(ctx, ["#9DD1F8", "#fff", "#9DD1F8"]);
  }

  toggle() {
    this.output = !this.output;
  }

  draw(ctx) {
    const { xPx, yPx } = this

    const nextBlock = getBlock(this.x + 1, this.y);
    if (!nextBlock) this.drawOutputLight(ctx, this.output);

    ctx.beginPath();

    ctx.fillStyle = `rgba(0, 0, 0, ${this.hovered ? 1 : 0.5})`
    ctx.font = "10px Arial";
    ctx.fillText(this.caption, xPx + 1, yPx + 10)


    ctx.fillStyle = this.getSquareGradient(ctx);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.rect(xPx, yPx + 13.5, 27, 27);
    ctx.fill();
    ctx.stroke();

    ctx.moveTo(xPx + 27, yPx + 13.5);
    ctx.lineTo(xPx + 55, yPx + 6);
    ctx.lineTo(xPx + 55, yPx + 48);
    ctx.lineTo(xPx + 27, yPx + 40);
    ctx.closePath();
    ctx.fillStyle = this.getTrapezGradient(ctx);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 11px Arial";
    ctx.fillStyle = this.output ? "#ADFF00" : "#FF0000";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    const text = this.output ? "EIN" : "AUS"
    ctx.strokeText(text, xPx + 2, yPx + 30, 25)
    ctx.fillText(text, xPx + 1, yPx + 30, 25);
  }
}

const getBlock = (x, y) => {
  const flatModules = projectModules.flatMap(m => m instanceof BausteinParty ? m.blocks : m)
  const block = flatModules.find(m => m.x === x && m.y === y);
  return block
}


class BlauBausteinBlock extends BausteinBlock {
  get output() {
    return this.input;
  }
}

class BlauBausteinParty extends BausteinParty {
  constructor(x, y) {
    super(x, y, BlauBausteinBlock);
    this.gradientColors = ["#128FDE", "#CFE2FF", "#128FDE"];
  }
}

class WeissBausteinBlock extends BausteinBlock {
  get output() {
    return !(this.party.blocks[0].input && this.party.blocks[1].input);
  }
}

class WeissBausteinParty extends BausteinParty {
  constructor(x, y) {
    super(x, y, WeissBausteinBlock);
    this.gradientColors = ["#D9D9D9", "#fff", "#D9D9D9"];
  }
}

class RotBausteinBlock extends BausteinBlock {
  draw(ctx) {
    super.draw(ctx);
  }

  get isEnabled() {
    return this.party.sensorPosition === this.index
  }

  get output() {
    if (!this.isEnabled) return this.party.blocks[this.index === 1 ? 0 : 1].output
    return !this.input;
  }

  draw(ctx) {
    if (this.isEnabled) this.drawInputIndicator(ctx)
    this.drawOutputLight(ctx)
  }
}

class RotBausteinParty extends BausteinParty {
  constructor(x, y, sensorPosition) {
    super(x, y, RotBausteinBlock);
    this.gradientColors = ["#DA0011", "#FFBB55", "#DA0011"];
    this.sensorPosition = sensorPosition;
  }

  toggle() {
    this.sensorPosition = this.sensorPosition === 0 ? 1 : 0;
  }
}

const drawLine = (ctx, x1, y1, x2, y2) => {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.stroke();
}

const getNearestTeiler = (a, b) => a - (a % b);

const drawCoordinates = (ctx) => {
  ctx.lineWidth = 0.3;
  ctx.strokeStyle = "lightgray"

  const canvasWidth = (canvas.width / scale)
  const canvasHeight = (canvas.height / scale)

  const x1 = -(cameraOffset.x / scale);
  const x2 = (canvasWidth + x1);
  const y1 = -(cameraOffset.y / scale)
  const y2 = (canvasHeight + y1)

  for (let i = getNearestTeiler(x1, BLOCK_SIZE); i < x2; i += BLOCK_SIZE) {
    drawLine(ctx, i, y1, i, y2);
  }

  for (let i = getNearestTeiler(y1, BLOCK_SIZE); i < y2; i += BLOCK_SIZE) {
    drawLine(ctx, x1, i, x2, i);
  }
}

drawCoordinates(context);

const drawSelectBox = (ctx) => {
  ctx.fillStyle = 'rgba(0, 160, 250, 0.2)';
  ctx.strokeStyle = "#0085FF";
  ctx.lineWidth = 1;

  const [x1, y1, x2, y2] = selectCoords.flat();
  const x = x1 < x2 ? x1 : x2;
  const y = y1 < y2 ? y1 : y2;
  const w = Math.abs(x1 - x2)
  const h = Math.abs(y1 - y2);

  ctx.beginPath()
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke()
  ctx.closePath();
}

const getUnscaledMouse = (canvas, e) => {
  const { left, top } = canvas.getBoundingClientRect();
  return { x: e.clientX - left, y: e.clientY - top }
}

const getMouseOnCanvas = (canvas, e) => {
  const { x, y } = getUnscaledMouse(canvas, e)
  return { x: (x - cameraOffset.x) / scale, y: (y - cameraOffset.y) / scale }
}

const getOffsetCoords = (mouse, rect) => {
  return {
    x: mouse.x - rect.xPx,
    y: mouse.y - rect.yPx
  }
}

const isRectIntersect = (rec1, rec2) => (rec1[0] < rec2[2] && rec1[2] > rec2[0] && rec1[1] < rec2[3] && rec1[3] > rec2[1])

const getSelectedRectangle = (coords) => {
  let [x1, y1, x2, y2] = coords.flat();
  if (x1 > x2) [x1, x2] = [x2, x1];
  if (y1 > y2) [y1, y2] = [y2, y1];
  return [x1, y1, x2, y2]
}

const isModuleIntersect = (module, rec1) => {
  const rec2 = [module.xPx, module.yPx, module.xPx + module.width, module.yPx + module.height]
  return isRectIntersect(rec1, rec2);
}

const findHoveredModules = () => {
  const rec1 = getSelectedRectangle(selectCoords);
  const intersect = projectModules.filter(m => isModuleIntersect(m, rec1))
  return intersect
}

const findHoveredModule = (x, y) => {
  for (const module of projectModules) {
    const istInnerhalbX = x > module.xPx && x < module.xPx + module.width;
    const istInnerhalbY = y > module.yPx && y < module.yPx + module.height;
    if (istInnerhalbX && istInnerhalbY) return module;
    if (module.hovered) module.hover();
  }
  return null;
}

const blockClasses = {
  Q: Quelle,
  W: WeissBausteinParty,
  B: BlauBausteinParty,
  R: RotBausteinParty,
  L: LichtEmpfaenger
}

const isLowerCase = (str) => str === str.toLowerCase()

const getMiddleCoords = (canvas) => {
  const x = Math.round(canvas.width / BLOCK_SIZE / 2)
  const y = Math.round(canvas.height / BLOCK_SIZE / 2);
  return [x - 1, y - 1];
}

const importText = (input, middleCoordinates) => {
  projectModules = [];
  const splittedInput = input.split('\n').map(e => e.split(/ +/g))
  const [n, m] = splittedInput.shift().map(e => +e);
  const startX = Math.round(middleCoordinates[0] - m / 2);
  const startY = Math.round(middleCoordinates[1] - n / 2)
  for (let x = 0; x < m; x++) {
    for (let y = 0; y < n; y++) {
      const blockCaption = splittedInput[x][y]
      const [blockType] = blockCaption
      if (blockType === 'X') continue;
      const lichtSensorPosition = isLowerCase(blockType) ? 1 : 0;
      const module = new blockClasses[blockType[0].toUpperCase()](startX + x, startY + y, lichtSensorPosition)
      if (module instanceof Quelle || module instanceof LichtEmpfaenger) module.caption = blockCaption;
      else y += 1
      projectModules.push(module)
    }
  }
}

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});


canvas.addEventListener('dblclick', e => {
  const mouse = getMouseOnCanvas(canvas, e);
  const hoveredModule = findHoveredModule(mouse.x, mouse.y)

  if (currentTool === Tools.Select) {
    if (hoveredModule instanceof Quelle) {
      hoveredModule.toggle()
    } else if (hoveredModule instanceof RotBausteinParty) {
      hoveredModule.toggle();
    }
  }

})

canvas.addEventListener('mousemove', e => {
  const mouse = getMouseOnCanvas(canvas, e);
  const unscaledMouse = getUnscaledMouse(canvas, e)
  lastMouseCoords.x = unscaledMouse.x
  lastMouseCoords.y = unscaledMouse.y

  if (currentTool === Tools.Select) {
    if (selectCoords[0][0] !== -1) {
      selectCoords[1][0] = mouse.x;
      selectCoords[1][1] = mouse.y;
      return;
    }

    const activeModules = projectModules.filter(m => m.active)
    if (activeModules.length > 0) {
      for (const module of activeModules) {
        module._x = mouse.x - module.mouseOffset.x;
        module._y = mouse.y - module.mouseOffset.y;
      }
    }

    const hoveredModule = findHoveredModule(mouse.x, mouse.y);
    if (hoveredModule && !hoveredModule.hovered) {
      canvas.classList.add('pointer');
      hoveredModule.hover();
    } else if (!hoveredModule) {
      canvas.classList.remove('pointer');
    }
  } else if (currentTool === Tools.Move) {
    if (isDragging) {
      const [dragStartX, dragStartY] = dragCoords
      const [deltaX, deltaY] = [unscaledMouse.x - dragStartX, unscaledMouse.y - dragStartY];
      cameraOffset.x += deltaX
      cameraOffset.y += deltaY
      dragCoords = [unscaledMouse.x, unscaledMouse.y];
    }
  }

});

const unselectModules = () => {
  for (const module of projectModules) {
    module.selected = false;
  }
}

const closeContextMenu = () => {
  const contextMenu = document.getElementById('contextMenu')
  contextMenu.style.display = 'none'
}

window.createElement = (type) => {
  closeContextMenu();
  const contextMenu = document.getElementById('contextMenu')
  const x = +contextMenu.style.left.split('px')[0]
  const y = +contextMenu.style.top.split('px')[0]


  const Elements = {
    rot: (x, y) => new RotBausteinParty(x, y, 0),
    weiss: (x, y) => new WeissBausteinParty(x, y),
    blau: (x, y) => new BlauBausteinParty(x, y),
    lq: (x, y) => new Quelle(x, y),
    le: (x, y) => new LichtEmpfaenger(x, y)
  }
  const element = Elements[type](Math.round(x / BLOCK_SIZE), Math.round(y / BLOCK_SIZE));
  projectModules.push(element)
}

canvas.addEventListener('mousedown', e => {
  const mouse = getMouseOnCanvas(canvas, e);
  const hoveredModule = findHoveredModule(mouse.x, mouse.y);

  closeContextMenu()

  const unscaledMouse = getUnscaledMouse(canvas, e)
  lastMouseCoords = unscaledMouse

  if (currentTool === Tools.Select) {
    const selectedModules = projectModules.filter(m => m.selected);
    if (selectedModules.length > 0 && selectedModules.find(m => m.id === hoveredModule?.id)) {
      for (const module of selectedModules) {
        module.active = true;
        module.mouseOffset = getOffsetCoords(mouse, module);
      }
    } else {
      unselectModules()
    };

    if (hoveredModule) {
      hoveredModule.active = true
      hoveredModule.mouseOffset = getOffsetCoords(mouse, hoveredModule)
    } else {
      if (e.button === 2) {
        const contextMenu = document.getElementById('contextMenu');
        contextMenu.style.display = 'flex';
        contextMenu.style.left = `${mouse.x}px`;
        contextMenu.style.top = `${mouse.y}px`;
      } else {
        selectCoords = [[mouse.x, mouse.y], [mouse.x, mouse.y]]
      }
    }
  } else if (currentTool === Tools.Move) {
    isDragging = true;
    canvas.classList.remove('grab')
    canvas.classList.add('grabbing')
    dragCoords = [unscaledMouse.x, unscaledMouse.y];
  }
})

const getSelectedBoxCoords = () => {
  const selectedModules = projectModules.filter(m => m.selected)
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const module of selectedModules) {
    if (module.xPx < x1) x1 = module.xPx
    if (module.yPx < y1) y1 = module.yPx
    if (module.xPx + module.width > x2) x2 = module.xPx + module.width
    if (module.yPx + module.height > y2) y2 = module.yPx + module.height
  }
  const [w, h] = [x2 - x1, y2 - y1]
  return [x1, y1, w, h]
}

const drawSelectedBox = (ctx) => {
  ctx.strokeStyle = "#0085FF";
  ctx.lineWidth = 2;
  const [x, y, w, h] = getSelectedBoxCoords()
  ctx.strokeRect(x - 4, y - 4, w + 8, h + 8)
}

canvas.addEventListener('mouseup', (e) => {
  if (currentTool === Tools.Select) {
    if (selectCoords[0][0] !== -1) {
      const hoveredModules = findHoveredModules()
      if (hoveredModules.length > 0) {
        for (const module of hoveredModules) module.selected = true;
      }
      selectCoords[0] = [-1, -1]
      selectCoords[1] = [-1, -1]
    }

    const activeModules = projectModules.filter(m => m.active)
    if (activeModules.length > 0) {
      const newModulePlaces = []
      for (const module of activeModules) {
        const [newX, newY] = [Math.round(module._x / BLOCK_SIZE), Math.round(module._y / BLOCK_SIZE)]
        if (canPlaceNewObject(module, activeModules, newX, newY)) {
          newModulePlaces.push([module, newX, newY])
        }
        module.active = false;
        module._x = module.xPx;
        module._y = module.yPx;
      }
      if (newModulePlaces.length === activeModules.length) {
        for (const [module, x, y] of newModulePlaces) {
          module.x = x;
          module.y = y;
          module._x = module.xPx;
          module._y = module.yPx;
        }
      }
    }
  } else if (currentTool === Tools.Move) {
    isDragging = false;
    canvas.classList.remove('grabbing')
    canvas.classList.add('grab')
  }
})

const adjustZoom = ({ faktor, summand }) => {
  if (!faktor) faktor = 1;
  if (!summand) summand = 0
  scale = Math.max(Math.min(scale * faktor + summand, MAX_ZOOM), MIN_ZOOM);
  if (scale < MAX_ZOOM && scale > MIN_ZOOM) {
    cameraOffset.x = (cameraOffset.x - lastMouseCoords.x) * faktor + lastMouseCoords.x
    cameraOffset.y = (cameraOffset.y - lastMouseCoords.y) * faktor + lastMouseCoords.y
  }
}

const deleteModules = (modules) => {
  history.push({ type: HistoryType.Delete, modules })
  projectModules = projectModules.filter(m => !modules.find(j => j.id === m.id))
  for (const module of modules) projectModules.delete(module.id)
}

document.body.addEventListener('keydown', e => {
  const isControl = (e.metaKey || e.ctrlKey)
  if (e.code === "KeyH" || e.code === "KeyM") {
    e.preventDefault()
    selectCoords[0] = [-1, -1]
    selectCoords[1] = [-1, -1]
    currentTool = Tools.Move;
    canvas.classList.add('grab');
  } else if (e.code === "KeyV") {
    e.preventDefault()
    currentTool = Tools.Select
    canvas.classList.remove("grab", "grabbing")
  } else if ((e.code === 'Equal' || e.key === '+') && isControl) {
    e.preventDefault()
    adjustZoom({ summand: 0.2 })
  } else if ((e.key === '-') && isControl) {
    e.preventDefault()
    adjustZoom({ summand: -0.2 })
  } else if (e.code === "Backspace") {
    projectModules = projectModules.filter(m => !m.selected)
  } else if (isControl && e.key === "KeyZ") {

  }
  return true;
})

const dropFileOverlay = document.getElementById('drop-file')

document.body.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropFileOverlay.style.display = "flex";
})

document.body.addEventListener('dragleave', e => {
  if (e.target.id !== 'drop-file') return;
  dropFileOverlay.style.display = "none";
})

dropFileOverlay.addEventListener('drop', e => {
  e.preventDefault();
  dropFileOverlay.style.display = 'none';
  const target = e.dataTransfer;
  const file = target.files[0]
  const fileType = file.type.split("/").pop();
  if (fileType !== 'plain') {
    alert("Falsche Datei")
    return
  }
  const middleCoordinates = getMiddleCoords(canvas)
  file.text().then((t) => importText(t, middleCoordinates))
})

const canPlaceNewObject = (obj, ignoreModules, x, y) => {
  const [blockA, blockB] = [getBlock(x, y), getBlock(x, y + 1)]
  if (blockA && !ignoreModules.find(m => m.id === blockA.id)) return false;
  if (obj instanceof BausteinParty && blockB && !ignoreModules.find(m => m.id === blockB.id)) return false;
  return true;
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey) {
    const delta = Math.exp(-e.deltaY / 150);
    adjustZoom({ faktor: delta })
  } else {
    cameraOffset.x += e.deltaX * -1;
    cameraOffset.y += e.deltaY * -1;
  }
});

function drawRect(x, y, width, height) {
  context.fillRect(x, y, width, height)
}

function animate() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.setTransform(scale, 0, 0, scale, cameraOffset.x, cameraOffset.y);

  drawCoordinates(context);

  const modules = projectModules.sort(a => a instanceof Quelle).sort((a, b) => a.active && a.xPx < b.xPx)
  for (const el of modules) el._draw(context);
  if (selectCoords[0][0] !== -1) drawSelectBox(context);
  if (modules.find(m => m.selected)) drawSelectedBox(context)

  window.requestAnimationFrame(animate);
}

animate();

importText(`4 6
X  Q1 Q2 X
X  W  W  X
r  R  R  r
X  B  B  X
X  W  W  X
X  L1 L2 X
`, [5, 3])
