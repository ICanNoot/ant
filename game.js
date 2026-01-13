// Utility functions
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Ant class
class Ant {
    constructor(x, y, colony) {
        this.x = x;
        this.y = y;
        this.colony = colony;
        this.vx = 0;
        this.vy = 0;
        this.speed = 1;
        this.size = 3;
        this.health = 100;
        this.maxHealth = 100;
        this.hasFood = false;
        this.target = null;
        this.state = 'searching'; // searching, returning, fighting
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderChange = 0;
        this.attackCooldown = 0;
        this.damage = 10;
    }

    update(game) {
        this.attackCooldown = Math.max(0, this.attackCooldown - 1);

        // Check for nearby enemy ants
        const nearbyEnemy = this.findNearbyEnemy(game);
        if (nearbyEnemy && !this.hasFood) {
            this.state = 'fighting';
            this.target = nearbyEnemy;
            this.moveToward(nearbyEnemy.x, nearbyEnemy.y);

            // Attack if close enough
            if (distance(this.x, this.y, nearbyEnemy.x, nearbyEnemy.y) < 5 && this.attackCooldown === 0) {
                nearbyEnemy.health -= this.damage;
                this.attackCooldown = 30;
            }
        } else if (this.hasFood) {
            // Return to nest
            this.state = 'returning';
            this.moveToward(this.colony.x, this.colony.y);

            // Check if reached nest
            if (distance(this.x, this.y, this.colony.x, this.colony.y) < 15) {
                this.hasFood = false;
                this.colony.foodCollected++;
            }
        } else {
            // Search for food
            this.state = 'searching';
            const nearbyFood = this.findNearbyFood(game);

            if (nearbyFood) {
                this.target = nearbyFood;
                this.moveToward(nearbyFood.x, nearbyFood.y);

                // Pick up food
                if (distance(this.x, this.y, nearbyFood.x, nearbyFood.y) < 5) {
                    this.hasFood = true;
                    nearbyFood.amount--;
                    if (nearbyFood.amount <= 0) {
                        game.food = game.food.filter(f => f !== nearbyFood);
                    }
                }
            } else {
                // Wander randomly
                this.wander();
            }
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls and boundaries
        this.handleCollisions(game);

        // Keep in bounds
        this.x = Math.max(5, Math.min(game.width - 5, this.x));
        this.y = Math.max(5, Math.min(game.height - 5, this.y));
    }

    findNearbyEnemy(game) {
        let closest = null;
        let closestDist = 100;

        for (const colony of game.colonies) {
            if (colony === this.colony) continue;

            for (const ant of colony.ants) {
                const dist = distance(this.x, this.y, ant.x, ant.y);
                if (dist < closestDist) {
                    closest = ant;
                    closestDist = dist;
                }
            }
        }

        return closest;
    }

    findNearbyFood(game) {
        let closest = null;
        let closestDist = 200;

        for (const food of game.food) {
            const dist = distance(this.x, this.y, food.x, food.y);
            if (dist < closestDist) {
                closest = food;
                closestDist = dist;
            }
        }

        return closest;
    }

    moveToward(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        }
    }

    wander() {
        this.wanderChange++;
        if (this.wanderChange > 30) {
            this.wanderAngle += randomRange(-0.5, 0.5);
            this.wanderChange = 0;
        }

        this.vx = Math.cos(this.wanderAngle) * this.speed * 0.5;
        this.vy = Math.sin(this.wanderAngle) * this.speed * 0.5;
    }

    handleCollisions(game) {
        // Check walls
        for (const wall of game.walls) {
            if (distance(this.x, this.y, wall.x, wall.y) < wall.size + this.size) {
                // Bounce off wall
                const dx = this.x - wall.x;
                const dy = this.y - wall.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    this.x = wall.x + (dx / dist) * (wall.size + this.size);
                    this.y = wall.y + (dy / dist) * (wall.size + this.size);
                }
                this.wanderAngle = Math.random() * Math.PI * 2;
            }
        }
    }

    draw(ctx) {
        // Draw ant body
        ctx.fillStyle = this.colony.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            const barWidth = 10;
            const barHeight = 2;
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - barWidth/2, this.y - 8, barWidth, barHeight);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x - barWidth/2, this.y - 8, barWidth * (this.health / this.maxHealth), barHeight);
        }

        // Draw food indicator
        if (this.hasFood) {
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.arc(this.x, this.y - 6, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw direction indicator
        if (this.state === 'fighting') {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.vx * 3, this.y + this.vy * 3);
            ctx.stroke();
        }
    }
}

// Colony class
class Colony {
    constructor(x, y, color, id) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.id = id;
        this.ants = [];
        this.spawnTimer = 0;
        this.foodCollected = 0;
        this.size = 12;
    }

    update(game, spawnRate) {
        this.spawnTimer++;

        // Spawn new ant
        if (this.spawnTimer >= spawnRate) {
            this.spawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = this.size + 5;
            const ant = new Ant(
                this.x + Math.cos(angle) * dist,
                this.y + Math.sin(angle) * dist,
                this
            );
            this.ants.push(ant);
        }

        // Update all ants
        for (let i = this.ants.length - 1; i >= 0; i--) {
            const ant = this.ants[i];
            ant.update(game);

            // Remove dead ants
            if (ant.health <= 0) {
                this.ants.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Draw nest
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw nest entrance
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Draw ant count
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.ants.length, this.x, this.y);

        // Draw all ants
        for (const ant of this.ants) {
            ant.draw(ctx);
        }
    }
}

