function Gameboard(size) {
    this.canvas = null;
    this.size = size; // size > 3 may result in crashes due to extensive calculations
    this.width = size * 100;
    this.height = size * 100;
    this.players = { PLAYER: 'p', COMP: 'c' };
    this.cells = []; // Stores properties of each cell
    this.currentTurn = Math.floor((Math.random() * 2)) == 0 ? this.players.PLAYER : this.players.COMP; // Randomly choose which player should make the first move
    this.gameStates = { over: false };
    this.winner = null;
    this.boardValue = { 'Player': -1, 'Tie': 0, 'Computer': 1 };

    // Setup the initial render of the gameboard and assign each cell its properties
    this.setupBoard = () => {
        this.canvas = document.querySelector('#gameArea');
        if (this.canvas) {
            this.canvas.width = this.width.toString();
            this.canvas.height = this.height.toString();
            this.drawGrids();
        }
        else
            return;

        for (let j = 0, y = (this.width / this.size) / 2; j < size; j++, y += this.width / this.size) {
            let row = [];
            for (let i = 0, x = (this.width / this.size) / 2; i < size; i++, x += this.width / this.size) {
                row.push({ id: { i, j }, coords: { x, y }, placedBy: null });
            }
            this.cells.push(row);
        }

        // If computer is making the first move
        if (this.currentTurn == this.players.COMP) {
            let bestScore = -Infinity;
            let bestMove = null;
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    if (this.cells[i][j].placedBy == null) {
                        this.cells[i][j].placedBy = this.players.COMP;
                        let score = minimax(this, false);
                        this.removeMarker(this.cells[i][j]);
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = this.cells[i][j];
                        }
                    }
                }
            }
            this.placeMarker(bestMove, this.players.COMP);
            this.currentTurn = this.players.PLAYER;
        }
    };

    // Draws the grids on the gameboard
    this.drawGrids = () => {
        let ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.size * (this.width / this.size), this.size * (this.width / this.size));
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        for (let i = (this.width / this.size); i <= (this.width / this.size) * (this.size - 1); i += this.width / this.size) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, this.height);
        }
        for (let i = (this.height / this.size); i <= (this.width / this.size) * (this.size - 1); i += this.width / this.size) {
            ctx.moveTo(0, i);
            ctx.lineTo(this.width, i);
        }
        ctx.stroke();
    }

    // Returns a cell on the gameboard based on the mouse click
    this.getCell = (clickedPosition) => {
        let minDistance = Infinity;
        let corr_cell = null;
        this.cells.forEach(r => {
            r.forEach(c => {
                if (distance(clickedPosition, c.coords) < minDistance) {
                    minDistance = distance(clickedPosition, c.coords);
                    corr_cell = c;
                }
            });
        });
        return corr_cell;
    };

    // Place a marker associated to a given player at the given cell of the gameboard
    this.placeMarker = (cell, player) => {
        let placed = false;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (cell.placedBy === null) {
                    if (cell.id == this.cells[i][j].id) {
                        this.cells[i][j].placedBy = player;
                        placed = true;
                    }
                }
            }
        }
        if (!placed) return;

        this.updateGameboardView();
        this.checkForWin();
        if (this.winner != null) {
            let banner_text = this.winner == 'Player' || this.winner == 'Computer' ? `${this.winner} WINS!!` : 'Tie Match!!'
            document.querySelector('h2').innerHTML = banner_text;
        }

        // Computer making a  move after player's move
        if (this.currentTurn == this.players.PLAYER && !this.gameStates.over && !this.isGameBoardFull()) {
            this.currentTurn = this.players.COMP;
            setTimeout(() => {
                let bestScore = -Infinity;
                let bestMove = null;
                for (let i = 0; i < this.size; i++) {
                    for (let j = 0; j < this.size; j++) {
                        if (this.cells[i][j].placedBy == null) {
                            this.cells[i][j].placedBy = this.players.COMP;
                            let score = minimax(this, false);
                            this.removeMarker(this.cells[i][j]);
                            if (score > bestScore) {
                                bestScore = score;
                                bestMove = this.cells[i][j];
                            }
                        }
                    }
                }
                this.placeMarker(bestMove, this.players.COMP);
                this.currentTurn = this.players.PLAYER;
            }, 1000);
        } else if (this.currentTurn == this.players.COMP && !this.gameStates.over && !this.isGameBoardFull()) {
            this.currentTurn = this.players.PLAYER;
        }
    };

    // Remove a marker from the given cell of the gameboard
    this.removeMarker = (cell) => {
        this.cells.forEach(r => {
            r.forEach(c => {
                if (c.id == cell.id)
                    c.placedBy = null;
            });
        });
        this.updateGameboardView();
    }

    // Render the gameboard on to the screen with updations
    this.updateGameboardView = () => {
        let ctx = this.canvas.getContext('2d');
        this.drawGrids('#000', 2);
        this.cells.forEach(r => {
            r.forEach(c => {
                if (c.placedBy != null) {
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = c.placedBy == this.players.PLAYER ? 'green' : 'red';
                    ctx.beginPath();
                    ctx.arc(c.coords.x, c.coords.y, 30, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            });
        });
    };

    // Checks if any player has won, is it a tie, the game is over
    this.checkForWin = () => {
        let player_win = false, computer_win = false;
        // Checks diagonally
        let player_diagonal1_truth = true, comp_diagonal1_truth = true;
        let player_diagonal2_truth = true, comp_diagonal2_truth = true;
        for (let i = 0, j = 0, k = 0, l = size - 1; i < this.size; i++, j++, k++, l--) {
            let player_cell_truth = this.cells[i][j].placedBy == this.players.PLAYER;
            let computer_cell_truth = this.cells[i][j].placedBy == this.players.COMP;
            player_diagonal1_truth *= player_cell_truth;
            comp_diagonal1_truth *= computer_cell_truth;

            player_cell_truth = this.cells[k][l].placedBy == this.players.PLAYER;
            computer_cell_truth = this.cells[k][l].placedBy == this.players.COMP;
            player_diagonal2_truth *= player_cell_truth;
            comp_diagonal2_truth *= computer_cell_truth;
        }
        player_win += player_diagonal1_truth + player_diagonal2_truth;
        computer_win += comp_diagonal1_truth + comp_diagonal2_truth;
        // Checks row wise and column wise
        if (!(player_win || computer_win))
            for (let i = 0; i < this.size; i++) {
                let player_column_truth = true, comp_column_truth = true;
                let player_row_truth = true, comp_row_truth = true;
                for (let j = 0; j < this.size; j++) {
                    let player_cell_truth = this.cells[i][j].placedBy == this.players.PLAYER;
                    let comp_cell_truth = this.cells[i][j].placedBy == this.players.COMP;
                    player_column_truth *= player_cell_truth;
                    comp_column_truth *= comp_cell_truth;

                    player_cell_truth = this.cells[j][i].placedBy == this.players.PLAYER;
                    comp_cell_truth = this.cells[j][i].placedBy == this.players.COMP;
                    player_row_truth *= player_cell_truth;
                    comp_row_truth *= comp_cell_truth;
                }
                player_win += player_column_truth + player_row_truth;
                computer_win += comp_column_truth + comp_row_truth;
                if (player_win || computer_win)
                    break;
                else {
                    player_win = false;
                    computer_win = false;
                }
            }
        this.winner = player_win ? 'Player' : computer_win ? 'Computer' : null;
        this.gameStates.over = true;
        if (this.winner == null) {
            this.gameStates.over = this.isGameBoardFull() ? true : false;
            if (this.gameStates.over)
                this.winner = 'Tie';
        }
    };

    // Checks if the gameboard is filled
    this.isGameBoardFull = () => {
        let cell_truth = true;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                cell_truth *= this.cells[i][j].placedBy != null;
            }
        }
        return cell_truth;
    };
}

