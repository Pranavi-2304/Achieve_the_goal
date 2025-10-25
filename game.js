// Game State
const gameState = {
    currentLevel: 1,
    completedLevels: new Set(),
    isPlaying: false,
    score: 0,
    coins: 0,
    lives: 3,
    maxLives: 3,
    timeStarted: 0,
    bestTimes: {},
    combo: 0,
    maxCombo: 0,
    checkpointReached: false,
    checkpointX: 0,
    powerUps: {
        doubleJump: false,
        shield: false,
        magnetCoin: false
    },
    reverseGravity: false,
    slowMotion: false,
    paintTrail: [],
    weatherEffect: 'none' // rain, snow, wind
};

// Particle system
const particles = [];
const clouds = [];

class Cloud {
    constructor() {
        this.x = Math.random() * canvas.width + camera.x;
        this.y = Math.random() * 200;
        this.width = 80 + Math.random() * 120;
        this.height = 40 + Math.random() * 40;
        this.speed = 0.3 + Math.random() * 0.5;
        this.opacity = 0.3 + Math.random() * 0.4;
    }
    
    update() {
        this.x += this.speed;
        if (this.x - camera.x > canvas.width + 200) {
            this.x = camera.x - 200;
            this.y = Math.random() * 200;
        }
    }
    
    draw(ctx, camera) {
        const x = this.x - camera.x;
        const y = this.y - camera.y;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ffffff';
        
        // Draw cloud shape
        ctx.beginPath();
        ctx.arc(x, y, this.height * 0.6, 0, Math.PI * 2);
        ctx.arc(x + this.width * 0.3, y - this.height * 0.2, this.height * 0.5, 0, Math.PI * 2);
        ctx.arc(x + this.width * 0.6, y, this.height * 0.7, 0, Math.PI * 2);
        ctx.arc(x + this.width * 0.8, y + this.height * 0.1, this.height * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Initialize clouds
function initClouds() {
    clouds.length = 0;
    for (let i = 0; i < 8; i++) {
        clouds.push(new Cloud());
    }
}

// Camera shake
let cameraShake = { x: 0, y: 0, intensity: 0, duration: 0 };

function shakeCamera(intensity, duration) {
    cameraShake.intensity = intensity;
    cameraShake.duration = duration;
}

function updateCameraShake() {
    if (cameraShake.duration > 0) {
        cameraShake.x = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.y = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.duration--;
    } else {
        cameraShake.x = 0;
        cameraShake.y = 0;
    }
}

class Particle {
    constructor(x, y, color, type = 'confetti') {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 3;
        this.color = color;
        this.size = Math.random() * 5 + 3;
        this.life = 1;
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3; // gravity
        this.life -= 0.02;
        this.rotation += this.rotationSpeed;
    }
    
    draw(ctx, camera) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        if (this.type === 'star') {
            this.drawStar(ctx);
        } else {
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        }
        ctx.restore();
    }
    
    drawStar(ctx) {
        const spikes = 5;
        const outerRadius = this.size;
        const innerRadius = this.size / 2;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

// Coins
const coins = [];

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.collected = false;
        this.rotation = 0;
        this.bobOffset = 0;
    }
    
    update() {
        this.rotation += 0.1;
        this.bobOffset = Math.sin(Date.now() / 300) * 5;
    }
    
    draw(ctx, camera) {
        if (this.collected) return;
        
        const x = this.x - camera.x;
        const y = this.y - camera.y + this.bobOffset;
        
        ctx.save();
        ctx.translate(x + this.width/2, y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Outer circle
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = '#ffed4e';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Dollar sign
        ctx.fillStyle = '#ff8c00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y + this.bobOffset,
            width: this.width,
            height: this.height
        };
    }
}

// Power-ups
const powerUps = [];

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type; // doubleJump, shield, magnetCoin
        this.collected = false;
        this.bobOffset = 0;
        this.rotation = 0;
    }
    
    update() {
        this.rotation += 0.05;
        this.bobOffset = Math.sin(Date.now() / 200) * 8;
    }
    
    draw(ctx, camera) {
        if (this.collected) return;
        
        const x = this.x - camera.x;
        const y = this.y - camera.y + this.bobOffset;
        
        ctx.save();
        ctx.translate(x + this.width/2, y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.getColor();
        
        // Draw based on type
        if (this.type === 'doubleJump') {
            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↑↑', 0, 0);
        } else if (this.type === 'shield') {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 28px Arial';
            ctx.fillText('🛡️', 0, 0);
        } else if (this.type === 'magnetCoin') {
            ctx.fillStyle = '#ff00ff';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('🧲', 0, 0);
        }
        
        ctx.restore();
    }
    
    getColor() {
        if (this.type === 'doubleJump') return '#00ffff';
        if (this.type === 'shield') return '#ffff00';
        if (this.type === 'magnetCoin') return '#ff00ff';
        return '#ffffff';
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y + this.bobOffset,
            width: this.width,
            height: this.height
        };
    }
}

// Weather effects
const weatherParticles = [];

class WeatherParticle {
    constructor(type) {
        this.type = type;
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * canvas.width + camera.x;
        this.y = this.type === 'rain' || this.type === 'snow' ? -10 : Math.random() * canvas.height;
        
        if (this.type === 'rain') {
            this.speedX = 2;
            this.speedY = 15;
            this.size = 2;
        } else if (this.type === 'snow') {
            this.speedX = Math.random() * 2 - 1;
            this.speedY = 2 + Math.random() * 2;
            this.size = 3 + Math.random() * 3;
        } else if (this.type === 'rainbow') {
            this.speedX = 0;
            this.speedY = 0;
            this.size = 5;
            this.angle = Math.random() * Math.PI * 2;
        }
    }
    