// Food class
class Food {
    constructor(x, y, amount = 10) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.maxAmount = amount;
        this.size = 6;
    }

    draw(ctx) {
        const scale = this.amount / this.maxAmount;
        const currentSize = this.size * (0.5 + scale * 0.5);

        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw amount text
        if (this.amount > 5) {
            ctx.fillStyle = '#fff';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.amount, this.x, this.y);
        }
    }
}

// Wall class
class Wall {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 8;
    }

    draw(ctx) {
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}

// Main Game class
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.colonies = [];
        this.food = [];
        this.walls = [];

        this.currentTool = 'nest';
        this.currentColonyId = 0;
        this.spawnRate = 30;
        this.gameSpeed = 1.0;

        this.isMouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.colonyColors = ['#ff4444', '#4444ff', '#44ff44', '#ffaa00'];

        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
            });
        });

        // Colony buttons
        document.querySelectorAll('.colony-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.colony-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColonyId = parseInt(btn.dataset.colony);
            });
        });

        // Settings
        document.getElementById('spawnRate').addEventListener('input', (e) => {
            this.spawnRate = parseInt(e.target.value);
            document.getElementById('spawnRateDisplay').textContent = this.spawnRate;
        });

        document.getElementById('gameSpeed').addEventListener('input', (e) => {
            this.gameSpeed = parseFloat(e.target.value);
            document.getElementById('gameSpeedDisplay').textContent = this.gameSpeed.toFixed(1);
        });

        document.getElementById('clearAll').addEventListener('click', () => {
            if (confirm('Clear everything?')) {
                this.colonies = [];
                this.food = [];
                this.walls = [];
            }
        });
    }

    handleMouseDown(e) {
        this.isMouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.lastMouseX = x;
        this.lastMouseY = y;

        this.placeObject(x, y);
    }

    handleMouseMove(e) {
        if (!this.isMouseDown) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only place walls and food when dragging
        if (this.currentTool === 'wall' || this.currentTool === 'food') {
            // Check if moved enough
            if (distance(x, y, this.lastMouseX, this.lastMouseY) > 15) {
                this.placeObject(x, y);
                this.lastMouseX = x;
                this.lastMouseY = y;
            }
        }
    }

    handleMouseUp(e) {
        this.isMouseDown = false;
    }

    placeObject(x, y) {
        if (this.currentTool === 'nest') {
            // Check if too close to existing nests
            for (const colony of this.colonies) {
                if (distance(x, y, colony.x, colony.y) < 30) {
                    return;
                }
            }

            const color = this.colonyColors[this.currentColonyId];
            const colony = new Colony(x, y, color, this.currentColonyId);
            this.colonies.push(colony);

        } else if (this.currentTool === 'food') {
            this.food.push(new Food(x, y, 10));

        } else if (this.currentTool === 'wall') {
            // Check if wall already exists nearby
            const existingWall = this.walls.find(w => distance(x, y, w.x, w.y) < 10);
            if (!existingWall) {
                this.walls.push(new Wall(x, y));
            }

        } else if (this.currentTool === 'erase') {
            // Erase colonies
            this.colonies = this.colonies.filter(c => distance(x, y, c.x, c.y) > 15);

            // Erase food
            this.food = this.food.filter(f => distance(x, y, f.x, f.y) > 10);

            // Erase walls
            this.walls = this.walls.filter(w => distance(x, y, w.x, w.y) > 10);
        }
    }

    update() {
        // Update colonies at game speed
        for (let i = 0; i < this.gameSpeed; i++) {
            for (const colony of this.colonies) {
                colony.update(this, this.spawnRate);
            }
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#f0e8d8';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw grid
        this.ctx.strokeStyle = '#e0d8c8';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Draw walls
        for (const wall of this.walls) {
            wall.draw(this.ctx);
        }

        // Draw food
        for (const food of this.food) {
            food.draw(this.ctx);
        }

        // Draw colonies
        for (const colony of this.colonies) {
            colony.draw(this.ctx);
        }

        // Update stats
        this.updateStats();
    }

    updateStats() {
        const stats = document.getElementById('stats');
        let html = '<strong>Colony Statistics:</strong><br>';

        const colors = ['Red', 'Blue', 'Green', 'Orange'];
        for (let i = 0; i < this.colonyColors.length; i++) {
            const coloniesOfColor = this.colonies.filter(c => c.id === i);
            const totalAnts = coloniesOfColor.reduce((sum, c) => sum + c.ants.length, 0);
            const totalFood = coloniesOfColor.reduce((sum, c) => sum + c.foodCollected, 0);
            const nests = coloniesOfColor.length;

            if (nests > 0) {
                html += `<span style="color: ${this.colonyColors[i]}; font-weight: bold;">${colors[i]}</span>: `;
                html += `${nests} nest${nests !== 1 ? 's' : ''}, ${totalAnts} ants, ${totalFood} food collected<br>`;
            }
        }

        html += `<br><strong>Total Food:</strong> ${this.food.length} piles (${this.food.reduce((sum, f) => sum + f.amount, 0)} pieces)`;
        html += `<br><strong>Total Walls:</strong> ${this.walls.length}`;

        stats.innerHTML = html;
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    new Game(canvas);
});
