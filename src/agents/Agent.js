// Base agent class for player and bots
export class Agent {
    constructor(scene, x, y, color, isPlayer = false) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.color = color;
        this.isPlayer = isPlayer;
        this.speed = 100;
        this.radius = 15;
        this.stunned = false;
        this.stunEndTime = 0;
        this.score = 0;
        this.startTime = Date.now();
        this.completionTime = null;
        this.path = [];
        this.distanceToGoal = 0;

        // Create Phaser sprite
        this.sprite = scene.add.circle(x, y, this.radius, color);
        this.sprite.setStrokeStyle(2, 0xffffff);
        this.sprite.setDepth(10); // Above maze, below UI
        
        // Add glow effect
        this.glow = scene.add.circle(x, y, this.radius + 5, color, 0.3);
        this.glow.setBlendMode(Phaser.BlendModes.ADD);
        this.glow.setDepth(9); // Just below agent

        // Physics body
        scene.physics.add.existing(this.sprite);
        this.body = this.sprite.body;
        this.body.setCollideWorldBounds(false);
        this.body.setCircle(this.radius);

        // Trail effect
        this.trail = [];
        this.maxTrailLength = 10;
        
        // Dust particles
        this.dustParticles = [];
        
        // Ensure not stunned initially
        this.stunned = false;
        this.stunEndTime = 0;
    }

    update(time, delta) {
        // Only apply stun if collisions are enabled
        const collisionsEnabled = this.scene && this.scene.config && this.scene.config.collisionEnabled;
        
        if (this.stunned && collisionsEnabled && time < this.stunEndTime) {
            return;
        } else if (this.stunned) {
            this.stunned = false;
            // Clear stun visual immediately if collisions disabled
            if (!collisionsEnabled) {
                this.sprite.setFillStyle(this.color);
                this.glow.setFillStyle(this.color, 0.3);
            }
        }

        // Update glow based on confidence (for bots)
        if (!this.isPlayer) {
            const confidence = this.getConfidence ? this.getConfidence() : 0.5;
            this.glow.setAlpha(0.2 + confidence * 0.3);
        }

        // Update trail
        this.trail.push({ x: this.sprite.x, y: this.sprite.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Create dust particles occasionally
        if (Math.random() > 0.95 && this.scene && this.scene.config && this.scene.config.particleEffects) {
            const dust = this.scene.add.circle(
                this.sprite.x + Phaser.Math.Between(-5, 5),
                this.sprite.y + Phaser.Math.Between(-5, 5),
                2,
                0x8b7355,
                0.6
            );
            dust.setDepth(8); // Below agents but above maze
            this.scene.tweens.add({
                targets: dust,
                alpha: 0,
                y: dust.y + Phaser.Math.Between(5, 15),
                duration: 500,
                onComplete: () => dust.destroy()
            });
        }

        // Update position
        this.x = this.sprite.x;
        this.y = this.sprite.y;
    }

    onMazeShift() {
        // Intended to be overridden by subclasses
    }

    move(direction, onComplete = null) {
        // Only block movement if stunned AND collisions are enabled
        if (this.stunned && this.scene && this.scene.config && this.scene.config.collisionEnabled) {
            if (onComplete) onComplete();
            return;
        }

        // Grid-based movement - move one cell at a time
        const tileSize = 32;
        const currentGridX = Math.floor(this.sprite.x / tileSize);
        const currentGridY = Math.floor(this.sprite.y / tileSize);
        
        let newGridX = currentGridX;
        let newGridY = currentGridY;
        
        if (direction === 'up') newGridY -= 1;
        else if (direction === 'down') newGridY += 1;
        else if (direction === 'left') newGridX -= 1;
        else if (direction === 'right') newGridX += 1;
        
        // Check if new cell is walkable
        if (this.scene && this.scene.mazeGenerator && 
            this.scene.mazeGenerator.isWalkable(newGridX, newGridY)) {
            
            // Move to center of new cell
            const newX = newGridX * tileSize + tileSize / 2;
            const newY = newGridY * tileSize + tileSize / 2;
            
            // Smooth animation to new cell
            this.scene.tweens.add({
                targets: [this.sprite, this.glow],
                x: newX,
                y: newY,
                duration: 150, // Faster animation
                ease: 'Power2',
                onComplete: () => {
                    // Update position immediately for collision checks
                    this.x = newX;
                    this.y = newY;
                    if (onComplete) {
                        onComplete();
                    }
                }
            });
        } else {
            // If move is invalid, immediately call onComplete
            if (onComplete) {
                onComplete();
            }
        }
    }

    canMoveTo(x, y) {
        if (!this.scene || !this.scene.mazeGenerator) return false;
        
        const tileSize = 32;
        const gridX = Math.floor(x / tileSize);
        const gridY = Math.floor(y / tileSize);
        
        // Simple check - just verify the cell is walkable
        return this.scene.mazeGenerator.isWalkable(gridX, gridY);
    }

    stun(duration) {
        this.stunned = true;
        this.stunEndTime = this.scene.time.now + duration;
        // Visual feedback - change fill color and add pulse effect
        const originalColor = this.color;
        this.sprite.setFillStyle(0xff0000);
        this.glow.setFillStyle(0xff0000, 0.5);
        
        // Pulse animation
        this.scene.tweens.add({
            targets: this.sprite,
            scale: { from: 1, to: 1.2 },
            duration: duration / 2,
            yoyo: true,
            repeat: 1
        });
        
        this.scene.time.delayedCall(duration, () => {
            this.sprite.setFillStyle(originalColor);
            this.glow.setFillStyle(this.color, 0.3);
        });
    }

    reachGoal() {
        if (!this.completionTime) {
            this.completionTime = Date.now() - this.startTime;
        }
    }

    destroy() {
        this.sprite.destroy();
        this.glow.destroy();
    }

    getDistanceToGoal() {
        if (!this.scene || !this.scene.mazeGenerator) return Infinity;
        const goal = this.scene.mazeGenerator.getEndPosition();
        const gridX = Math.floor(this.x / 32);
        const gridY = Math.floor(this.y / 32);
        return Math.sqrt(
            Math.pow(gridX - goal.x, 2) + Math.pow(gridY - goal.y, 2)
        );
    }
}

