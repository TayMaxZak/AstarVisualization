const blockType = {
	empty: 0,
	wall: 1,
	greenNode: 2,
	redNode: 3,
	blueNode: 4
};

const colors = {
	red: 'rgb(255, 50, 0)',
	green: 'rgb(150, 255, 0)',
	blue: 'rgb(0, 150, 255)',
	yellow: 'rgb(255, 200, 0)',
	purple: 'rgb(255, 0, 200)',
	dark: 'rgb(10, 20, 40)'
};

const heuristicType = {
	manhattan: 0,
	euclidian: 1
}

class Grid {
	/*
	Flat array of: {
		x: x coordinate
		y: y coordinate
		btype: block type
	}
	*/
	constructor(size, saveName, onChangeCallback) {
		this.tiles = [];
		this.gridSize = size;
		this.saveName = saveName;
		this.onChangeCallback = onChangeCallback;
	}
	
	createGrid() {
		this.tiles = [];
	
		// Fill it with empty blocks
		for (var x = 0; x < this.gridSize; x++) {
			for (var y = 0; y < this.gridSize; y++) {
				this.tiles.push({x, y, btype: blockType.empty});
			}
		}
	}

	loadGrid() {
		let tiles = localStorage.getItem(this.saveName);
		
		try {
			if (tiles) {
				tiles = JSON.parse(tiles);
				if (tiles.length !== this.gridSize * this.gridSize) {
					gridSize = Math.round(Math.sqrt(tiles.length));
				}
				this.tiles = tiles;
			}
		} catch (err) {
			throw "Wrong grid " + err.message;
		}
	}

	saveGrid() {
		let g = this.tiles.map((item) => ({x: item.x, y: item.y, btype: item.btype === blockType.wall ? 1 : 0}));
	
		localStorage.setItem(this.saveName, JSON.stringify(g));
	}

	initGrid() {
		this.loadGrid();
		if (!this.tiles || !this.tiles.length) {
			this.createGrid();
		}
	}

	resetGrid() {
		for (var x = 0; x < this.gridSize; x++) {
			for (var y = 0; y < this.gridSize; y++) {
				if (this.tiles[x + y * this.gridSize].btype !== blockType.wall) {
					this.tiles[x + y * this.gridSize].btype = blockType.empty;
				}
			}
		}
	} //resetGrid()

	clearGrid() {
		for (var x = 0; x < this.gridSize; x++) {
			for (var y = 0; y < this.gridSize; y++) {
				this.tiles[x + y * this.gridSize].btype = blockType.empty;
			}
		}
	}

	changeBlock(coords, newBlock) {
		let index = coords.x + coords.y * this.gridSize;

		// Use newBlock if defined; else, swap the block type
		this.tiles[index].btype = newBlock === undefined ? (blockType.empty ? blockType.wall : blockType.empty) : newBlock;

		this.onChangeCallback && this.onChangeCallback();
	}

	indexToCoords(index) {
		index = Math.min(Math.max(0, index), this.gridSize * this.gridSize - 1);

		// Inverse of x + y * this.grid.gridSize
		let x = index % this.gridSize; // Remainder of division
		let y = Math.floor((index - x) / this.gridSize);

		return {x, y};
	}

	coordsToIndex(coords) {
		let x = coords.x;
		let y = coords.y;

		return x + y * this.gridSize;
	}

