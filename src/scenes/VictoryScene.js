import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    init(data) {
        this.winner = data.winner;
        this.agents = data.agents;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.9
        );

        // Winner announcement
        const winnerName = this.winner.isPlayer ? 'PLAYER' : `BOT ${this.winner.id + 1}`;
        const winnerText = this.add.text(
            width / 2,
            height * 0.3,
            `${winnerName} WINS!`,
            {
                fontSize: '64px',
                fontFamily: 'Orbitron',
                fontWeight: '900',
                color: '#ffd700',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        winnerText.setOrigin(0.5);
        winnerText.setAlpha(0);

        // Animate winner text
        this.tweens.add({
            targets: winnerText,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 500,
            ease: 'Back.easeOut'
        });

        // Confetti/dust effect
        this.createConfetti();

        // Stats panel
        this.createStatsPanel(width / 2, height * 0.55);

        // Rematch button
        const rematchBtn = this.add.text(
            width / 2 + 100,
            height * 0.85,
            'REMATCH',
            {
                fontSize: '32px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#ffffff',
                backgroundColor: '#8b4513',
                padding: { x: 20, y: 15 }
            }
        );
        rematchBtn.setOrigin(0.5);
        rematchBtn.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.tweens.add({ targets: rematchBtn, scale: 1.1, duration: 200 });
            })
            .on('pointerout', () => {
                this.tweens.add({ targets: rematchBtn, scale: 1, duration: 200 });
            })
            .on('pointerdown', () => {
                this.scene.start('GameScene');
            });

        // Home button
        const homeBtn = this.add.text(
            width / 2 - 100,
            height * 0.85,
            'HOME',
            {
                fontSize: '32px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#ffffff',
                backgroundColor: '#4a4a4a',
                padding: { x: 20, y: 15 }
            }
        );
        homeBtn.setOrigin(0.5);
        homeBtn.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.tweens.add({ targets: homeBtn, scale: 1.1, duration: 200 });
            })
            .on('pointerout', () => {
                this.tweens.add({ targets: homeBtn, scale: 1, duration: 200 });
            })
            .on('pointerdown', () => {
                this.scene.stop('GameScene');
                this.scene.start('MenuScene');
            });
    }

    createConfetti() {
        const { width, height } = this.cameras.main;
        const colors = [0xffd700, 0xff0000, 0x0000ff, 0x00ff00];

        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = -20;
            const color = colors[Phaser.Math.Between(0, colors.length - 1)];
            const particle = this.add.circle(x, y, 5, color);
            
            this.tweens.add({
                targets: particle,
                y: height + 20,
                x: x + Phaser.Math.Between(-100, 100),
                rotation: Phaser.Math.Between(0, 360),
                duration: Phaser.Math.Between(2000, 4000),
                ease: 'Power2'
            });
        }
    }

    createStatsPanel(x, y) {
        const panelWidth = 500;
        const panelHeight = 200;

        const panel = this.add.rectangle(
            x,
            y,
            panelWidth,
            panelHeight,
            0x1a1a1a,
            0.9
        );
        panel.setStrokeStyle(2, 0xffd700);

        let statsY = y - panelHeight / 2 + 30;
        const statsText = this.add.text(
            x,
            statsY,
            'COMPLETION TIMES',
            {
                fontSize: '18px',
                fontFamily: 'Oxanium',
                fontWeight: '700',
                color: '#ffd700'
            }
        );
        statsText.setOrigin(0.5);

        // Sort agents by completion time
        const sortedAgents = [...this.agents].sort((a, b) => {
            const aTime = a.completionTime || Infinity;
            const bTime = b.completionTime || Infinity;
            return aTime - bTime;
        });

        sortedAgents.forEach((agent, index) => {
            statsY += 30;
            const name = agent.isPlayer ? 'PLAYER' : `BOT ${agent.id + 1}`;
            const time = agent.completionTime 
                ? (agent.completionTime / 1000).toFixed(2) + 's'
                : 'DNF';
            
            const entry = this.add.text(
                x,
                statsY,
                `${index + 1}. ${name}: ${time}`,
                {
                    fontSize: '16px',
                    fontFamily: 'Oxanium',
                    color: agent === this.winner ? '#ffd700' : '#ffffff'
                }
            );
            entry.setOrigin(0.5);
        });
    }
}

