// A* Pathfinding Algorithm
// Basic implementation for finding a path in a grid.

class Node {
    constructor(parent = null, position = null) {
        this.parent = parent;
        this.position = position;

        this.g = 0; // Cost from start to current node
        this.h = 0; // Heuristic cost from current node to end
        this.f = 0; // Total cost (g + h)
    }

    equals(other) {
        return this.position.x === other.position.x && this.position.y === other.position.y;
    }
}

export function findPath(grid, start, end) {
    const startNode = new Node(null, start);
    const endNode = new Node(null, end);

    let openList = [];
    let closedList = new Set();

    openList.push(startNode);

    while (openList.length > 0) {
        // Get the current node (the one with the lowest f cost)
        let currentNode = openList[0];
        let currentIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < currentNode.f) {
                currentNode = openList[i];
                currentIndex = i;
            }
        }

        // Pop current off open list, add to closed list
        openList.splice(currentIndex, 1);
        closedList.add(`${currentNode.position.x},${currentNode.position.y}`);

        // Found the goal
        if (currentNode.equals(endNode)) {
            let path = [];
            let current = currentNode;
            while (current !== null) {
                path.push(current.position);
                current = current.parent;
            }
            return path.reverse(); // Return reversed path
        }

        // Generate children
        let children = [];
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // Up, Down, Left, Right

        for (const newPosition of directions) {
            const nodePosition = {
                x: currentNode.position.x + newPosition[0],
                y: currentNode.position.y + newPosition[1]
            };

            // Make sure within range
            if (nodePosition.y > (grid.length - 1) || nodePosition.y < 0 || nodePosition.x > (grid[0].length - 1) || nodePosition.x < 0) {
                continue;
            }

            // Make sure walkable terrain
            if (grid[nodePosition.y][nodePosition.x] !== 0) {
                continue;
            }

            // Create new node
            const newNode = new Node(currentNode, nodePosition);
            children.push(newNode);
        }

        // Loop through children
        for (let child of children) {
            // Child is on the closed list
            if (closedList.has(`${child.position.x},${child.position.y}`)) {
                continue;
            }

            // Create the f, g, and h values
            child.g = currentNode.g + 1;
            child.h = Math.pow(child.position.x - endNode.position.x, 2) + Math.pow(child.position.y - endNode.position.y, 2);
            child.f = child.g + child.h;

            // Child is already in the open list
            let inOpenList = false;
            for (let openNode of openList) {
                if (child.equals(openNode) && child.g > openNode.g) {
                    inOpenList = true;
                    break;
                }
            }
            if (inOpenList) {
                continue;
            }

            // Add the child to the open list
            openList.push(child);
        }
    }

    return null; // No path found
}