	getNeighbors(x, y, useDiagonal) {
		// Return list of coords adjacent to the given coords, or undefined if it is off the grid
		let list = [];
		
		// Horizontal neighbors
		if (x - 1 >= 0) {
			list.push({x: x - 1, y: y});
		}
		else {
			list.push();
		}

		if (x + 1 < this.gridSize) {
			list.push({x: x + 1, y: y});
		}
		else {
			list.push();
		}

		// Vertical neighbors
		if (y - 1 >= 0) {
			list.push({x: x, y: y - 1});
		}
		else {
			list.push();
		}

		if (y + 1 < this.gridSize) {
			list.push({x: x, y: y + 1});
		}
		else {
			list.push();
		}

		if (useDiagonal) {
			// Diagonal neighbors
			if (x - 1 >= 0 && y - 1 >= 0) {
				list.push({x: x - 1, y: y - 1});
			}
			else {
				list.push();
			}

			if (x + 1 < this.gridSize && y - 1 >= 0) {
				list.push({x: x + 1, y: y - 1});
			}
			else {
				list.push();
			}

			if (x + 1 < this.gridSize && y + 1 < this.gridSize) {
				list.push({x: x + 1, y: y + 1});
			}
			else {
				list.push();
			}

			if (x - 1 >= 0 && y + 1 < this.gridSize ) {
				list.push({x: x - 1, y: y + 1});
			}
			else {
				list.push();
			}

			// Check for situations where diagonal woudlnt make sense
			let indicesToRemove= [];

			if (list[0]) {

			}
		}

		return list;
	} //getNeighbors()
} //class Grid

class OpenList {
	/*
	Contains {
		x: x coordinate
		y: y coordinate
		g: g-value (distance to start)
		h: heuristic (distance to target)
		cameFrom: previous node
		closed?: is it in the "closed list"?
		opened: is it already added to the open list?
	}
	*/
	constructor() {
		this.list = [];
	}

	findMinF() {
		// Returns the index of the element with the smallest F value in the list, or undefined 
		let minFIndex = 0;

		this.list.forEach((item, index) => {
			if (item.closed) {
				return;
			}

			if (item.f < this.list[minFIndex].f) {
				minFIndex = index;
			}
		});

		return minFIndex;
	}

	getElement(itemA) { // Item from open list
		return this.list.find((itemB) => itemA.x === itemB.x && itemA.y === itemB.y);
	}

	equalCoords(a, b) {
		return a.x === b.x && a.y === b.y;
	}
} //class OpenList

class AstarCanvas {
	constructor(convertor, context) {
		this.convertor = convertor;
		this.ctx = context;
	}

	drawEndpoints(startCoords, targetCoords) {
		let blkSize =  this.convertor.blockSize;
		let offset = blkSize * 0.5;
		let radius = blkSize * 0.33;

		this.ctx.lineWidth = 2;

		// Start node
		this.ctx.fillStyle = colors.red;
		this.ctx.beginPath();
		this.ctx.arc(startCoords.x * blkSize + offset, startCoords.y * blkSize + offset, radius, 0, 2 * Math.PI, false);
		this.ctx.fill();

		// End node
		this.ctx.fillStyle = colors.green;
		this.ctx.beginPath();
		this.ctx.arc(targetCoords.x * blkSize + offset, targetCoords.y * blkSize + offset, radius, 0, 2 * Math.PI, false);
		this.ctx.fill();
	}

	drawPath(pathList) {
		let node = pathList[pathList.length - 1];
		let prevNode = node.cameFrom;
		let blkSize =  this.convertor.blockSize;

		this.ctx.strokeStyle = colors.blue;
		//this.ctx.setLineDash([6, 6]);
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();

		while (prevNode) {
			this.ctx.moveTo(node.x * blkSize + blkSize / 2, node.y * blkSize + blkSize / 2);
			this.ctx.lineTo(prevNode.x * blkSize + blkSize / 2, prevNode.y * blkSize + blkSize / 2);

			node = prevNode;
			prevNode = node.cameFrom;
		}

		this.ctx.stroke();
		this.ctx.setLineDash([]);
	}
}

class AstarFinder {
	constructor(aGrid, options) {
		this.grid = aGrid;
		this.options = options;
	}

	calcHeuristic(current, targetCoords) {
		let xDif = Math.abs(targetCoords.x - current.x);
		let yDif = Math.abs(targetCoords.y - current.y);
		
		if (this.options.heuristicMode === heuristicType.euclidian) {
			return Math.sqrt(xDif * xDif + yDif * yDif) * this.options.heuristicWeight;
		} else { // Manhattan by default
			return (xDif + yDif) * this.options.heuristicWeight;
		}
	}

