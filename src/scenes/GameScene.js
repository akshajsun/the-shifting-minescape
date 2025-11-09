import Phaser from 'phaser';
import { MazeGenerator } from '../maze/MazeGenerator.js';
import { Player } from '../agents/Player.js';
import { Bot } from '../agents/Bot.js';
import { GameConfig } from '../config/GameConfig.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.config = GameConfig.getInstance();
        this.agents = [];
        this.player = null;
        this.maze = null;
        this.mazeShiftTimer = 0;
        this.gameOver = false;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Initialize collision tracking
        this.collisionPairs = new Map();

        // Initialize maze
        const mazeWidth = 40;
        const mazeHeight = 30;
        this.mazeGenerator = new MazeGenerator(mazeWidth, mazeHeight);
        this.maze = this.mazeGenerator.generate();

        // Create maze visual
        this.createMazeVisual();

        // Create agents
        this.createAgents();

        // Create HUD
        this.createHUD();

        // Setup collision detection
        this.setupCollisions();

        // Setup camera
        this.cameras.main.setBounds(0, 0, mazeWidth * 32, mazeHeight * 32);
        this.cameras.main.startFollow(this.player.sprite);

        // Pause key
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.pause();
            this.scene.launch('PauseScene');
        });

        // Maze shift timer
        this.mazeShiftTimer = this.time.now;
    }

    createMazeVisual() {
        const tileSize = 32;
        this.tileSprites = []; // Use a 2D array to store tile sprites

        for (let y = 0; y < this.maze.length; y++) {
            this.tileSprites[y] = [];
            for (let x = 0; x < this.maze[y].length; x++) {
                let tile;
                if (this.maze[y][x] === 1) {
                    // Wall with mining theme
                    tile = this.add.rectangle(
                        x * tileSize + tileSize / 2,
                        y * tileSize + tileSize / 2,
                        tileSize,
                        tileSize,
                        0x4a4a4a
                    );
                    tile.setStrokeStyle(2, 0x2a2a2a);
                    tile.setDepth(0);
                } else {
                    // Path with mining theme
                    tile = this.add.rectangle(
                        x * tileSize + tileSize / 2,
                        y * tileSize + tileSize / 2,
                        tileSize,
                        tileSize,
                        0x3d2817
                    );
                    tile.setDepth(0);
                    
                    // Occasional ore deposits
                    if (Math.random() > 0.95) {
                        const ore = this.add.circle(
                            x * tileSize + tileSize / 2,
                            y * tileSize + tileSize / 2,
                            3,
                            0xffd700,
                            0.6
                        );
                        ore.setDepth(1);
                        this.tweens.add({
                            targets: ore,
                            alpha: { from: 0.3, to: 0.8 },
                            duration: 1000,
                            yoyo: true,
                            repeat: -1
                        });
                    }
                }
                this.tileSprites[y][x] = tile;
            }
        }

        // Goal/Exit
        const endPos = this.mazeGenerator.getEndPosition();
        this.goal = this.add.circle(
            endPos.x * tileSize + tileSize / 2,
            endPos.y * tileSize + tileSize / 2,
            tileSize / 2,
            0xffd700
        );
        this.goal.setStrokeStyle(3, 0xffffff);
        this.goal.setDepth(1); // Above maze
        
        // Pulsing animation
        this.tweens.add({
            targets: this.goal,
            scale: { from: 1, to: 1.2 },
            alpha: { from: 1, to: 0.7 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }

    createAgents() {
        const startPos = this.mazeGenerator.getStartPosition();
        const tileSize = 32;
        
        // Find valid spawn positions around start
        const spawnPositions = this.findValidSpawnPositions(startPos, this.config.botCount + 1);

        // Create player at first valid position
        if (spawnPositions.length > 0) {
            const playerPos = spawnPositions[0];
            this.player = new Player(
                this,
                playerPos.x * tileSize + tileSize / 2,
                playerPos.y * tileSize + tileSize / 2
            );
            this.agents.push(this.player);
        } else {
            // Fallback to default position
            this.player = new Player(
                this,
                startPos.x * tileSize + tileSize / 2,
                startPos.y * tileSize + tileSize / 2
            );
            this.agents.push(this.player);
        }

        // Create bots at other valid positions
        const botColors = [0xff0000, 0x0000ff, 0x00ff00, 0xff00ff];
        const botCount = Math.min(this.config.botCount, 4);

        for (let i = 0; i < botCount; i++) {
            const spawnIndex = Math.min(i + 1, spawnPositions.length - 1);
            const botPos = spawnPositions[spawnIndex] || startPos;
            
            const bot = new Bot(
                this,
                botPos.x * tileSize + tileSize / 2,
                botPos.y * tileSize + tileSize / 2,
                botColors[i],
                i,
                this.config
            );
            bot.scene = this; // Ensure scene reference
            this.agents.push(bot);
            
            // Try to load saved model
            bot.loadModel().catch(() => {
                console.log(`No saved model for bot ${i}`);
            });
        }
    }

    findValidSpawnPositions(startPos, count) {
        const positions = [];
        const directions = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
        const checked = new Set();
        
        // Start with the start position
        positions.push(startPos);
        checked.add(`${startPos.x},${startPos.y}`);
        
        // Find nearby valid positions
        for (let radius = 1; radius <= 3 && positions.length < count; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (positions.length >= count) break;
                    
                    const x = startPos.x + dx;
                    const y = startPos.y + dy;
                    const key = `${x},${y}`;
                    
                    if (!checked.has(key) && this.mazeGenerator.isWalkable(x, y)) {
                        positions.push({ x, y });
                        checked.add(key);
                    }
                }
            }
        }
        
        return positions;
    }

    createHUD() {
        const { width, height } = this.cameras.main;

        // Leaderboard panel - set high depth to stay on top
        const leaderboardPanelX = width - 200;
        const leaderboardPanelY = 20;
        const leaderboardPanelWidth = 180;
        const leaderboardPanelHeight = 200;
        const shadowOffset = 5;

        // Shadow for leaderboard panel
        this.leaderboardPanelShadow = this.add.rectangle(
            leaderboardPanelX + shadowOffset,
            leaderboardPanelY + shadowOffset,
            leaderboardPanelWidth,
            leaderboardPanelHeight,
            0x000000,
            0.3 // Darker, more transparent shadow
        );
        this.leaderboardPanelShadow.setScrollFactor(0);
        this.leaderboardPanelShadow.setDepth(999); // Below the panel

        this.leaderboardPanel = this.add.rectangle(
            leaderboardPanelX,
            leaderboardPanelY,
            leaderboardPanelWidth,
            leaderboardPanelHeight,
            0x1a1a1a, // Dark background for glassmorphism
            0.6 // Semi-transparent
        );
        this.leaderboardPanel.setStrokeStyle(2, 0xcc0000); // Metallic red accent
        this.leaderboardPanel.setScrollFactor(0);
        this.leaderboardPanel.setDepth(1000); // Very high depth for UI

        this.leaderboardText = this.add.text(
            leaderboardPanelX,
            30,
            'LEADERBOARD',
            {
                fontSize: '18px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#cc0000' // Metallic red accent
            }
        );
        this.leaderboardText.setOrigin(0.5, 0);
        this.leaderboardText.setScrollFactor(0);
        this.leaderboardText.setDepth(1001); // Above panel

        this.leaderboardEntries = [];

        // Stats panel
        const statsPanelX = 20;
        const statsPanelY = height - 150;
        const statsPanelWidth = 250;
        const statsPanelHeight = 130;

        // Shadow for stats panel
        this.statsPanelShadow = this.add.rectangle(
            statsPanelX + shadowOffset,
            statsPanelY + shadowOffset,
            statsPanelWidth,
            statsPanelHeight,
            0x000000,
            0.3
        );
        this.statsPanelShadow.setScrollFactor(0);
        this.statsPanelShadow.setDepth(999);

        this.statsPanel = this.add.rectangle(
            statsPanelX,
            statsPanelY,
            statsPanelWidth,
            statsPanelHeight,
            0x1a1a1a, // Dark background for glassmorphism
            0.6 // Semi-transparent
        );
        this.statsPanel.setStrokeStyle(2, 0xcccccc); // Metallic silver accent
        this.statsPanel.setScrollFactor(0);
        this.statsPanel.setDepth(1000);

        this.statsText = this.add.text(
            statsPanelX,
            height - 140,
            'STATS',
            {
                fontSize: '16px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#cccccc' // Metallic silver accent
            }
        );
        this.statsText.setScrollFactor(0);
        this.statsText.setDepth(1001);

        // Home Button
        const homeButtonX = 40;
        const homeButtonY = 40;
        const homeButtonWidth = 100;
        const homeButtonHeight = 40;

        // Shadow for home button
        this.homeButtonShadow = this.add.rectangle(
            homeButtonX + shadowOffset,
            homeButtonY + shadowOffset,
            homeButtonWidth,
            homeButtonHeight,
            0x000000,
            0.3
        );
        this.homeButtonShadow.setScrollFactor(0);
        this.homeButtonShadow.setDepth(999);

        const homeButton = this.add.rectangle(
            homeButtonX,
            homeButtonY,
            homeButtonWidth,
            homeButtonHeight,
            0x1a1a1a,
            0.6
        );
        homeButton.setStrokeStyle(2, 0xcccccc);
        homeButton.setScrollFactor(0);
        homeButton.setDepth(1000);
        homeButton.setInteractive({ useHandCursor: true });

        const homeButtonText = this.add.text(
            homeButtonX,
            homeButtonY,
            'HOME',
            {
                fontSize: '16px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#cccccc'
            }
        );
        homeButtonText.setOrigin(0.5);
        homeButtonText.setScrollFactor(0);
        homeButtonText.setDepth(1001);

        homeButton.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        homeButton.on('pointerover', () => {
            homeButton.setFillStyle(0x333333, 0.7);
            homeButton.setStrokeStyle(2, 0xffffff);
        });

        homeButton.on('pointerout', () => {
            homeButton.setFillStyle(0x1a1a1a, 0.6);
            homeButton.setStrokeStyle(2, 0xcccccc);
        });

        // Minimap (if enabled)
        if (this.config.showMinimap) {
            this.createMinimap();
        }
    }

    createMinimap() {
        const { width, height } = this.cameras.main;
        const minimapSize = 150;
        const panelX = width - minimapSize - 20;
        const panelY = height - minimapSize - 20;
        const shadowOffset = 5;

        // Shadow for minimap panel
        this.minimapPanelShadow = this.add.rectangle(
            panelX + shadowOffset,
            panelY + shadowOffset,
            minimapSize,
            minimapSize,
            0x000000,
            0.3
        );
        this.minimapPanelShadow.setScrollFactor(0);
        this.minimapPanelShadow.setDepth(999);

        this.minimapPanel = this.add.rectangle(
            panelX,
            panelY,
            minimapSize,
            minimapSize,
            0x1a1a1a, // Dark background for glassmorphism
            0.6 // Semi-transparent
        );
        this.minimapPanel.setStrokeStyle(2, 0xcc0000); // Metallic red accent
        this.minimapPanel.setScrollFactor(0);
        this.minimapPanel.setDepth(1000);

        this.minimapText = this.add.text(
            panelX,
            panelY - minimapSize / 2 + 10,
            'MINIMAP',
            {
                fontSize: '12px',
                fontFamily: 'Oxanium',
                color: '#cc0000' // Metallic red accent
            }
        );
        this.minimapText.setOrigin(0.5, 0);
        this.minimapText.setScrollFactor(0);
        this.minimapText.setDepth(1001);

        // Create minimap graphics group
        this.minimapGraphics = this.add.group();
    }

    updateMinimap() {
        if (!this.config.showMinimap) return;

        // Clear old minimap
        this.minimapGraphics.clear(true, true);

        const { width, height } = this.cameras.main;
        const minimapSize = 150;
        const panelX = width - minimapSize - 20;
        const panelY = height - minimapSize - 20;
        const padding = 10;
        const mapSize = minimapSize - padding * 2;
        const mapX = panelX - minimapSize / 2 + padding;
        const mapY = panelY - minimapSize / 2 + padding;

        const mazeWidth = this.maze[0].length;
        const mazeHeight = this.maze.length;
        const tileSize = Math.min(mapSize / mazeWidth, mapSize / mazeHeight);

        // Draw maze
        for (let y = 0; y < mazeHeight; y++) {
            for (let x = 0; x < mazeWidth; x++) {
                const screenX = mapX + x * tileSize;
                const screenY = mapY + y * tileSize;
                
                if (this.maze[y][x] === 1) {
                    // Wall
                    const wall = this.add.rectangle(
                        screenX,
                        screenY,
                        tileSize,
                        tileSize,
                        0x4a4a4a,
                        0.8
                    );
                    wall.setScrollFactor(0);
                    wall.setDepth(1001);
                    this.minimapGraphics.add(wall);
                } else {
                    // Path
                    const path = this.add.rectangle(
                        screenX,
                        screenY,
                        tileSize,
                        tileSize,
                        0x3d2817,
                        0.5
                    );
                    path.setScrollFactor(0);
                    path.setDepth(1001);
                    this.minimapGraphics.add(path);
                }
            }
        }

        // Draw goal
        const endPos = this.mazeGenerator.getEndPosition();
        const goalX = mapX + endPos.x * tileSize;
        const goalY = mapY + endPos.y * tileSize;
        const goal = this.add.circle(goalX, goalY, tileSize / 2, 0xffd700, 0.8);
        goal.setScrollFactor(0);
        goal.setDepth(1002);
        this.minimapGraphics.add(goal);

        // Draw agents
        const tileSizePixels = 32;
        this.agents.forEach(agent => {
            const gridX = agent.x / tileSizePixels;
            const gridY = agent.y / tileSizePixels;
            const agentX = mapX + gridX * tileSize;
            const agentY = mapY + gridY * tileSize;
            
            const agentDot = this.add.circle(
                agentX,
                agentY,
                Math.max(2, tileSize / 4),
                agent.isPlayer ? 0xffd700 : agent.color,
                1
            );
            agentDot.setScrollFactor(0);
            agentDot.setDepth(1003);
            this.minimapGraphics.add(agentDot);
        });
    }

    setupCollisions() {
        if (!this.config.collisionEnabled) return;

        // Track collision pairs to prevent repeated collisions
        this.collisionPairs = new Map();
        
        // Create collision groups
        this.agentGroup = this.physics.add.group(this.agents.map(a => a.sprite));
        
        // Check collisions between agents using manual distance check in update loop
        // This gives us more control and prevents stuck agents
    }

    checkCollisions() {
        if (!this.config.collisionEnabled) return;
        
        // Check all agent pairs
        for (let i = 0; i < this.agents.length; i++) {
            for (let j = i + 1; j < this.agents.length; j++) {
                const agent1 = this.agents[i];
                const agent2 = this.agents[j];
                
                // Skip if either is stunned
                if (agent1.stunned || agent2.stunned) continue;
                
                const dx = agent1.x - agent2.x;
                const dy = agent1.y - agent2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = this.config.collisionRadius;
                
                if (distance < minDistance && distance > 0) {
                    // Create unique pair key
                    const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
                    const lastCollision = this.collisionPairs.get(pairKey) || 0;
                    const now = this.time.now;
                    
                    // Prevent repeated collisions within 500ms
                    if (now - lastCollision > 500) {
                        this.collisionPairs.set(pairKey, now);
                        
                        // Stun both agents
                        agent1.stun(this.config.collisionStunDuration);
                        agent2.stun(this.config.collisionStunDuration);
                        
                        // Separate agents more aggressively
                        const angle = Math.atan2(dy, dx);
                        const separation = minDistance + 5; // Push them apart
                        
                        // Calculate new positions
                        const midX = (agent1.x + agent2.x) / 2;
                        const midY = (agent1.y + agent2.y) / 2;
                        
                        // Move agents apart, ensuring they stay in walkable areas
                        const newX1 = midX + Math.cos(angle) * separation / 2;
                        const newY1 = midY + Math.sin(angle) * separation / 2;
                        const newX2 = midX - Math.cos(angle) * separation / 2;
                        const newY2 = midY - Math.sin(angle) * separation / 2;
                        
                        // Only move if new position is walkable
                        if (agent1.canMoveTo(newX1, newY1)) {
                            agent1.sprite.x = newX1;
                            agent1.sprite.y = newY1;
                            agent1.glow.x = newX1;
                            agent1.glow.y = newY1;
                        }
                        
                        if (agent2.canMoveTo(newX2, newY2)) {
                            agent2.sprite.x = newX2;
                            agent2.sprite.y = newY2;
                            agent2.glow.x = newX2;
                            agent2.glow.y = newY2;
                        }
                        
                        // Particle effect
                        this.createCollisionParticles(midX, midY);
                    }
                }
            }
        }
        
        // Clean up old collision pairs (older than 1 second)
        const now = this.time.now;
        for (const [key, time] of this.collisionPairs.entries()) {
            if (now - time > 1000) {
                this.collisionPairs.delete(key);
            }
        }
    }

    createCollisionParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const particle = this.add.circle(x, y, 3, 0xff0000);
            particle.setDepth(11); // Above agents
            const angle = (Math.PI * 2 * i) / 10;
            const distance = Phaser.Math.Between(20, 40);
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: { from: 1, to: 0 },
                duration: 300,
                onComplete: () => particle.destroy()
            });
        }
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Update agents
        this.agents.forEach(agent => agent.update(time, delta));
        
        // Check collisions only if enabled (disabled by default for free movement)
        if (this.config.collisionEnabled) {
            this.checkCollisions();
        }

        // Check for goal reached
        this.agents.forEach(agent => {
            const endPos = this.mazeGenerator.getEndPosition();
            const gridX = Math.floor(agent.x / 32);
            const gridY = Math.floor(agent.y / 32);
            
            // Check if within 1 tile of goal
            const distance = Math.sqrt(
                Math.pow(gridX - endPos.x, 2) + Math.pow(gridY - endPos.y, 2)
            );
            
            if (distance <= 1 && !agent.completionTime) {
                agent.reachGoal();
                if (!this.gameOver) {
                    this.endGame(agent);
                }
            }
        });

        // Dynamic maze shifting
        if (time - this.mazeShiftTimer >= this.config.mazeShiftFrequency * 1000) {
            this.shiftMaze();
            this.mazeShiftTimer = time;
        }

        // Update HUD
        this.updateHUD(time);
    }

    shiftMaze() {
        // Store agent positions before shift
        const agentPositions = this.agents.map(agent => ({
            x: Math.floor(agent.x / 32),
            y: Math.floor(agent.y / 32),
            agent: agent
        }));

        // Deep copy the old grid for comparison
        const oldGrid = this.maze.map(row => [...row]);

        // Shift maze
        this.maze = this.mazeGenerator.shiftMaze(this.config.mazeComplexity);

        // Ensure all agents are still in walkable positions and path exists
        const startPos = this.mazeGenerator.getStartPosition();
        const endPos = this.mazeGenerator.getEndPosition();
        
        // Verify path still exists
        if (!this.mazeGenerator.hasPath(startPos, endPos)) {
            // If path is blocked, create a direct path
            this.mazeGenerator.createDirectPath(startPos, endPos);
            this.maze = this.mazeGenerator.grid;
        }

        // Move agents that ended up in walls (optimized)
        agentPositions.forEach(({ x, y, agent }) => {
            if (!this.mazeGenerator.isWalkable(x, y)) {
                // Quick nearest search (limited)
                const nearest = this.findNearestWalkable(x, y);
                if (nearest) {
                    const newX = nearest.x * 32 + 16;
                    const newY = nearest.y * 32 + 16;
                    agent.sprite.x = newX;
                    agent.sprite.y = newY;
                    agent.glow.x = newX;
                    agent.glow.y = newY;
                    agent.x = newX;
                    agent.y = newY;
                }
            }
        });

        // Animate the visual transition
        this.animateMazeShift(oldGrid, this.maze);

        // Notify agents of the shift
        this.agents.forEach(agent => {
            if (agent.onMazeShift) {
                agent.onMazeShift();
            }
        });
    }

    animateMazeShift(oldGrid, newGrid) {
        const tileSize = 32;
        this.cameras.main.shake(200, 0.005); // A slightly longer shake

        for (let y = 0; y < newGrid.length; y++) {
            for (let x = 0; x < newGrid[y].length; x++) {
                if (oldGrid[y][x] !== newGrid[y][x]) {
                    const oldTile = this.tileSprites[y][x];
                    
                    // Fade out the old tile
                    this.tweens.add({
                        targets: oldTile,
                        alpha: 0,
                        scale: 0,
                        duration: 200,
                        ease: 'Power2',
                        onComplete: () => {
                            oldTile.destroy();

                            // Create and fade in the new tile
                            let newTile;
                            if (newGrid[y][x] === 1) { // Path -> Wall
                                newTile = this.add.rectangle(
                                    x * tileSize + tileSize / 2,
                                    y * tileSize + tileSize / 2,
                                    tileSize, tileSize, 0x4a4a4a
                                );
                                newTile.setStrokeStyle(2, 0x2a2a2a);
                            } else { // Wall -> Path
                                newTile = this.add.rectangle(
                                    x * tileSize + tileSize / 2,
                                    y * tileSize + tileSize / 2,
                                    tileSize, tileSize, 0x3d2817
                                );
                            }
                            
                            newTile.setDepth(0);
                            newTile.setAlpha(0);
                            newTile.setScale(0);
                            this.tileSprites[y][x] = newTile;

                            this.tweens.add({
                                targets: newTile,
                                alpha: 1,
                                scale: 1,
                                duration: 200,
                                ease: 'Power2'
                            });
                        }
                    });
                }
            }
        }
    }

    findNearestWalkable(startX, startY) {
        // Faster search with smaller radius
        const queue = [{ x: startX, y: startY, dist: 0 }];
        const visited = new Set();
        const maxSearch = 5; // Reduced from 10 for speed
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (this.mazeGenerator.isWalkable(current.x, current.y)) {
                return { x: current.x, y: current.y };
            }
            
            if (current.dist < maxSearch) {
                const neighbors = [
                    { x: current.x + 1, y: current.y },
                    { x: current.x - 1, y: current.y },
                    { x: current.x, y: current.y + 1 },
                    { x: current.x, y: current.y - 1 }
                ];
                
                for (const neighbor of neighbors) {
                    const nKey = `${neighbor.x},${neighbor.y}`;
                    if (!visited.has(nKey)) {
                        queue.push({ ...neighbor, dist: current.dist + 1 });
                    }
                }
            }
        }
        
        return null;
    }

    updateHUD(time) {
        // Update leaderboard
        const sortedAgents = [...this.agents].sort((a, b) => {
            const aDist = a.getDistanceToGoal();
            const bDist = b.getDistanceToGoal();
            return aDist - bDist;
        });

        // Clear old entries
        this.leaderboardEntries.forEach(entry => entry.destroy());
        this.leaderboardEntries = [];

        // Create new entries - ensure they fit in the panel
        const panelWidth = 180;
        const panelHeight = 200;
        const startY = this.leaderboardPanel.y - panelHeight / 2 + 50;
        const maxEntries = Math.floor((panelHeight - 50) / 25);
        
        sortedAgents.slice(0, maxEntries).forEach((agent, index) => {
            const y = startY + index * 25;
            const name = agent.isPlayer ? 'PLAYER' : `BOT${agent.id + 1}`;
            const distance = Math.floor(agent.getDistanceToGoal());
            const timeElapsed = agent.completionTime 
                ? (agent.completionTime / 1000).toFixed(1) + 's'
                : ((time - agent.startTime) / 1000).toFixed(1) + 's';

            // Truncate text to fit in panel
            const text = `${index + 1}. ${name} ${distance}t ${timeElapsed}`;
            
            const entry = this.add.text(
                this.leaderboardPanel.x - panelWidth / 2 + 5,
                y,
                text,
                {
                    fontSize: '11px',
                    fontFamily: 'Oxanium',
                    color: agent.isPlayer ? '#ffd700' : '#ffffff',
                    wordWrap: { width: panelWidth - 10 }
                }
            );
            entry.setOrigin(0, 0);
            entry.setScrollFactor(0);
            entry.setDepth(1001); // Above panel
            this.leaderboardEntries.push(entry);
        });

        // Update stats
        const elapsed = ((time - this.player.startTime) / 1000).toFixed(1);
        this.statsText.setText(
            `STATS\nTime: ${elapsed}s\nDistance: ${Math.floor(this.player.getDistanceToGoal())} tiles\nFPS: ${Math.floor(this.game.loop.actualFps)}`
        );

        // Update minimap
        if (this.config.showMinimap) {
            this.updateMinimap();
        }
    }

    endGame(winner) {
        this.gameOver = true;
        
        // Save bot models
        this.agents.forEach(agent => {
            if (!agent.isPlayer) {
                agent.saveModel().catch(err => {
                    console.error('Failed to save model:', err);
                });
            }
        });
        
        this.scene.pause();
        this.scene.launch('VictoryScene', { winner, agents: this.agents });
    }
}

