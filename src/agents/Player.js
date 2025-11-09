import { Agent } from './Agent.js';

export class Player extends Agent {
    constructor(scene, x, y) {
        super(scene, x, y, 0xffd700, true); // Gold color for player
        this.keys = scene.input.keyboard.addKeys('W,S,A,D,UP,DOWN,LEFT,RIGHT');
        this.isMoving = false; // Prevent multiple moves at once
        this.targetX = x;
        this.targetY = y;
    }

    update(time, delta) {
        super.update(time, delta);

        if (this.stunned || this.isMoving) {
            return;
        }

        // Handle input - only move if not already moving
        let direction = null;
        if (this.keys.W.isDown || this.keys.UP.isDown) {
            direction = 'up';
        } else if (this.keys.S.isDown || this.keys.DOWN.isDown) {
            direction = 'down';
        } else if (this.keys.A.isDown || this.keys.LEFT.isDown) {
            direction = 'left';
        } else if (this.keys.D.isDown || this.keys.RIGHT.isDown) {
            direction = 'right';
        }

        if (direction) {
            this.isMoving = true;
            // Call parent's move method with a callback to reset isMoving
            this.move(direction, () => {
                this.isMoving = false;
            });
        }
    }
}