	showOpenList(openList) {
		openList.forEach((item) => {
			let btype;

			if (item.closed) {
				btype = blockType.greenNode;
			} else {
				btype = blockType.redNode;
			}
			
			this.grid.changeBlock(item, btype, false);
		});
	}

	btypeOfNode(node) {
		// Finds the equivalent tile in the grid and returns its btype
		if (!node) {
			return;
		}

		return this.grid.tiles[this.grid.coordsToIndex(node)].btype;
	}

	checkNeighbors(neighbors, useDiagonal) {
		// If that neighbor is empty or an obstacle, mark it for removal
		let removeList = [];
		for (let i = 0; i < neighbors.length; i++) {
			if (!neighbors[i] || this.btypeOfNode(neighbors[i]) === blockType.wall) {
				removeList[i] = true;
			}
			else {
				removeList[i] = false;
			}

			// TODO: Remove
			if (neighbors[i].x === 19 && neighbors[i].y === 0) {
				console.log("hello");
				console.log(neighbors[3]);
			}
		}

		if (useDiagonal) {
			// Check cases where diagonal movement wouldnt make sense
			if (this.btypeOfNode(neighbors[2]) === blockType.wall || this.btypeOfNode(neighbors[0]) === blockType.wall) {
				removeList[4] = true;
			}
			if (this.btypeOfNode(neighbors[0]) === blockType.wall || this.btypeOfNode(neighbors[3]) === blockType.wall) {
				removeList[7] = true;
			}
			if (this.btypeOfNode(neighbors[3]) === blockType.wall || this.btypeOfNode(neighbors[1]) === blockType.wall) {
				removeList[6] = true;
			}
			if (this.btypeOfNode(neighbors[1]) === blockType.wall || this.btypeOfNode(neighbors[2]) === blockType.wall) {
				removeList[5] = true;
			}
		}

		// Remove marked neighbors
		let returnList = [];
		for (let i = 0; i < neighbors.length; i++) {
			if (removeList[i] === true) {
				continue;
			}
			else {
				returnList.push(neighbors[i]);
			}
		}
		return returnList;
	}

	findPath(startCoords, targetCoords) {
		let openListObj = new OpenList(); // Nodes we need to evaluate
		let openList = openListObj.list;
		let endNode;

		// Add the first element to evaluate (the starting point)
		openList.push(startCoords);
		openList[0].g = 0;
		openList[0].h = Number.MAX_SAFE_INTEGER;
		openList[0].f = Number.MAX_SAFE_INTEGER;

		while (openList.length > 0) {
			let currentIndex = openListObj.findMinF();
			let current = openList[currentIndex];

			if (current.closed) {
				break;
			}
			current.closed = true;

			if (openListObj.equalCoords(current, targetCoords)) {
				// Done
				endNode = current;
				break;
			}

			let neighbors = this.grid.getNeighbors(current.x, current.y, this.options.useDiagonal);
			neighbors = this.checkNeighbors(neighbors, this.options.useDiagonal);

			for (let i = 0; i < neighbors.length; i++) {
				let neighbor = neighbors[i];
				if (neighbor.closed) {
					continue;
				}

				if (openListObj.getElement(neighbor)) {
					continue;
				}

				let ng = current.g + (current.x - neighbor.x === 0 || current.y - neighbor.y === 0) ? 10 : 14;

				if (!neighbor.opened || ng < neighbor.g) {
					neighbor.g = ng;
					neighbor.h = neighbor.h || this.calcHeuristic(neighbor, targetCoords);
					neighbor.f = neighbor.g + neighbor.h;
					neighbor.cameFrom = current;

					if (!neighbor.opened) {
						openList.push(neighbor);
						neighbor.opened = true;
					}
				}
			} //for

			//this.showOpenList(openList);

			//delay(10);
		} //while
		
		if (this.options.debugPathfinding) {
			this.showOpenList(openList);
		}

		let path = [];

		if (endNode) {
			path.push(endNode);
			let prevNode = endNode.cameFrom;
			while (prevNode) {
				path.push(prevNode);
				prevNode = prevNode.cameFrom;
			}
			path.reverse();
		}

		return path;
	} //findPath()
} //class AstarFinder