    update() {
        if (this.type === 'rainbow') {
            this.angle += 0.02;
            return;
        }
        
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.y > canvas.height + camera.y || this.x < camera.x - 100 || this.x > camera.x + canvas.width + 100) {
            this.reset();
        }
    }
    
    draw(ctx, camera) {
        const x = this.x - camera.x;
        const y = this.y - camera.y;
        
        if (this.type === 'rain') {
            ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
            ctx.lineWidth = this.size;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + this.speedX * 3, y + this.speedY * 2);
            ctx.stroke();
        } else if (this.type === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Player
const player = {
    x: 100,
    y: 100,
    width: 30,
    height: 30,
    velocityX: 0,
    velocityY: 0,
    speed: 5,
    jumpPower: 15,
    isJumping: false,
    onGround: false,
    direction: 1, // 1 = right, -1 = left
    isMoving: false,
    jumpsLeft: 1,
    hasShield: false,
    color: '#3b82f6'
};

// Game physics
const gravity = 0.6;
const friction = 0.8;

// Birds (enemies for level 2)
let birds = [];

class Bird {
    constructor(x, y, speed, amplitude) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.width = 40;
        this.height = 30;
        this.speed = speed;
        this.amplitude = amplitude; // How much the bird moves up and down
        this.angle = 0;
        this.wingFlap = 0;
    }
    
    update() {
        this.x -= this.speed;
        this.angle += 0.05;
        this.y = this.startY + Math.sin(this.angle) * this.amplitude;
        this.wingFlap += 0.2;
        
        // Reset bird position when it goes off screen
        if (this.x < -100) {
            this.x = camera.x + canvas.width + 200;
        }
    }
    
    draw(ctx, camera) {
        const x = this.x - camera.x;
        const y = this.y - camera.y;
        
        ctx.save();
        ctx.translate(x + this.width/2, y + this.height/2);
        
        // Bird body
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings
        const wingAngle = Math.sin(this.wingFlap) * 0.3;
        ctx.fillStyle = '#654321';
        
        // Left wing
        ctx.beginPath();
        ctx.ellipse(-8, -3, 15, 8, -0.5 - wingAngle, 0, Math.PI * 2);
        ctx.fill();
        
        // Right wing
        ctx.beginPath();
        ctx.ellipse(8, -3, 15, 8, 0.5 + wingAngle, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#a0522d';
        ctx.beginPath();
        ctx.arc(12, -2, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(14, -3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.moveTo(18, -2);
        ctx.lineTo(24, -2);
        ctx.lineTo(21, 1);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

function initBirdsForLevel() {
    birds = [];
    if (gameState.currentLevel === 2) {
        // Create multiple birds for level 2
        birds.push(new Bird(800, 200, 2, 30));
        birds.push(new Bird(1400, 150, 2.5, 40));
        birds.push(new Bird(2000, 180, 2, 35));
        birds.push(new Bird(2600, 160, 2.2, 25));
    }
}

function initCoinsForLevel() {
    coins.length = 0;
    const level = levels[gameState.currentLevel];
    
    // Place coins on platforms
    level.platforms.forEach((platform, index) => {
        if (index > 0 && index < level.platforms.length - 1) {
            // Add 1-3 coins on each platform
            const numCoins = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numCoins; i++) {
                const coinX = platform.x + (platform.width / (numCoins + 1)) * (i + 1);
                const coinY = platform.y - 40;
                coins.push(new Coin(coinX, coinY));
            }
        }
    });
}

function initPowerUpsForLevel() {
    powerUps.length = 0;
    const level = levels[gameState.currentLevel];
    
    if (level.powerUps) {
        level.powerUps.forEach(pu => {
            powerUps.push(new PowerUp(pu.x, pu.y, pu.type));
        });
    }
}

function initWeatherForLevel() {
    weatherParticles.length = 0;
    const level = levels[gameState.currentLevel];
    
    if (level.weather && level.weather !== 'none') {
        for (let i = 0; i < 50; i++) {
            weatherParticles.push(new WeatherParticle(level.weather));
        }
    }
    
    gameState.weatherEffect = level.weather || 'none';
    gameState.reverseGravity = level.gravity === 'reverse';
}

function createParticles(x, y, color, count = 10, type = 'confetti') {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, type));
    }
}

function playSound(type) {
    // Simple sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'jump':
            oscillator.frequency.value = 400;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'coin':
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
        case 'complete':
            oscillator.frequency.value = 600;
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'die':
            oscillator.frequency.value = 200;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
    }
}

