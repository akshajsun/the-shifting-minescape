import * as tf from '@tensorflow/tfjs';

// Deep Q-Network implementation for bot AI
export class DQNAgent {
    constructor(stateSize, actionSize, config) {
        this.stateSize = stateSize;
        this.actionSize = actionSize;
        this.config = config;
        
        // Hyperparameters
        this.learningRate = config.learningRate || 0.1;
        this.gamma = config.discountFactor || 0.95;
        this.epsilon = config.epsilonStart || 1.0;
        this.epsilonMin = config.epsilonEnd || 0.01;
        this.epsilonDecay = config.getEpsilonDecayRate ? config.getEpsilonDecayRate() : 0.995;
        
        // Experience replay
        this.memory = [];
        this.memorySize = 10000;
        this.batchSize = 32;
        
        // Initialize TensorFlow backend
        this.initializeBackend();
        
        // Neural network
        this.model = this.buildModel();
        this.targetModel = this.buildModel();
        this.updateTargetNetwork();
        
        // Training stats
        this.episodeRewards = [];
        this.episodeCount = 0;
        this.totalReward = 0;
    }

    async initializeBackend() {
        try {
            // Ensure backend is ready
            await tf.ready();
        } catch (e) {
            console.warn('TensorFlow.js backend initialization warning:', e);
        }
    }

    buildModel() {
        const model = tf.sequential();
        
        // Input layer
        model.add(tf.layers.dense({
            inputShape: [this.stateSize],
            units: 128,
            activation: 'relu'
        }));
        
        // Hidden layers
        model.add(tf.layers.dense({
            units: 128,
            activation: 'relu'
        }));
        
        model.add(tf.layers.dense({
            units: 64,
            activation: 'relu'
        }));
        
        // Output layer
        model.add(tf.layers.dense({
            units: this.actionSize,
            activation: 'linear'
        }));
        
        model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'meanSquaredError'
        });
        
        return model;
    }

    remember(state, action, reward, nextState, done) {
        this.memory.push({ state, action, reward, nextState, done });
        if (this.memory.length > this.memorySize) {
            this.memory.shift();
        }
    }

    act(state, training = true) {
        if (training && Math.random() <= this.epsilon) {
            return Math.floor(Math.random() * this.actionSize);
        }
        
        const stateTensor = tf.tensor2d([state]);
        const qValues = this.model.predict(stateTensor);
        const action = qValues.argMax(1).dataSync()[0];
        
        stateTensor.dispose();
        qValues.dispose();
        
        return action;
    }

    async replay() {
        if (this.memory.length < this.batchSize) {
            return;
        }
        
        try {
            const batch = this.sampleBatch();
            const states = batch.map(e => e.state);
            const nextStates = batch.map(e => e.nextState);
            const actions = batch.map(e => e.action);
            const rewards = batch.map(e => e.reward);
            const dones = batch.map(e => e.done);
            
            // Ensure backend is ready
            await tf.ready();
            
            const statesTensor = tf.tensor2d(states);
            const nextStatesTensor = tf.tensor2d(nextStates);
            
            const currentQValues = this.model.predict(statesTensor);
            const nextQValues = this.targetModel.predict(nextStatesTensor);
            
            // Convert tensors to arrays
            const targets = currentQValues.arraySync();
            const nextQValuesArray = nextQValues.arraySync();
            
            for (let i = 0; i < batch.length; i++) {
                if (dones[i]) {
                    targets[i][actions[i]] = rewards[i];
                } else {
                    targets[i][actions[i]] = rewards[i] + this.gamma * Math.max(...nextQValuesArray[i]);
                }
            }
            
            const targetsTensor = tf.tensor2d(targets);
            
            await this.model.fit(statesTensor, targetsTensor, {
                epochs: 1,
                verbose: 0
            });
            
            // Cleanup
            statesTensor.dispose();
            nextStatesTensor.dispose();
            currentQValues.dispose();
            nextQValues.dispose();
            targetsTensor.dispose();
            
            // Decay epsilon
            if (this.epsilon > this.epsilonMin) {
                this.epsilon *= this.epsilonDecay;
            }
        } catch (error) {
            console.warn('Error in replay:', error);
            // Continue without crashing
        }
    }

    sampleBatch() {
        const batch = [];
        for (let i = 0; i < this.batchSize; i++) {
            batch.push(this.memory[Math.floor(Math.random() * this.memory.length)]);
        }
        return batch;
    }

    updateTargetNetwork() {
        this.targetModel.setWeights(this.model.getWeights());
    }

    endEpisode(reward) {
        this.episodeCount++;
        this.totalReward += reward;
        this.episodeRewards.push(reward);
        
        // Keep only last 100 episodes
        if (this.episodeRewards.length > 100) {
            this.episodeRewards.shift();
        }
        
        // Update target network every 10 episodes
        if (this.episodeCount % 10 === 0) {
            this.updateTargetNetwork();
        }
    }

    getConfidence() {
        // Confidence based on epsilon (lower epsilon = more confident)
        return 1 - (this.epsilon - this.epsilonMin) / (1 - this.epsilonMin);
    }

    async saveModel() {
        await this.model.save('indexeddb://dqn-model');
    }

    async loadModel() {
        try {
            const model = await tf.loadLayersModel('indexeddb://dqn-model');
            this.model = model;
            
            // Re-compile the model after loading
            this.model.compile({
                optimizer: tf.train.adam(this.learningRate),
                loss: 'meanSquaredError'
            });

            this.targetModel = this.buildModel();
            this.updateTargetNetwork();
        } catch (e) {
            console.log('No saved model found');
        }
    }
}