document.addEventListener('DOMContentLoaded', () => {
    let gb = new Gameboard(3);
    gb.setupBoard();
    document.addEventListener('click', (e) => {
        let clickedPosition = getMousePos(gb.canvas, e);
        if (gb.currentTurn == gb.players.PLAYER && !gb.gameStates.over) {
            gb.placeMarker(gb.getCell(clickedPosition), gb.players.PLAYER);
        }
    });
});

// Utility Functions
// Minimax algorithm for making the computer play intelligently
function minimax(gb, isMaximizing) {
    gb.checkForWin();
    if (gb.gameStates.over) {
        let value = gb.boardValue[gb.winner];
        return value;
    }

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < gb.size; i++) {
            for (let j = 0; j < gb.size; j++) {
                if (gb.cells[i][j].placedBy == null) {
                    gb.cells[i][j].placedBy = gb.players.COMP;
                    let score = minimax(gb, false);
                    gb.removeMarker(gb.cells[i][j]);
                    bestScore = Math.max(bestScore, score);
                }
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < gb.size; i++) {
            for (let j = 0; j < gb.size; j++) {
                if (gb.cells[i][j].placedBy == null) {
                    gb.cells[i][j].placedBy = gb.players.PLAYER;
                    let score = minimax(gb, true);
                    gb.removeMarker(gb.cells[i][j]);
                    bestScore = Math.min(bestScore, score);
                }
            }
        }
        return bestScore;
    }
}

// Returns distance between two points
function distance(position1, position2) {
    return ((position1.x - position2.x) ** 2 + (position1.y - position2.y) ** 2) ** 0.5;
}

// Returns the coordinates of point where the mouse is clicked inside the canvas
function getMousePos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}