// Controls
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Level Definitions with background images
const levels = {
    1: {
        name: "Green Fields",
        backgroundImage: 'bg1.jpg',
        groundColor: '#22c55e',
        weather: 'none',
        gravity: 'normal',
        platforms: [
            { x: 0, y: 500, width: 400, height: 25 },
            { x: 500, y: 450, width: 200, height: 25 },
            { x: 800, y: 400, width: 200, height: 25 },
            { x: 1100, y: 350, width: 200, height: 25 },
            { x: 1400, y: 300, width: 180, height: 25 },
            { x: 1680, y: 250, width: 200, height: 25 },
            { x: 1980, y: 300, width: 200, height: 25 },
            { x: 2280, y: 250, width: 250, height: 25 }
        ],
        spikes: [
            { x: 450, y: 485, width: 40, height: 15 },
            { x: 1050, y: 385, width: 40, height: 15 },
            { x: 1630, y: 285, width: 40, height: 15 }
        ],
        powerUps: [
            { x: 900, y: 350, type: 'doubleJump' }
        ],
        goal: { x: 2450, y: 200, width: 50, height: 50 },
        playerStart: { x: 50, y: 400 }
    },
    2: {
        name: "Desert Valley",
        backgroundImage: 'bg2.jpg',
        groundColor: '#e6a23c',
        weather: 'none',
        gravity: 'normal',
        platforms: [
            { x: 0, y: 520, width: 300, height: 25 },
            { x: 400, y: 480, width: 130, height: 25 },
            { x: 620, y: 430, width: 130, height: 25 },
            { x: 840, y: 380, width: 140, height: 25 },
            { x: 650, y: 330, width: 130, height: 25 },
            { x: 870, y: 280, width: 130, height: 25 },
            { x: 1080, y: 340, width: 140, height: 25 },
            { x: 1300, y: 290, width: 130, height: 25 },
            { x: 1520, y: 350, width: 150, height: 25 },
            { x: 1750, y: 300, width: 140, height: 25 },
            { x: 1980, y: 250, width: 150, height: 25 },
            { x: 2220, y: 320, width: 150, height: 25 },
            { x: 2450, y: 270, width: 200, height: 25 }
        ],
        spikes: [
            { x: 350, y: 505, width: 40, height: 15 },
            { x: 570, y: 465, width: 40, height: 15 },
            { x: 790, y: 415, width: 40, height: 15 },
            { x: 1030, y: 375, width: 40, height: 15 },
            { x: 1470, y: 335, width: 40, height: 15 },
            { x: 1930, y: 285, width: 40, height: 15 }
        ],
        powerUps: [
            { x: 750, y: 280, type: 'shield' }
        ],
        goal: { x: 2600, y: 220, width: 50, height: 50 },
        playerStart: { x: 50, y: 420 }
    },
    3: {
        name: "Purple Mountains",
        backgroundImage: 'bg3.jpg',
        groundColor: '#a855f7',
        weather: 'none',
        gravity: 'normal',
        platforms: [
            { x: 0, y: 520, width: 250, height: 25 },
            { x: 330, y: 470, width: 110, height: 25 },
            { x: 520, y: 420, width: 110, height: 25 },
            { x: 330, y: 370, width: 110, height: 25 },
            { x: 520, y: 320, width: 110, height: 25 },
            { x: 710, y: 270, width: 120, height: 25 },
            { x: 910, y: 330, width: 110, height: 25 },
            { x: 1100, y: 280, width: 110, height: 25 },
            { x: 910, y: 230, width: 110, height: 25 },
            { x: 1100, y: 180, width: 110, height: 25 },
            { x: 1290, y: 240, width: 120, height: 25 },
            { x: 1490, y: 300, width: 120, height: 25 },
            { x: 1690, y: 250, width: 130, height: 25 },
            { x: 1900, y: 310, width: 130, height: 25 },
            { x: 2110, y: 260, width: 140, height: 25 },
            { x: 2330, y: 210, width: 150, height: 25 },
            { x: 2560, y: 270, width: 200, height: 25 }
        ],
        spikes: [
            { x: 280, y: 505, width: 40, height: 15 },
            { x: 470, y: 455, width: 40, height: 15 },
            { x: 660, y: 405, width: 40, height: 15 },
            { x: 860, y: 355, width: 40, height: 15 },
            { x: 1050, y: 315, width: 40, height: 15 },
            { x: 1240, y: 265, width: 40, height: 15 },
            { x: 1440, y: 285, width: 40, height: 15 },
            { x: 1850, y: 295, width: 40, height: 15 }
        ],
        powerUps: [
            { x: 1000, y: 230, type: 'magnetCoin' }
        ],
        goal: { x: 2700, y: 220, width: 50, height: 50 },
        playerStart: { x: 50, y: 420 }
    },
    4: {
        name: "Misty Mountains",
        backgroundImage: 'bg4.jpg',
        groundColor: '#475569',
        weather: 'none',
        gravity: 'normal',
        platforms: [
            { x: 0, y: 530, width: 200, height: 25 },
            { x: 270, y: 490, width: 90, height: 25 },
            { x: 430, y: 450, width: 90, height: 25 },
            { x: 270, y: 410, width: 90, height: 25 },
            { x: 430, y: 370, width: 90, height: 25 },
            { x: 590, y: 330, width: 100, height: 25 },
            { x: 760, y: 280, width: 90, height: 25 },
            { x: 590, y: 240, width: 90, height: 25 },
            { x: 760, y: 200, width: 90, height: 25 },
            { x: 920, y: 260, width: 100, height: 25 },
            { x: 1090, y: 320, width: 100, height: 25 },
            { x: 1260, y: 270, width: 90, height: 25 },
            { x: 1420, y: 230, width: 90, height: 25 },
            { x: 1260, y: 190, width: 90, height: 25 },
            { x: 1420, y: 150, width: 90, height: 25 },
            { x: 1580, y: 210, width: 100, height: 25 },
            { x: 1750, y: 270, width: 110, height: 25 },
            { x: 1930, y: 220, width: 100, height: 25 },
            { x: 2100, y: 280, width: 110, height: 25 },
            { x: 2280, y: 230, width: 110, height: 25 },
            { x: 2460, y: 180, width: 120, height: 25 },
            { x: 2650, y: 240, width: 150, height: 25 },
            { x: 2870, y: 190, width: 200, height: 25 }
        ],
        spikes: [
            { x: 220, y: 515, width: 40, height: 15 },
            { x: 380, y: 475, width: 40, height: 15 },
            { x: 540, y: 435, width: 40, height: 15 },
            { x: 710, y: 395, width: 40, height: 15 },
            { x: 870, y: 355, width: 40, height: 15 },
            { x: 1040, y: 315, width: 40, height: 15 },
            { x: 1210, y: 275, width: 40, height: 15 },
            { x: 1370, y: 255, width: 40, height: 15 },
            { x: 1530, y: 215, width: 40, height: 15 },
            { x: 1700, y: 255, width: 40, height: 15 },
            { x: 2050, y: 305, width: 40, height: 15 },
            { x: 2230, y: 255, width: 40, height: 15 }
        ],
        powerUps: [],
        goal: { x: 3000, y: 140, width: 50, height: 50 },
        playerStart: { x: 50, y: 430 }
    },
    5: {
        name: "Neon City",
        backgroundImage: 'bg1.jpg',
        backgroundTint: '#1a0033',
        groundColor: '#ff00ff',
        weather: 'none',
        gravity: 'low',
        platforms: [
            { x: 0, y: 540, width: 250, height: 25, color: '#00ffff' },
            { x: 350, y: 480, width: 120, height: 25, color: '#ff00ff', moving: true, range: 150, speed: 2 },
            { x: 550, y: 420, width: 120, height: 25, color: '#ffff00', moving: true, range: 100, speed: 1.5 },
            { x: 750, y: 360, width: 150, height: 25, color: '#00ff00' },
            { x: 1000, y: 300, width: 120, height: 25, color: '#ff0000', moving: true, range: 120, speed: 2.5 },
            { x: 1200, y: 360, width: 120, height: 25, color: '#00ffff', moving: true, range: 80, speed: 1.8 },
            { x: 1400, y: 300, width: 150, height: 25, color: '#ff00ff' },
            { x: 1650, y: 240, width: 120, height: 25, color: '#ffff00', moving: true, range: 100, speed: 2 },
            { x: 1850, y: 300, width: 150, height: 25, color: '#00ff00', moving: true, range: 90, speed: 1.5 },
            { x: 2100, y: 240, width: 200, height: 25, color: '#ff00ff' }
        ],
        spikes: [
            { x: 300, y: 525, width: 40, height: 15 },
            { x: 500, y: 465, width: 40, height: 15 },
            { x: 700, y: 405, width: 40, height: 15 },
            { x: 950, y: 345, width: 40, height: 15 }
        ],
        powerUps: [
            { x: 900, y: 250, type: 'doubleJump' }
        ],
        goal: { x: 2250, y: 190, width: 50, height: 50 },
        playerStart: { x: 50, y: 440 }
    },
    6: {
        name: "Gravity Shift",
        backgroundImage: 'bg2.jpg',
        backgroundTint: '#330033',
        groundColor: '#8b008b',
        weather: 'none',
        gravity: 'reverse',
        platforms: [
            { x: 0, y: 100, width: 250, height: 25 },
            { x: 350, y: 160, width: 120, height: 25 },
            { x: 550, y: 220, width: 120, height: 25 },
            { x: 750, y: 280, width: 150, height: 25 },
            { x: 1000, y: 200, width: 120, height: 25 },
            { x: 1200, y: 260, width: 120, height: 25 },
            { x: 1400, y: 320, width: 150, height: 25 },
            { x: 1650, y: 240, width: 120, height: 25 },
            { x: 1850, y: 180, width: 200, height: 25 }
        ],
        spikes: [
            { x: 300, y: 125, width: 40, height: 15 },
            { x: 500, y: 185, width: 40, height: 15 },
            { x: 700, y: 245, width: 40, height: 15 }
        ],
        powerUps: [
            { x: 850, y: 230, type: 'shield' }
        ],
        goal: { x: 2000, y: 130, width: 50, height: 50 },
        playerStart: { x: 50, y: 50 }
    },
    7: {
        name: "Rainbow Realm",
        backgroundImage: 'bg3.jpg',
        groundColor: '#ff69b4',
        weather: 'rainbow',
        gravity: 'normal',
        platforms: [
            { x: 0, y: 520, width: 200, height: 25, moving: true, range: 100 },
            { x: 300, y: 460, width: 150, height: 25, color: '#ff0000' },
            { x: 550, y: 400, width: 150, height: 25, color: '#ff7f00' },
            { x: 800, y: 340, width: 150, height: 25, color: '#ffff00' },
            { x: 1050, y: 280, width: 150, height: 25, color: '#00ff00' },
            { x: 1300, y: 340, width: 150, height: 25, color: '#0000ff' },
            { x: 1550, y: 280, width: 150, height: 25, color: '#4b0082' },
            { x: 1800, y: 220, width: 200, height: 25, color: '#9400d3' }
        ],
        spikes: [
            { x: 250, y: 505, width: 40, height: 15 },
            { x: 500, y: 445, width: 40, height: 15 },
            { x: 750, y: 385, width: 40, height: 15 }
        ],
        powerUps: [
            { x: 900, y: 290, type: 'magnetCoin' }
        ],
        goal: { x: 1950, y: 170, width: 50, height: 50 },
        playerStart: { x: 50, y: 420 }
    },
    8: {
        name: "Ultimate Challenge",
        backgroundImage: 'bg4.jpg',
        groundColor: '#ff1493',
        weather: 'none',
        gravity: 'normal',
        platforms: [
            { x: 0, y: 540, width: 180, height: 25 },
            { x: 250, y: 500, width: 80, height: 25 },
            { x: 400, y: 460, width: 80, height: 25 },
            { x: 250, y: 420, width: 80, height: 25 },
            { x: 400, y: 380, width: 80, height: 25 },
            { x: 550, y: 340, width: 90, height: 25 },
            { x: 710, y: 300, width: 80, height: 25 },
            { x: 860, y: 260, width: 80, height: 25 },
            { x: 710, y: 220, width: 80, height: 25 },
            { x: 860, y: 180, width: 80, height: 25 },
            { x: 1010, y: 240, width: 90, height: 25 },
            { x: 1170, y: 200, width: 80, height: 25 },
            { x: 1320, y: 260, width: 80, height: 25 },
            { x: 1470, y: 220, width: 90, height: 25 },
            { x: 1630, y: 180, width: 80, height: 25 },
            { x: 1780, y: 240, width: 80, height: 25 },
            { x: 1930, y: 200, width: 90, height: 25 },
            { x: 2090, y: 160, width: 80, height: 25 },
            { x: 2240, y: 220, width: 100, height: 25 },
            { x: 2420, y: 180, width: 150, height: 25 }
        ],
        spikes: [
            { x: 200, y: 525, width: 40, height: 15 },
            { x: 350, y: 485, width: 40, height: 15 },
            { x: 500, y: 445, width: 40, height: 15 },
            { x: 660, y: 405, width: 40, height: 15 },
            { x: 810, y: 365, width: 40, height: 15 },
            { x: 960, y: 325, width: 40, height: 15 },
            { x: 1120, y: 285, width: 40, height: 15 },
            { x: 1270, y: 245, width: 40, height: 15 },
            { x: 1420, y: 205, width: 40, height: 15 },
            { x: 1580, y: 225, width: 40, height: 15 },
            { x: 1730, y: 265, width: 40, height: 15 },
            { x: 1880, y: 225, width: 40, height: 15 },
            { x: 2040, y: 185, width: 40, height: 15 },
            { x: 2190, y: 245, width: 40, height: 15 }
        ],
        powerUps: [
            { x: 650, y: 290, type: 'doubleJump' },
            { x: 1100, y: 150, type: 'shield' },
            { x: 1850, y: 190, type: 'magnetCoin' }
        ],
        goal: { x: 2520, y: 130, width: 50, height: 50 },
        playerStart: { x: 50, y: 440 }
    }
};

