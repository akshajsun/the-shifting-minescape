// Procedural maze generation using Recursive Backtracking
export class MazeGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.visited = [];
        this.walls = [];
    }

    generate() {
        // Initialize grid: 1 = wall, 0 = path
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(1));
        this.visited = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
        this.walls = [];

        // Start from top-left corner
        const startX = 1;
        const startY = 1;
        this.grid[startY][startX] = 0;
        this.visited[startY][startX] = true;

        // Recursive backtracking
        this.carvePassages(startX, startY);

        // Ensure exit at bottom-right
        const endX = this.width - 2;
        const endY = this.height - 2;
        this.grid[endY][endX] = 0;
        this.grid[endY][endX + 1] = 0;
        
        // Ensure path exists from start to end
        const startPos = { x: startX, y: startY };
        const endPos = { x: endX, y: endY };
        
        if (!this.hasPath(startPos, endPos)) {
            // If no path exists, create a direct path
            this.createDirectPath(startPos, endPos);
        }

        // Track all walls for dynamic shifting
        this.updateWallList();

        return this.grid;
    }

    createDirectPath(start, end) {
        // Create a simple path from start to end
        let currentX = start.x;
        let currentY = start.y;
        
        // Move horizontally first, then vertically
        while (currentX !== end.x) {
            this.grid[currentY][currentX] = 0;
            currentX += currentX < end.x ? 1 : -1;
        }
        
        while (currentY !== end.y) {
            this.grid[currentY][currentX] = 0;
            currentY += currentY < end.y ? 1 : -1;
        }
        
        this.grid[end.y][end.x] = 0;
    }

    carvePassages(x, y) {
        const directions = [
            [0, 2], [2, 0], [0, -2], [-2, 0]
        ];

        // Shuffle directions for randomness
        this.shuffle(directions);

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (this.isValid(nx, ny) && !this.visited[ny][nx]) {
                // Carve passage
                this.grid[ny][nx] = 0;
                this.grid[y + dy / 2][x + dx / 2] = 0; // Remove wall between
                this.visited[ny][nx] = true;
                this.carvePassages(nx, ny);
            }
        }
    }

    isValid(x, y) {
        return x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    updateWallList() {
        this.walls = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 1) {
                    this.walls.push({ x, y });
                }
            }
        }
    }

    // Dynamic maze shifting: randomly remove/add walls
    shiftMaze(complexity = 0.5) {
        const changes = Math.floor(this.walls.length * 0.1 * complexity);
        const startPos = this.getStartPosition();
        const endPos = this.getEndPosition();
        
        // Remove some walls (create passages)
        for (let i = 0; i < changes; i++) {
            if (this.walls.length > 0) {
                const idx = Math.floor(Math.random() * this.walls.length);
                const wall = this.walls.splice(idx, 1)[0];
                if (this.isValid(wall.x, wall.y)) {
                    this.grid[wall.y][wall.x] = 0;
                }
            }
        }

        // Add some walls (close passages) - but ensure path still exists
        let attempts = 0;
        let wallsAdded = 0;
        while (wallsAdded < changes && attempts < changes * 3) {
            attempts++;
            const x = Math.floor(Math.random() * (this.width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - 2)) + 1;
            
            // Only add wall if it's currently a path and not blocking critical routes
            if (this.grid[y][x] === 0 && this.canAddWall(x, y)) {
                // Temporarily add wall
                this.grid[y][x] = 1;
                
                // Check if path still exists
                if (this.hasPath(startPos, endPos)) {
                    this.walls.push({ x, y });
                    wallsAdded++;
                } else {
                    // Revert if path is blocked
                    this.grid[y][x] = 0;
                }
            }
        }

        this.updateWallList();
        return this.grid;
    }

    // BFS to check if path exists from start to end
    hasPath(start, end) {
        const visited = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
        const queue = [start];
        visited[start.y][start.x] = true;
        
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.x === end.x && current.y === end.y) {
                return true;
            }
            
            for (const [dx, dy] of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                
                if (this.isValid(nx, ny) && 
                    this.grid[ny][nx] === 0 && 
                    !visited[ny][nx]) {
                    visited[ny][nx] = true;
                    queue.push({ x: nx, y: ny });
                }
            }
        }
        
        return false;
    }

    canAddWall(x, y) {
        // Don't block if it would create an isolated area
        // Simple check: ensure at least 2 adjacent paths remain
        let adjacentPaths = 0;
        const neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of neighbors) {
            if (this.isValid(x + dx, y + dy) && this.grid[y + dy][x + dx] === 0) {
                adjacentPaths++;
            }
        }
        return adjacentPaths >= 2;
    }

    getStartPosition() {
        return { x: 1, y: 1 };
    }

    getEndPosition() {
        return { x: this.width - 2, y: this.height - 2 };
    }

    isWalkable(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return this.grid[Math.floor(y)][Math.floor(x)] === 0;
    }
}

