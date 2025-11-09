import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig.js';

export class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
        this.config = GameConfig.getInstance();
    }

    create() {
        const { width, height } = this.cameras.main;

        // Frosted glass overlay
        this.overlay = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.7
        );
        this.overlay.setScrollFactor(0);

        // Title
        const title = this.add.text(
            width / 2,
            height * 0.15,
            'PAUSED',
            {
                fontSize: '48px',
                fontFamily: 'Orbitron',
                fontWeight: '900',
                color: '#ffd700'
            }
        );
        title.setOrigin(0.5);
        title.setScrollFactor(0);

        // Configuration panel
        this.createConfigPanel(width / 2, height * 0.4);

        // Resume button
        const resumeBtn = this.add.text(
            width / 2,
            height * 0.85,
            'RESUME (ESC)',
            {
                fontSize: '24px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#ffffff',
                backgroundColor: '#8b4513',
                padding: { x: 15, y: 10 }
            }
        );
        resumeBtn.setOrigin(0.5);
        resumeBtn.setScrollFactor(0);
        resumeBtn.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.resume('GameScene');
                this.scene.stop();
            });

        // ESC key to resume
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.resume('GameScene');
            this.scene.stop();
        });
    }

    createConfigPanel(x, y) {
        const panelWidth = 600;
        const panelHeight = 400;

        const panel = this.add.rectangle(
            x,
            y,
            panelWidth,
            panelHeight,
            0x1a1a1a,
            0.95
        );
        panel.setStrokeStyle(3, 0xff0000);
        panel.setScrollFactor(0);

        const title = this.add.text(
            x,
            y - panelHeight / 2 + 20,
            'DEVELOPER CONFIGURATION',
            {
                fontSize: '20px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#ff0000'
            }
        );
        title.setOrigin(0.5);
        title.setScrollFactor(0);

        let currentY = y - panelHeight / 2 + 60;

        // Maze Shift Frequency
        currentY = this.createSlider(
            x,
            currentY,
            'Maze Shift Frequency',
            this.config.mazeShiftFrequency,
            2,
            30,
            (value) => {
                this.config.mazeShiftFrequency = value;
            }
        );

        // Bot Count
        currentY = this.createSlider(
            x,
            currentY + 50,
            'Bot Count',
            this.config.botCount,
            1,
            4,
            (value) => {
                this.config.botCount = Math.floor(value);
            },
            true
        );

        // Learning Rate
        currentY = this.createSlider(
            x,
            currentY + 50,
            'Learning Rate',
            this.config.learningRate,
            0,
            1,
            (value) => {
                this.config.learningRate = value;
            }
        );

        // Discount Factor
        currentY = this.createSlider(
            x,
            currentY + 50,
            'Discount Factor (Gamma)',
            this.config.discountFactor,
            0,
            1,
            (value) => {
                this.config.discountFactor = value;
            }
        );
    }

    createSlider(x, y, label, initialValue, min, max, callback, isInteger = false) {
        const labelText = this.add.text(
            x - 200,
            y,
            label,
            {
                fontSize: '14px',
                fontFamily: 'Oxanium',
                color: '#ffffff'
            }
        );
        labelText.setOrigin(0, 0.5);
        labelText.setScrollFactor(0);

        const valueText = this.add.text(
            x + 200,
            y,
            isInteger ? Math.floor(initialValue).toString() : initialValue.toFixed(2),
            {
                fontSize: '14px',
                fontFamily: 'Oxanium',
                color: '#ffd700'
            }
        );
        valueText.setOrigin(1, 0.5);
        valueText.setScrollFactor(0);

        // Slider track
        const trackWidth = 200;
        const track = this.add.rectangle(
            x,
            y,
            trackWidth,
            4,
            0x4a4a4a
        );
        track.setOrigin(0.5);
        track.setScrollFactor(0);

        // Slider handle
        const handleX = x - trackWidth / 2 + (initialValue - min) / (max - min) * trackWidth;
        const handle = this.add.circle(
            handleX,
            y,
            8,
            0xff0000
        );
        handle.setScrollFactor(0);
        handle.setInteractive({ useHandCursor: true });

        // Drag functionality
        this.input.setDraggable(handle);
        handle.on('drag', (pointer, dragX, dragY) => {
            const clampedX = Phaser.Math.Clamp(
                dragX,
                x - trackWidth / 2,
                x + trackWidth / 2
            );
            handle.x = clampedX;
            
            const normalized = (clampedX - (x - trackWidth / 2)) / trackWidth;
            const value = min + normalized * (max - min);
            const finalValue = isInteger ? Math.floor(value) : value;
            
            callback(finalValue);
            valueText.setText(isInteger ? Math.floor(finalValue).toString() : finalValue.toFixed(2));
        });

        return y;
    }
}