// Camera
const camera = {
    x: 0,
    y: 0
};

// Background image
let backgroundImg = new Image();
let backgroundLoaded = false;

function updateCamera() {
    camera.x = player.x - canvas.width / 3;
    camera.y = Math.max(0, player.y - canvas.height / 2);
    
    if (camera.x < 0) camera.x = 0;
}

// Load level
let currentLevelData;

function loadLevel(levelNum) {
    currentLevelData = levels[levelNum];
    player.x = currentLevelData.playerStart.x;
    player.y = currentLevelData.playerStart.y;
    player.velocityX = 0;
    player.velocityY = 0;
    camera.x = 0;
    camera.y = 0;
    
    // Load background image
    backgroundLoaded = false;
    backgroundImg = new Image();
    backgroundImg.onload = function() {
        backgroundLoaded = true;
    };
    backgroundImg.src = currentLevelData.backgroundImage;
    
    // Initialize birds for this level
    initBirdsForLevel();
    
    // Initialize coins for this level
    initCoinsForLevel();
    
    // Initialize power-ups
    initPowerUpsForLevel();
    
    // Initialize weather
    initWeatherForLevel();
    
    // Clear particles
    particles.length = 0;
    
    // Reset power-ups
    player.jumpsLeft = 1;
    player.hasShield = false;
    player.color = '#3b82f6';
    gameState.powerUps = {
        doubleJump: false,
        shield: false,
        magnetCoin: false
    };
    
    // Start timer
    gameState.timeStarted = Date.now();
}

