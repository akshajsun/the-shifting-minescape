import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.config = GameConfig.getInstance();
    }

    create() {
        const { width, height } = this.cameras.main;

        // Parallax background layers
        this.createParallaxBackground();

        // Title with animated pickaxe
        this.createTitle(width / 2, height * 0.2);

        // Menu buttons
        this.createButtons(width / 2, height * 0.6);

        // Background music (placeholder)
        // this.sound.play('menu_music', { loop: true, volume: 0.5 });
    }

    createParallaxBackground() {
        const { width, height } = this.cameras.main;
        
        // Create layered background with mining theme
        this.bgLayer1 = this.add.rectangle(0, 0, width, height, 0x2c1810);
        this.bgLayer1.setOrigin(0, 0);
        
        // Add some texture/pattern
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Phaser.Math.Between(5, 15);
            this.add.circle(x, y, size, 0x3d2817, 0.3);
        }
    }

    createTitle(x, y) {
        // Main title
        const title = this.add.text(x, y, 'THE SHIFTING\nMINESCAPE', {
            fontSize: '64px',
            fontFamily: 'Orbitron',
            fontWeight: '900',
            color: '#ffd700',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        });
        title.setOrigin(0.5);

        // Animated pickaxe icon
        const pickaxe = this.add.text(x, y - 100, '⛏', {
            fontSize: '80px'
        });
        pickaxe.setOrigin(0.5);

        // Swing animation
        this.tweens.add({
            targets: pickaxe,
            angle: { from: -30, to: 30 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Glow effect
        this.tweens.add({
            targets: title,
            alpha: { from: 0.8, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
    }

    createButtons(x, y) {
        const buttonStyle = {
            fontSize: '32px',
            fontFamily: 'Oxanium',
            fontWeight: '700',
            color: '#ffffff',
            backgroundColor: '#8b4513',
            padding: { x: 20, y: 15 }
        };

        const hoverStyle = {
            backgroundColor: '#a0522d',
            scale: 1.1
        };

        // Start Game button
        const startBtn = this.add.text(x, y, 'START GAME', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                startBtn.setStyle(hoverStyle);
                this.tweens.add({
                    targets: startBtn,
                    scale: 1.1,
                    duration: 200
                });
            })
            .on('pointerout', () => {
                startBtn.setStyle(buttonStyle);
                this.tweens.add({
                    targets: startBtn,
                    scale: 1,
                    duration: 200
                });
            })
            .on('pointerdown', () => {
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('GameScene');
                });
            });

        // Settings button
        const settingsBtn = this.add.text(x, y + 80, 'SETTINGS', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                settingsBtn.setStyle(hoverStyle);
                this.tweens.add({
                    targets: settingsBtn,
                    scale: 1.1,
                    duration: 200
                });
            })
            .on('pointerout', () => {
                settingsBtn.setStyle(buttonStyle);
                this.tweens.add({
                    targets: settingsBtn,
                    scale: 1,
                    duration: 200
                });
            })
            .on('pointerdown', () => {
                // Open settings overlay
                this.showSettings();
            });

        // Add glow effects
        [startBtn, settingsBtn].forEach(btn => {
            this.tweens.add({
                targets: btn,
                alpha: { from: 0.9, to: 1 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    showSettings() {
        const { width, height } = this.cameras.main;

        // Create overlay
        const overlay = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.8
        );
        overlay.setDepth(100);
        overlay.setInteractive();

        // Settings panel
        const panelWidth = 600;
        const panelHeight = 500;
        const panel = this.add.rectangle(
            width / 2,
            height / 2,
            panelWidth,
            panelHeight,
            0x1a1a1a,
            0.95
        );
        panel.setStrokeStyle(3, 0xff0000);
        panel.setDepth(101);

        // Title
        const title = this.add.text(
            width / 2,
            height / 2 - panelHeight / 2 + 30,
            'SETTINGS',
            {
                fontSize: '36px',
                fontFamily: 'Orbitron',
                fontWeight: '900',
                color: '#ffd700'
            }
        );
        title.setOrigin(0.5);
        title.setDepth(102);

        // Close button
        const closeBtn = this.add.text(
            width / 2 + panelWidth / 2 - 30,
            height / 2 - panelHeight / 2 + 30,
            '✕',
            {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#ffffff',
                backgroundColor: '#8b4513',
                padding: { x: 10, y: 5 }
            }
        );
        closeBtn.setOrigin(0.5);
        closeBtn.setDepth(102);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            overlay.destroy();
            panel.destroy();
            title.destroy();
            closeBtn.destroy();
            this.settingsElements.forEach(el => el.destroy());
        });

        // Settings content
        this.settingsElements = [];
        let currentY = height / 2 - panelHeight / 2 + 100;

        // Bot Count
        currentY = this.createSettingsSlider(
            width / 2,
            currentY,
            'Bot Count',
            this.config.botCount,
            1,
            4,
            (value) => {
                this.config.botCount = Math.floor(value);
            },
            true
        );

        // Maze Shift Frequency
        currentY = this.createSettingsSlider(
            width / 2,
            currentY + 50,
            'Maze Shift Frequency (seconds)',
            this.config.mazeShiftFrequency,
            2,
            30,
            (value) => {
                this.config.mazeShiftFrequency = value;
            }
        );

        // Learning Rate
        currentY = this.createSettingsSlider(
            width / 2,
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
        currentY = this.createSettingsSlider(
            width / 2,
            currentY + 50,
            'Discount Factor (Gamma)',
            this.config.discountFactor,
            0,
            1,
            (value) => {
                this.config.discountFactor = value;
            }
        );

        // Store references for cleanup
        this.settingsElements.push(overlay, panel, title, closeBtn);
    }

    createSettingsSlider(x, y, label, initialValue, min, max, callback, isInteger = false) {
        const labelText = this.add.text(
            x - 250,
            y,
            label,
            {
                fontSize: '18px',
                fontFamily: 'Oxanium',
                color: '#ffffff'
            }
        );
        labelText.setOrigin(0, 0.5);
        labelText.setDepth(102);
        this.settingsElements.push(labelText);

        const valueText = this.add.text(
            x + 250,
            y,
            isInteger ? Math.floor(initialValue).toString() : initialValue.toFixed(2),
            {
                fontSize: '18px',
                fontFamily: 'Oxanium',
                color: '#ffd700'
            }
        );
        valueText.setOrigin(1, 0.5);
        valueText.setDepth(102);
        this.settingsElements.push(valueText);

        // Slider track
        const trackWidth = 300;
        const track = this.add.rectangle(
            x,
            y,
            trackWidth,
            6,
            0x4a4a4a
        );
        track.setOrigin(0.5);
        track.setDepth(102);
        this.settingsElements.push(track);

        // Slider handle
        const handleX = x - trackWidth / 2 + (initialValue - min) / (max - min) * trackWidth;
        const handle = this.add.circle(
            handleX,
            y,
            10,
            0xff0000
        );
        handle.setDepth(103);
        handle.setInteractive({ useHandCursor: true });
        this.settingsElements.push(handle);

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

    update() {
        // Parallax scrolling
        if (this.bgLayer1) {
            // Subtle movement
        }
    }
}