class CoordConvertor {
	constructor(aGridSize, canvas) {
		this.gridSize = aGridSize;
		this.canvas = canvas;
		this.ctxDim = this.calcCtxDim();
		this.blockSize = this.calcBlockSize();
	}

	calcCtxDim() {
		return [this.canvas.clientWidth, this.canvas.clientHeight];
	}

	calcBlockSize() {
		return this.ctxDim[0] / this.gridSize;
	}

	mouseToGrid(x, y) {
		// Clamp values (-1 because 400 / 40 = 10 rather than 9.)
		x = Math.min(Math.max(0, x), this.ctxDim[0] - 1);
		y = Math.min(Math.max(0, y), this.ctxDim[1] - 1);

		x = Math.floor(x / this.blockSize);
		y = Math.floor(y / this.blockSize);

		return {x, y};
	}
} //class CoordConvertor

class UIEventsHandler {
	constructor(grid, convertor, onChangeCallback) {
		this.grid = grid;
		this.convertor = convertor;
		this.onChangeCallback = onChangeCallback;
		this.isDrawing = false;
		this.currentBlockType = blockType.wall;
	}

	initEventHandlers(canvas) {
		canvas.addEventListener("mousedown", this.mouseDown.bind(this), false);
		canvas.addEventListener("mousemove", this.mouseMove.bind(this), false);
		canvas.addEventListener("mouseup", this.mouseUp.bind(this), false);
	}

	mouseDown(event) {
		this.isDrawing = true;
		this.updateBlock(event);
	}
	
	mouseMove(event) {
		this.updateBlock(event);
	}

	updateBlock(event) {
		if (!this.isDrawing) {
			return;
		}
	
		let ctxDim = this.convertor.ctxDim;
	
		let x = event.offsetX;
		let y = event.offsetY;
	
		let coords = this.convertor.mouseToGrid(x, y);
	
		let n = this.currentBlockType;
	
		this.grid.changeBlock(coords, n);
		this.onChangeCallback && this.onChangeCallback(true);
	}
	
	mouseUp() {
		this.isDrawing = false;
	}
} //class UIEventsHandler

class AstarManager {
	/*
	var canvas;
	var ctx;

	var grid; // Two dimensional array of ints
	var convertor;
	var finder; // Pathfinding object
	var ui;
	*/

	constructor(elementId, saveId) {
		this.canvas = document.getElementById(elementId);
		this.ctx = this.canvas.getContext("2d");
	
		this.grid = new Grid(40, saveId, this.changeBlock.bind(this));
		this.grid.initGrid();

		this.options = {
			type: blockType.wall,
			clear: () => {
				this.grid.clearGrid();
				this.grid.saveGrid();
				this.renderGrid();
			},
			find: this.find.bind(this),
			useDiagonal: true,
			heuristicWeight: 10,
			heuristicMode: heuristicType.euclidian,
			debugPathfinding: false,
			showCoordinates: false
		};
	
		this.convertor = new CoordConvertor(this.grid.gridSize, this.canvas);
		this.finder = new AstarFinder(this.grid, this.options);
		this.renderer = new AstarCanvas(this.convertor, this.ctx);
	
		this.uiHandler = new UIEventsHandler(this.grid, this.convertor, this.changeBlock.bind(this));
		this.uiHandler.initEventHandlers(this.canvas);
	
		this.renderGrid();
	}

	find() {
		let startCoords = {x: 1, y: 1};
		let targetCoords = {x: this.grid.gridSize - 2, y: this.grid.gridSize - 2};
		this.grid.resetGrid();
		
		let path = this.finder.findPath(startCoords, targetCoords);
		if (path.length > 0) {
			this.renderGrid();
			this.renderer.drawPath(path);
		}
		this.renderer.drawEndpoints(startCoords, targetCoords);
	}