// Draw functions
function drawBackground() {
    if (backgroundLoaded) {
        // Draw the background image with parallax effect
        const parallaxX = camera.x * 0.5;
        const parallaxY = camera.y * 0.3;
        
        // Calculate scale to cover the canvas
        const scale = Math.max(canvas.width / backgroundImg.width, canvas.height / backgroundImg.height) * 1.5;
        const imgWidth = backgroundImg.width * scale;
        const imgHeight = backgroundImg.height * scale;
        
        // Draw the image (repeating if needed)
        for (let x = -parallaxX % imgWidth - imgWidth; x < canvas.width; x += imgWidth) {
            ctx.drawImage(backgroundImg, x, -parallaxY, imgWidth, imgHeight);
        }
        
        // Apply tint for special levels
        if (currentLevelData.backgroundTint) {
            ctx.fillStyle = currentLevelData.backgroundTint;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
    } else {
        // Fallback color while loading
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawPlatforms() {
    currentLevelData.platforms.forEach(platform => {
        const x = platform.x - camera.x;
        const y = platform.y - camera.y;
        
        // Platform with 3D effect
        const color = platform.color || currentLevelData.groundColor;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, platform.width, platform.height);
        
        // Top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y, platform.width, 3);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, y + platform.height - 3, platform.width, 3);
        
        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, platform.width, platform.height);
        
        // Neon glow for neon levels
        if (platform.color && gameState.currentLevel === 5) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = platform.color;
            ctx.strokeStyle = platform.color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, platform.width, platform.height);
            ctx.shadowBlur = 0;
        }
    });
}

function drawSpikes() {
    ctx.fillStyle = '#ef4444';
    currentLevelData.spikes.forEach(spike => {
        const x = spike.x - camera.x;
        const y = spike.y - camera.y;
        
        // Draw triangular spikes
        for (let i = 0; i < spike.width / 10; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * 10, y + spike.height);
            ctx.lineTo(x + i * 10 + 5, y);
            ctx.lineTo(x + i * 10 + 10, y + spike.height);
            ctx.closePath();
            ctx.fill();
        }
    });
}

