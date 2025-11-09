import { Agent } from './Agent.js';
import { DQNAgent } from '../ai/DQNAgent.js';
import { findPath } from '../pathfinding/AStar.js';
import * as tf from '@tensorflow/tfjs';

export class Bot extends Agent {
    constructor(scene, x, y, color, id, config) {
        super(scene, x, y, color, false);
        this.id = id;
        this.config = config;
        this.path = []; // Path calculated by A*
        
        // RL Agent
        // State size: 25 (5x5 grid) + 3 (goal dx, dy, distance) + 4 (2 agents * 2 coords) = 32
        const stateSize = 32;
        const actionSize = 4; // up, down, left, right
        this.rlAgent = new DQNAgent(stateSize, actionSize, config);
        
        // Action mapping
        this.actions = ['up', 'down', 'left', 'right'];
        this.lastAction = null;
        this.lastState = null;
        this.lastReward = 0;
        this.decisionTimer = 0;
        
        // Training
        this.trainingEpisodes = config.getTrainingEpisodes();
        this.currentEpisode = 0;
        
        // Track position for stuck detection
        this.lastPosition = { x: this.x, y: this.y };
    }

    update(time, delta) {
        super.update(time, delta);
        
        this.decisionTimer += delta;
        
        // Make decision at configured frequency
        if (this.decisionTimer >= this.config.rlUpdateFrequency) {
            this.makeDecision(time);
            this.decisionTimer = 0;
        }
    }

    onMazeShift() {
        // Reset the last state to force a full re-evaluation of the new maze
        this.lastState = null;
        // Recalculate path after maze shifts
        this.recalculatePath();
    }

    recalculatePath() {
        const mazeGrid = this.scene.mazeGenerator.grid;
        const start = { x: Math.floor(this.x / 32), y: Math.floor(this.y / 32) };
        const end = this.scene.mazeGenerator.getEndPosition();

        const newPath = findPath(mazeGrid, start, end);
        if (newPath && newPath.length > 1) {
            this.path = this.convertPositionsToDirections(newPath);
        } else {
            this.path = [];
        }
    }

    convertPositionsToDirections(path) {
        const directions = [];
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i+1].x - path[i].x;
            const dy = path[i+1].y - path[i].y;
            if (dx === 1) directions.push('right');
            else if (dx === -1) directions.push('left');
            else if (dy === 1) directions.push('down');
            else if (dy === -1) directions.push('up');
        }
        return directions;
    }

    makeDecision(time) {
        // If we have a valid path from A*, follow it.
        if (this.path && this.path.length > 0) {
            const direction = this.path.shift();
            this.move(direction);
            return;
        }

        // --- Fallback to RL if no A* path is available ---
        const state = this.getState();
        const action = this.rlAgent.act(state, true);
        const direction = this.actions[action];
        
        // Store for learning
        if (this.lastState !== null) {
            const reward = this.calculateReward();
            const done = this.hasReachedGoal();
            
            this.rlAgent.remember(
                this.lastState,
                this.lastAction,
                reward,
                state,
                done
            );
            
            if (this.rlAgent.memory.length > this.rlAgent.batchSize) {
                this.rlAgent.replay().catch(err => {
                    console.warn('Replay error:', err);
                });
            }
            
            if (done) {
                this.rlAgent.endEpisode(this.lastReward);
                this.currentEpisode++;
            }
        }
        
        this.lastState = state;
        this.lastAction = action;
        this.move(direction);
    }

    getState() {
        if (!this.scene || !this.scene.mazeGenerator) {
            return Array(32).fill(0);
        }
        
        // Get 5x5 grid around bot
        const gridSize = 5;
        const state = [];
        const gridX = Math.floor(this.x / 32);
        const gridY = Math.floor(this.y / 32);
        
        // Local maze view
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const x = gridX + dx;
                const y = gridY + dy;
                state.push(this.scene.mazeGenerator.isWalkable(x, y) ? 1 : 0);
            }
        }
        
        // Goal direction and distance
        const goal = this.scene.mazeGenerator.getEndPosition();
        const goalDx = goal.x - gridX;
        const goalDy = goal.y - gridY;
        const goalDistance = Math.sqrt(goalDx * goalDx + goalDy * goalDy);
        state.push(goalDx / 20); // Normalized
        state.push(goalDy / 20);
        state.push(goalDistance / 50); // Normalized
        
        // Other agents positions (normalized)
        const otherAgents = (this.scene.agents || []).filter(a => a !== this);
        for (let i = 0; i < 2; i++) {
            if (i < otherAgents.length) {
                const agent = otherAgents[i];
                const agentGridX = Math.floor(agent.x / 32);
                const agentGridY = Math.floor(agent.y / 32);
                state.push((agentGridX - gridX) / 20);
                state.push((agentGridY - gridY) / 20);
            } else {
                state.push(0);
                state.push(0);
            }
        }
        
        return state;
    }

    calculateReward() {
        let reward = 0;
        
        // Reward for getting closer to goal
        const oldDistance = this.distanceToGoal;
        this.distanceToGoal = this.getDistanceToGoal();
        const distanceDelta = oldDistance - this.distanceToGoal;
        reward += distanceDelta * 10;
        
        // Large reward for reaching goal
        if (this.hasReachedGoal()) {
            reward += 100;
        }
        
        // Penalty for collisions
        if (this.stunned) {
            reward -= 20;
        }
        
        // Small penalty for each step (encourage efficiency)
        reward -= 0.1;
        
        this.lastReward = reward;
        return reward;
    }

    hasReachedGoal() {
        if (!this.scene || !this.scene.mazeGenerator) return false;
        const goal = this.scene.mazeGenerator.getEndPosition();
        const gridX = Math.floor(this.x / 32);
        const gridY = Math.floor(this.y / 32);
        return gridX === goal.x && gridY === goal.y;
    }

    getConfidence() {
        return this.rlAgent.getConfidence();
    }

    async saveModel() {
        await this.rlAgent.saveModel();
    }

    async loadModel() {
        await this.rlAgent.loadModel();
    }
}