	initGUI(gui, folderName) {
		let f = gui.addFolder(folderName);
		f.add(this.options, 'type', blockType).onChange((value) => {
			this.uiHandler.currentBlockType = typeof value === "string" ? parseInt(value) : value;
		});
		f.add(this.options, 'find');
		f.add(this.options, 'clear');

		let p = f.addFolder("Pathfinding Options");
		p.add(this.options, 'useDiagonal');
		p.add(this.options, 'heuristicWeight');
		p.add(this.options, 'heuristicMode', heuristicType).onChange((value) => {
			this.options.heuristicMode = typeof value === "string" ? parseInt(value) : value;
		});

		let d = f.addFolder("Debug Options");
		d.add(this.options, 'debugPathfinding');
		d.add(this.options, 'showCoordinates');
		f.open();
	}

	changeBlock(save) {
		if (save) {
			this.grid.saveGrid();
		}
		
		this.renderGrid();
	}

	renderGrid() {
		this.ctx.clearRect(0, 0, this.convertor.ctxDim[0], this.convertor.ctxDim[1]);
	
		this.ctx.fillStyle = 'black';
		this.ctx.fillRect(0, 0, this.convertor.ctxDim[0], this.convertor.ctxDim[1]);
	
		// Look through grid
		for (let x = 0; x < this.grid.gridSize; x++) {
			for (let y = 0; y < this.grid.gridSize; y++) {
				let curIndex = x + y * this.grid.gridSize;
				let curTile = this.grid.tiles[curIndex];
				let blkSz = this.convertor.blockSize;
	
				// Render grid
				switch (curTile.btype) {
					case blockType.empty:
						this.ctx.fillStyle = colors.dark;
						this.ctx.fillRect(x * blkSz, y * blkSz, blkSz, blkSz);
						break;
					case blockType.wall:
						this.ctx.fillStyle = colors.yellow;
						this.ctx.fillRect(x * blkSz, y * blkSz, blkSz, blkSz);
						break;
					case blockType.greenNode:
						this.ctx.strokeStyle = colors.green;
						this.ctx.lineWidth = 1;
						this.ctx.strokeRect(x * blkSz + blkSz * 0.25, y * blkSz + blkSz * 0.25, blkSz * 0.5, blkSz * 0.5);
						break;
					case blockType.redNode:
						this.ctx.strokeStyle = colors.red;
						this.ctx.lineWidth = 1;
						this.ctx.strokeRect(x * blkSz + blkSz * 0.25, y * blkSz + blkSz * 0.25, blkSz * 0.5, blkSz * 0.5);
						break;
					case blockType.blueNode:
						this.ctx.strokeStyle = colors.blue;
						this.ctx.lineWidth = 1;
						this.ctx.strokeRect(x * blkSz + blkSz * 0.25, y * blkSz + blkSz * 0.25, blkSz * 0.5, blkSz * 0.5);
						break;
				}
	
				this.ctx.strokeStyle = colors.purple;
				this.ctx.lineWidth = 0.5;
				this.ctx.strokeRect(x * blkSz, y * blkSz, blkSz, blkSz);
	
				// Render text information
				if (this.options.showCoordinates) {
					this.ctx.font = "6px Arial";
					this.ctx.fillStyle = "rgba(255, 255, 255, 127)";
					this.ctx.fillText(x + "," + y, x * blkSz + blkSz * 0.1, y * blkSz + blkSz * 0.25 + 1);
				}
			}
		}
	} //renderGrid()
} //class AstarManager

function onDOMLoaded() {
	let datGUI = new dat.GUI();

	let ui = new AstarManager("canvas1", "grid1");
	ui.initGUI(datGUI, "Grid 1");

	let ui2 = new AstarManager("canvas2", "grid1");
	ui2.initGUI(datGUI, "Grid 2");
}

window.addEventListener("DOMContentLoaded", onDOMLoaded, false);