function drawGoal() {
    const goal = currentLevelData.goal;
    const x = goal.x - camera.x;
    const y = goal.y - camera.y;
    
    // Animated flag
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x, y, 5, 50);
    
    ctx.fillStyle = '#22c55e';
    const wave = Math.sin(Date.now() / 200) * 5;
    ctx.beginPath();
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + 45 + wave, y + 15);
    ctx.lineTo(x + 5, y + 30);
    ctx.closePath();
    ctx.fill();
}

function drawPlayer() {
    const x = player.x - camera.x;
    const y = player.y - camera.y;
    
    ctx.save();
    
    // Shield effect
    if (player.hasShield) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        ctx.beginPath();
        ctx.arc(x + player.width/2, y + player.height/2, player.width/2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    // Flip player based on direction
    if (player.direction === -1) {
        ctx.translate(x + player.width, y);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(x, y);
    }
    
    // Player body with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, player.height);
    gradient.addColorStop(0, player.color);
    gradient.addColorStop(1, '#2563eb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, player.width, player.height);
    
    // Shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(2, 2, player.width - 4, player.height / 3);
    
    // Player eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(8, 8, 6, 6);
    ctx.fillRect(16, 8, 6, 6);
    
    // Pupils
    ctx.fillStyle = '#000';
    const pupilOffset = player.isMoving ? 1 : 0;
    ctx.fillRect(10 + pupilOffset, 10, 3, 3);
    ctx.fillRect(18 + pupilOffset, 10, 3, 3);
    
    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.width / 2, 20, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    ctx.restore();
}

function drawBirds() {
    birds.forEach(bird => {
        bird.draw(ctx, camera);
    });
}

function drawCoins() {
    coins.forEach(coin => {
        coin.update();
        coin.draw(ctx, camera);
    });
}

function drawPowerUps() {
    powerUps.forEach(powerUp => {
        powerUp.update();
        powerUp.draw(ctx, camera);
    });
}

function drawWeather() {
    weatherParticles.forEach(particle => {
        particle.update();
        particle.draw(ctx, camera);
    });
}

function drawParticles() {
    particles.forEach((particle, index) => {
        particle.update();
        particle.draw(ctx, camera);
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

function drawUI() {
    ctx.textAlign = 'left';
    
    // Main UI Panel - Top Left
    ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
    ctx.fillRect(15, 15, 280, 140);
    
    // Border for UI Panel
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 280, 140);
    
    // Level Display
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Segoe UI", Arial';
    ctx.fillText(`Level: ${gameState.currentLevel}`, 30, 45);
    
    // Lives Display with Hearts
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", Arial';
    ctx.fillText('Lives:', 30, 80);
    
    let heartX = 100;
    for (let i = 0; i < gameState.maxLives; i++) {
        ctx.font = '28px Arial';
        ctx.fillText(i < gameState.lives ? '❤️' : '🖤', heartX, 82);
        heartX += 35;
    }
    
    // Coins Display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px "Segoe UI", Arial';
    ctx.fillText('🪙', 30, 120);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Coins: ${gameState.coins}`, 65, 120);
    
    // Combo Display (if active)
    if (gameState.combo > 1) {
        const comboY = 170;
        ctx.fillStyle = 'rgba(255, 80, 0, 0.9)';
        ctx.fillRect(15, comboY, 200, 55);
        
        ctx.strokeStyle = 'rgba(255, 150, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, comboY, 200, 55);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px "Segoe UI", Arial';
        ctx.fillText('🔥', 25, comboY + 38);
        ctx.fillText(`Combo x${gameState.combo}`, 60, comboY + 38);
    }
    
    // Timer Panel - Top Right
    const timeElapsed = Math.floor((Date.now() - gameState.timeStarted) / 1000);
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
    ctx.fillRect(canvas.width - 195, 15, 180, 60);
    
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width - 195, 15, 180, 60);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Segoe UI", Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`⏱️ ${timeString}`, canvas.width - 25, 52);
    
    // Checkpoint Indicator
    if (gameState.checkpointReached) {
        ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
        ctx.fillRect(canvas.width - 195, 85, 180, 45);
        
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 195, 85, 180, 45);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Segoe UI", Arial';
        ctx.textAlign = 'right';
        ctx.fillText('✓ Checkpoint', canvas.width - 25, 113);
    }
}


function drawClouds() {
    clouds.forEach(cloud => cloud.draw(ctx, camera));
}

function updateLivesDisplay() {
    // Updates handled in drawUI now
}

let comboTexts = [];
function showComboText(x, y, combo) {
    comboTexts.push({
        x: x,
        y: y,
        combo: combo,
        life: 60
    });
}

function updateComboTexts() {
    comboTexts = comboTexts.filter(text => {
        text.y -= 2;
        text.life--;
        
        if (text.life > 0) {
            ctx.save();
            ctx.globalAlpha = text.life / 60;
            
            // Combo text with glow effect
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ff6600';
            ctx.font = 'bold 36px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeText(`×${text.combo} COMBO!`, text.x - camera.x, text.y - camera.y);
            ctx.fillText(`×${text.combo} COMBO!`, text.x - camera.x, text.y - camera.y);
            
            ctx.restore();
            return true;
        }
        return false;
    });
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Game loop
function update() {
    if (!gameState.isPlaying) return;
    
    // Update clouds
    clouds.forEach(cloud => cloud.update());
    
    // Update camera shake
    updateCameraShake();
    
    // Check checkpoint (at 50% of level progress)
    if (!gameState.checkpointReached && player.x > currentLevelData.goal.x * 0.5) {
        gameState.checkpointReached = true;
        gameState.checkpointX = player.x;
        playSound('complete');
        createParticles(player.x, player.y, '#00ff00', 30, 'star');
    }
    
    // Player movement
    if (keys['ArrowLeft'] || keys['a']) {
        player.velocityX = -player.speed;
        player.direction = -1;
        player.isMoving = true;
    } else if (keys['ArrowRight'] || keys['d']) {
        player.velocityX = player.speed;
        player.direction = 1;
        player.isMoving = true;
    } else {
        player.velocityX *= friction;
        player.isMoving = false;
    }
    
    // Jump
    if ((keys[' '] || keys['ArrowUp'] || keys['w']) && (player.onGround || player.jumpsLeft > 0)) {
        if (!player.onGround && player.jumpsLeft > 0) {
            player.jumpsLeft--;
        }
        player.velocityY = gameState.reverseGravity ? player.jumpPower : -player.jumpPower;
        player.onGround = false;
        playSound('jump');
        createParticles(player.x + player.width/2, player.y + player.height, player.color, 5);
    }
    
    // Apply gravity
    const gravityForce = currentLevelData.gravity === 'low' ? gravity * 0.5 : gravity;
    player.velocityY += gameState.reverseGravity ? -gravityForce : gravityForce;
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Check platform collisions
    player.onGround = false;
    currentLevelData.platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            if (gameState.reverseGravity) {
                if (player.velocityY < 0) {
                    player.y = platform.y + platform.height;
                    player.velocityY = 0;
                    player.onGround = true;
                    player.jumpsLeft = gameState.powerUps.doubleJump ? 2 : 1;
                }
            } else {
                if (player.velocityY > 0) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.onGround = true;
                    player.jumpsLeft = gameState.powerUps.doubleJump ? 2 : 1;
                }
            }
        }
    });
    
    // Check spike collisions
    currentLevelData.spikes.forEach(spike => {
        if (checkCollision(player, spike)) {
            if (!player.hasShield) {
                playSound('die');
                shakeCamera(8, 300);
                gameOver();
            } else {
                player.hasShield = false;
                player.color = '#3b82f6';
                createParticles(player.x + player.width/2, player.y + player.height/2, '#ffff00', 20);
            }
        }
    });
    
    // Update and check bird collisions
    birds.forEach(bird => {
        bird.update();
        if (checkCollision(player, bird.getBounds())) {
            if (!player.hasShield) {
                playSound('die');
                shakeCamera(8, 300);
                gameOver();
            } else {
                player.hasShield = false;
                player.color = '#3b82f6';
                createParticles(player.x + player.width/2, player.y + player.height/2, '#ffff00', 20);
            }
        }
    });
    
    // Check coin collisions
    coins.forEach(coin => {
        if (!coin.collected) {
            // Magnet effect
            if (gameState.powerUps.magnetCoin) {
                const dx = player.x + player.width/2 - (coin.x + coin.width/2);
                const dy = player.y + player.height/2 - (coin.y + coin.height/2);
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < 150) {
                    coin.x += dx * 0.1;
                    coin.y += dy * 0.1;
                }
            }
            
            if (checkCollision(player, coin.getBounds())) {
                coin.collected = true;
                gameState.coins++;
                gameState.combo++;
                if (gameState.combo > gameState.maxCombo) {
                    gameState.maxCombo = gameState.combo;
                }
                const comboBonus = gameState.combo > 1 ? gameState.combo * 5 : 0;
                gameState.score += 10 + comboBonus;
                playSound('coin');
                createParticles(coin.x + coin.width/2, coin.y + coin.height/2, '#ffd700', 15, 'star');
                
                // Show combo text if combo > 1
                if (gameState.combo > 1) {
                    showComboText(coin.x, coin.y, gameState.combo);
                }
            }
        }
    });
    
    // Check power-up collisions
    powerUps.forEach(powerUp => {
        if (!powerUp.collected && checkCollision(player, powerUp.getBounds())) {
            powerUp.collected = true;
            gameState.score += 50;
            playSound('complete');
            createParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, powerUp.getColor(), 25, 'star');
            
            if (powerUp.type === 'doubleJump') {
                gameState.powerUps.doubleJump = true;
                player.jumpsLeft = 2;
            } else if (powerUp.type === 'shield') {
                gameState.powerUps.shield = true;
                player.hasShield = true;
                player.color = '#ffff00';
            } else if (powerUp.type === 'magnetCoin') {
                gameState.powerUps.magnetCoin = true;
                player.color = '#ff00ff';
            }
        }
    });
    
    // Check goal collision
    if (checkCollision(player, currentLevelData.goal)) {
        playSound('complete');
        createParticles(player.x + player.width/2, player.y + player.height/2, '#22c55e', 30, 'star');
        levelComplete();
    }
    
    // Fall off screen
    if (player.y > canvas.height + 100) {
        shakeCamera(8, 300);
        gameOver();
    }
    
    // Update camera
    updateCamera();
}

function draw() {
    if (!gameState.isPlaying) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply camera shake
    ctx.save();
    ctx.translate(cameraShake.x, cameraShake.y);
    
    drawBackground();
    drawClouds();
    drawWeather();
    drawPlatforms();
    drawSpikes();
    drawCoins();
    drawPowerUps();
    drawBirds();
    drawGoal();
    drawPlayer();
    drawParticles();
    updateComboTexts();
    
    ctx.restore();
    
    drawUI();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Game state functions
function startLevel(levelNum) {
    gameState.currentLevel = levelNum;
    gameState.isPlaying = true;
    gameState.combo = 0;
    gameState.checkpointReached = false;
    gameState.checkpointX = 0;
    loadLevel(levelNum);
    initClouds();
    
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('current-level').textContent = levelNum;
    updateLivesDisplay();
}

function levelComplete() {
    gameState.isPlaying = false;
    gameState.completedLevels.add(gameState.currentLevel);
    gameState.lives = gameState.maxLives; // Restore lives on completion
    
    // Calculate time bonus
    const timeElapsed = Math.floor((Date.now() - gameState.timeStarted) / 1000);
    const timeBonus = Math.max(0, 100 - timeElapsed);
    gameState.score += timeBonus;
    
    // Combo bonus
    if (gameState.maxCombo > 0) {
        gameState.score += gameState.maxCombo * 10;
    }
    
    // Save best time
    if (!gameState.bestTimes[gameState.currentLevel] || timeElapsed < gameState.bestTimes[gameState.currentLevel]) {
        gameState.bestTimes[gameState.currentLevel] = timeElapsed;
    }
    
    // Update stars for completed level (give 3 stars for completion)
    updateStars(gameState.currentLevel, 3);
    
    playSound('complete');
    
    const nextLevel = gameState.currentLevel + 1;
    if (nextLevel <= 8) {
        // Unlock the next level
        unlockLevel(nextLevel);
        saveProgress();
        
        // Show level complete overlay
        showLevelCompleteOverlay(timeElapsed, timeBonus);
        
        // Automatically start next level after delay
        setTimeout(() => {
            startLevel(nextLevel);
        }, 2500);
    } else {
        // Show completion screen only when all levels are done
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('complete-screen').classList.add('active');
        document.getElementById('complete-message').textContent = 
            `🎉 Congratulations! You completed all 8 levels! 🎉\n💰 Total Coins: ${gameState.coins}\n🏆 Total Score: ${gameState.score}\n🔥 Max Combo: ${gameState.maxCombo}`;
        document.getElementById('next-level-btn').style.display = 'none';
        saveProgress();
    }
}

function showLevelCompleteOverlay(timeElapsed, timeBonus) {
    // Create overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Success panel
    const panelWidth = 500;
    const panelHeight = 350;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    // Panel background
    ctx.fillStyle = 'rgba(30, 30, 60, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Panel border with gradient effect
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 5;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 48px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✨ LEVEL COMPLETE! ✨', canvas.width / 2, panelY + 70);
    
    // Stats
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Segoe UI", Arial';
    
    ctx.fillText(`⏱️ Time: ${timeString}`, canvas.width / 2, panelY + 140);
    ctx.fillText(`💰 Coins Collected: ${gameState.coins}`, canvas.width / 2, panelY + 185);
    ctx.fillText(`🔥 Max Combo: x${gameState.maxCombo}`, canvas.width / 2, panelY + 230);
    ctx.fillText(`⭐ Time Bonus: +${timeBonus}`, canvas.width / 2, panelY + 275);
    
    // Next level indicator
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px "Segoe UI", Arial';
    ctx.fillText('Starting next level...', canvas.width / 2, panelY + 320);
}

function gameOver() {
    gameState.lives--;
    shakeCamera(10, 15);
    playSound('die');
    
    if (gameState.lives > 0) {
        // Still have lives, respawn at checkpoint or start
        if (gameState.checkpointReached) {
            player.x = gameState.checkpointX;
            player.y = currentLevelData.playerStart.y;
        } else {
            player.x = currentLevelData.playerStart.x;
            player.y = currentLevelData.playerStart.y;
        }
        player.velocityX = 0;
        player.velocityY = 0;
        gameState.combo = 0;
        updateLivesDisplay();
    } else {
        // No lives left - game over
        gameState.isPlaying = false;
        gameState.lives = gameState.maxLives; // Reset for next attempt
        player.x = currentLevelData.playerStart.x;
        player.y = currentLevelData.playerStart.y;
        player.velocityX = 0;
        player.velocityY = 0;
        camera.x = 0;
        camera.y = 0;
        
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.add('active');
    }
}

function returnToMenu() {
    gameState.isPlaying = false;
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('complete-screen').classList.remove('active');
    document.getElementById('game-over-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
}

function unlockLevel(levelNum) {
    const btn = document.getElementById(`level${levelNum}-btn`);
    const node = document.querySelector(`.level-node[data-level="${levelNum}"]`);
    if (btn && node) {
        btn.classList.remove('locked');
        node.classList.remove('locked-node');
        btn.innerHTML = `<span class="level-number">${levelNum}</span>`;
    }
}

function updateStars(levelNum, stars) {
    const node = document.querySelector(`.level-node[data-level="${levelNum}"]`);
    if (node) {
        const starElements = node.querySelectorAll('.star');
        starElements.forEach((star, index) => {
            if (index < stars) {
                star.textContent = '★';
                star.classList.add('filled');
            }
        });
    }
}

// Save/Load progress
function saveProgress() {
    const progress = Array.from(gameState.completedLevels);
    localStorage.setItem('gameProgress', JSON.stringify(progress));
}

function loadProgress() {
    const saved = localStorage.getItem('gameProgress');
    if (saved) {
        const progress = JSON.parse(saved);
        progress.forEach(level => {
            gameState.completedLevels.add(level);
            updateStars(level, 3);
            if (level < 8) {
                unlockLevel(level + 1);
            }
        });
    }
}

// Event listeners
document.querySelectorAll('.level-btn-map').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!btn.classList.contains('locked')) {
            const level = parseInt(btn.dataset.level);
            startLevel(level);
        }
    });
});

document.getElementById('back-btn').addEventListener('click', returnToMenu);
document.getElementById('menu-btn').addEventListener('click', returnToMenu);
document.getElementById('menu-btn-2').addEventListener('click', returnToMenu);

document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    gameState.isPlaying = true;
});

document.getElementById('next-level-btn').addEventListener('click', () => {
    const nextLevel = gameState.currentLevel + 1;
    if (nextLevel <= 8) {
        startLevel(nextLevel);
    }
});

// Initialize
loadProgress();
gameLoop();
