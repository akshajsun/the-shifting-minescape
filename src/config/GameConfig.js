// Game configuration and state management
export class GameConfig {
    constructor() {
        // AI & Learning Settings
        this.botIntelligence = 'learning'; // 'dumb', 'learning', 'expert', 'custom'
        this.customTrainingEpisodes = 100;
        this.learningRate = 0.1;
        this.discountFactor = 0.95;
        this.epsilonStart = 1.0;
        this.epsilonEnd = 0.01;
        this.epsilonDecay = 0.995;
        this.explorationProfile = 'balanced'; // 'cautious', 'balanced', 'aggressive'

        // Gameplay Settings
        this.mazeShiftFrequency = 10; // seconds
        this.mazeComplexity = 0.5; // 0.0 - 1.0
        this.branchDensity = 0.5;
        this.deadEndRatio = 0.3;
        this.corridorWidth = 1;
        this.botCount = 2;
        this.collisionStunDuration = 1000; // ms
        this.collisionRadius = 20;
        this.collisionEnabled = false; // Disabled by default - agents can move through each other

        // Visual Settings
        this.particleEffects = true;
        this.animations = true;
        this.showMinimap = true;
        this.showStats = true;

        // Performance
        this.rlUpdateFrequency = 150; // ms
    }

    static getInstance() {
        if (!GameConfig.instance) {
            GameConfig.instance = new GameConfig();
        }
        return GameConfig.instance;
    }

    updateFromUI(settings) {
        Object.assign(this, settings);
    }

    getEpsilonDecayRate() {
        switch (this.explorationProfile) {
            case 'cautious':
                return 0.999;
            case 'aggressive':
                return 0.99;
            default:
                return 0.995;
        }
    }

    getTrainingEpisodes() {
        switch (this.botIntelligence) {
            case 'dumb':
                return 0;
            case 'learning':
                return 50;
            case 'expert':
                return 1000;
            case 'custom':
                return this.customTrainingEpisodes;
            default:
                return 50;
        }
    }
}

