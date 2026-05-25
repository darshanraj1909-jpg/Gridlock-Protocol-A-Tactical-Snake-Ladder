const HUMAN_SVG = `<svg viewBox="0 0 24 24"><path d="M12 2c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm6 13c0-3.314-2.686-6-6-6s-6 2.686-6 6v5h12v-5z"/></svg>`;

        const CONFIG = {
            mysteryNodes: [12, 25, 33, 47, 54, 61, 68, 72, 80, 88, 92, 15, 39, 50, 7],
            playerStyles: [
                { name: 'Alpha Unit', color: 'var(--p-cyan)' },
                { name: 'Beta Unit', color: 'var(--p-green)' },
                { name: 'Gamma Unit', color: 'var(--p-purple)' },
                { name: 'Delta Unit', color: 'var(--p-yellow)' },
                { name: 'Epsilon Unit', color: 'var(--p-red)' }
            ],
            cardEffects: [
                { label: 'FORWARD 4', type: 'move', value: 4, color: '#059669' },
                { label: 'FORWARD 2', type: 'move', value: 2, color: '#10b981' },
                { label: 'PENALTY -4', type: 'move', value: -4, color: '#dc2626' },
                { label: 'PENALTY -2', type: 'move', value: -2, color: '#ef4444' },
                { label: 'REVERSE PHASE', type: 'status', value: 'reverse', color: '#8b5cf6' },
                { label: 'SABOTAGE LEADER', type: 'status', value: 'skip', color: '#475569' }
            ]
        };

        class MinimalistGame {
            constructor() {
                this.players = [];
                this.currentPlayerIndex = 0;
                this.isProcessing = false;
                this.isCardRevealing = false;
                this.initBoard();
            }

            initBoard() {
                const boardEl = document.getElementById('board');
                boardEl.innerHTML = '';
                
                for(let i=0; i<100; i++) {
                    const row = Math.floor(i / 10);
                    const col = i % 10;
                    
                    let visualRow = 9 - row; 
                    let cellNum;
                    
                    if (visualRow % 2 === 0) {
                        cellNum = (visualRow * 10) + (col + 1);
                    } else {
                        cellNum = (visualRow * 10) + (10 - col);
                    }

                    const cell = document.createElement('div');
                    // Clean alternating high contrast pattern
                    const altClass = (visualRow + col) % 2 === 0 ? 'cell-white' : 'cell-alt';
                    cell.className = `cell ${altClass}`;
                    cell.id = `cell-${cellNum}`;
                    cell.innerText = cellNum;
                    
                    if (CONFIG.mysteryNodes.includes(cellNum)) {
                        cell.classList.add('node');
                    }
                    boardEl.appendChild(cell);
                }
            }

            setup(playerCount) {
                for (let i = 0; i < playerCount; i++) {
                    this.players.push({
                        id: i,
                        name: CONFIG.playerStyles[i].name,
                        color: CONFIG.playerStyles[i].color,
                        position: 1,
                        isReversed: false,
                        skipNextTurn: false
                    });

                    // Construct clean Silhouette Token
                    const token = document.createElement('div');
                    token.className = 'token';
                    token.id = `token-${i}`;
                    token.style.setProperty('--p-color', CONFIG.playerStyles[i].color);
                    token.innerHTML = HUMAN_SVG;
                    token.style.animationDelay = `${i * 0.25}s`; 
                    document.getElementById('board-wrapper').appendChild(token);
                }

                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('roll-btn').disabled = false;
                
                this.updateUI();
                this.log(`System configuration authorized. ${playerCount} units live.`);
            }

            updateUI() {
                if (this.players.length === 0) return;
                
                const player = this.players[this.currentPlayerIndex];
                const display = document.getElementById('active-player-display');
                display.innerText = `${player.name}`;
                display.style.borderBottomColor = player.color;

                // Minimalist Leaderboard Tracker
                const lb = document.getElementById('leaderboard-list');
                const sorted = [...this.players].sort((a,b) => b.position - a.position);
                lb.innerHTML = sorted.map(p => `
                    <div class="lb-item">
                        <div class="lb-player">
                            <span class="mini-icon" style="background-color: ${p.color}"></span>
                            <span>${p.name}</span>
                        </div>
                        <span style="font-size:0.9rem; font-weight:600;">
                            Sector ${p.position}
                            ${p.isReversed ? '<span class="status-tag" style="border:1px solid var(--p-purple)">REV</span>' : ''}
                            ${p.skipNextTurn ? '<span class="status-tag" style="border:1px solid var(--p-red)">SKIP</span>' : ''}
                        </span>
                    </div>
                `).join('');

                // Geometric calculation to map token offsets without messy overlaps
                this.players.forEach(p => {
                    const cell = document.getElementById(`cell-${p.position}`);
                    const token = document.getElementById(`token-${p.id}`);
                    if (cell && token) {
                        const rect = cell.getBoundingClientRect();
                        const parentRect = document.getElementById('board-wrapper').getBoundingClientRect();
                        const tokenRect = token.getBoundingClientRect();
                        
                        const offset = (p.id * 6) - (this.players.length * 3);
                        token.style.left = (rect.left - parentRect.left + (rect.width/2) - (tokenRect.width/2 || 13) + offset) + 'px';
                        token.style.top = (rect.top - parentRect.top + (rect.height/2) - (tokenRect.height/2 || 13) + offset) + 'px';
                    }
                });
            }

            log(msg) {
                const logEl = document.getElementById('event-log');
                const entry = document.createElement('div');
                entry.className = 'log-msg';
                entry.innerHTML = `&middot; ${msg}`;
                logEl.prepend(entry);
            }

            async rollDice() {
                if (this.isProcessing) return;
                this.isProcessing = true;
                document.getElementById('roll-btn').disabled = true;
                
                const player = this.players[this.currentPlayerIndex];

                if (player.skipNextTurn) {
                    this.log(`${player.name} internal cycle skipped.`);
                    player.skipNextTurn = false;
                    this.isProcessing = false;
                    this.nextTurn();
                    return;
                }

                const resEl = document.getElementById('roll-result');
                for(let i=0; i<8; i++) {
                    resEl.innerText = Math.floor(Math.random() * 6) + 1;
                    await new Promise(r => setTimeout(r, 60));
                }

                const roll = Math.floor(Math.random() * 6) + 1;
                resEl.innerText = roll;
                this.log(`${player.name} evaluated position change delta: +${roll}.`);

                let moveAmount = player.isReversed ? -roll : roll;
                if (player.isReversed) {
                    this.log(`Phase inversion parameter met: moving backward.`);
                    player.isReversed = false;
                }

                await this.movePlayer(player, moveAmount);
                this.checkLanding();
            }

            async movePlayer(player, amount) {
                let target = player.position + amount;
                if (target < 1) target = 1;
                if (target > 100) target = 100;

                const step = amount > 0 ? 1 : -1;
                const absAmount = Math.abs(amount);

                for (let i = 0; i < absAmount; i++) {
                    player.position += step;
                    if (player.position > 100) player.position = 100;
                    if (player.position < 1) player.position = 1;
                    this.updateUI();
                    await new Promise(r => setTimeout(r, 180));
                    if (player.position === 100) break;
                }
            }

            checkLanding() {
                const player = this.players[this.currentPlayerIndex];
                
                if (player.position === 100) {
                    this.showVictory(player);
                    return;
                }

                if (player.position >= 95 && player.position <= 99) {
                    this.triggerExtraction(player);
                    return;
                }

                if (CONFIG.mysteryNodes.includes(player.position)) {
                    this.triggerTacticalCard(player);
                    return;
                }

                this.nextTurn();
            }

            nextTurn() {
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                document.getElementById('roll-result').innerText = "--";
                this.isProcessing = false;
                document.getElementById('roll-btn').disabled = false;
                this.updateUI();
            }

            triggerTacticalCard(player) {
                const modal = document.getElementById('tactical-modal');
                const container = document.getElementById('tactical-cards');
                modal.classList.remove('hidden');
                container.innerHTML = '';
                this.isCardRevealing = false;

                const shuffledEffects = [...CONFIG.cardEffects].sort(() => 0.5 - Math.random());
                
                for (let i = 0; i < 5; i++) {
                    const card = document.createElement('div');
                    card.className = 'tactical-card';
                    
                    const angle = (i - 2) * 5; 
                    const delay = i * 0.08;

                    card.style.setProperty('--fan-angle', `${angle}deg`);
                    card.style.setProperty('--delay', `${delay}s`);

                    card.innerHTML = `
                        <div class="card-inner">
                            <div class="card-front">?</div>
                            <div class="card-back" style="background-color: ${shuffledEffects[i].color};">
                                ${shuffledEffects[i].label}
                            </div>
                        </div>
                    `;
                    
                    card.onclick = () => {
                        if (this.isCardRevealing) return;
                        this.isCardRevealing = true;
                        
                        card.style.setProperty('--fan-angle', `0deg`);
                        card.classList.add('revealed');
                        
                        Array.from(container.children).forEach(c => {
                            if (c !== card) c.style.opacity = '0.15';
                        });

                        setTimeout(() => {
                            modal.classList.add('hidden');
                            this.applyCardEffect(player, shuffledEffects[i]);
                        }, 2000);
                    };
                    container.appendChild(card);
                }
            }

            async applyCardEffect(player, effect) {
                this.log(`${player.name} processed card function: ${effect.label}.`);
                
                if (effect.type === 'move') {
                    await this.movePlayer(player, effect.value);
                    this.checkLanding();
                } else if (effect.value === 'reverse') {
                    player.isReversed = true;
                    this.nextTurn();
                } else if (effect.value === 'skip') {
                    const leader = [...this.players].sort((a,b) => b.position - a.position)[0];
                    leader.skipNextTurn = true;
                    this.log(`Position disruption packet sent to ${leader.name}.`);
                    this.nextTurn();
                }
            }

            triggerExtraction(player) {
                this.extractionActive = true;
                this.extractionPlayer = player;
                document.getElementById('extraction-overlay').classList.remove('hidden');
                this.log(`Extraction protocol sequence active for ${player.name}.`);
            }

            async extractionClick(type) {
                if (!this.extractionActive) return;
                this.extractionActive = false;
                document.getElementById('extraction-overlay').classList.add('hidden');

                if (type === 'initiate') {
                    this.log(`Extraction verified. ${this.extractionPlayer.name} structural bounds intact.`);
                    this.nextTurn();
                } else {
                    this.log(`Extraction sequence broken via collision interception.`);
                    await this.movePlayer(this.extractionPlayer, -15);
                    this.nextTurn();
                }
            }

            showVictory(player) {
                const modal = document.getElementById('victory-modal');
                const subtext = document.getElementById('victory-subtext');
                modal.classList.remove('hidden');
                subtext.innerHTML = `Unit <strong>${player.name}</strong> successfully reached structural threshold point Sector 100.<br>Grid lock cleared.`;
                this.log(`Termination complete. Winner: ${player.name}.`);
            }
        }

        const game = new MinimalistGame();

        window.onload = () => {
            window.addEventListener('resize', () => {
                if (game && game.players.length > 0) {
                    game.updateUI();
                }
            });
        };