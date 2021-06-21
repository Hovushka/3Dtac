import './main.css'
import { Vec2 } from './vector'

const DEBUG = false;

const display = new function () {
    this.cvs = document.getElementById('myCanvas');
    this.ctx = this.cvs.getContext('2d');
    this.border = {
        left: this.cvs.scrollWidth - this.cvs.width,
        top: this.cvs.scrollHeight - this.cvs.height
    };
};

const buffer = new function () {
    this.cvs = document.createElement('canvas');
    this.cvs.width = display.cvs.width;
    this.cvs.height = display.cvs.height;
    this.ctx = this.cvs.getContext('2d');
};

const state = new function () {
    this.cursorPos = new Vec2(-1, -1);
    this.cursorHover = new Vec2(-1, -1);
    this.prevTime = 0;
    this.deltaTime = 0;
    this.board_len = 4;
    this.paths = genCells(this.board_len);
    this.logic = genLogicBoard(this.board_len);
    this.player1 = true;

    this.winner = -1;
    this.winning_cells = new Array(this.board_len).fill(-1);
    this.counter = 0;

    if (DEBUG) this.telemetry = [];
};

function moveTo(cell, point) {
    const {x, y} = point;
    cell.moveTo(x, y);
}

function lineTo(cell, point) {
    const {x, y} = point;
    cell.lineTo(x, y);
}

function makeCell(offset, len, height, flip, dX) {
    const 
        center = offset.add(new Vec2((len + dX) / 2, height / 2)),
        point1 = offset.add(new Vec2(0, 0)),
        point2 = offset.add(new Vec2(len, 0)),
        point3 = offset.add(new Vec2(len + dX, height)),
        point4 = offset.add(new Vec2(dX, height));

    const cell = new Path2D();

    moveTo(cell, point1);
    lineTo(cell, point2);
    lineTo(cell, point3);
    lineTo(cell, point4);
    cell.closePath();

    const cross = new Path2D();

    const 
        diag13 = point3.sub(point1),
        length13 = diag13.norm(),
        normal13 = diag13.normalize(),

        diag24 = point4.sub(point2),
        length24 = diag24.norm(),
        normal24 = diag24.normalize();

    moveTo(cross, point1.add(normal13.scale(length13 / 4)));
    lineTo(cross, point1.add(normal13.scale(length13 * 3 / 4)));
    moveTo(cross, point2.add(normal24.scale(length24 / 4)));
    lineTo(cross, point2.add(normal24.scale(length24 * 3 / 4)));

    const circle = new Path2D();

    circle.ellipse(
        center.x, center.y, 
        length13 / 4, length24 / 4, 
        flip ? (Math.PI / 2 - Math.asin(height / len) / 2) : (Math.asin(height / len) / 2),
        0, 2 * Math.PI
    );

    return [cell, cross, circle];
}

function genCells(board_len) {
    const
        voffset = 18,
        padding = 4,
        height = (display.cvs.height - 2 * voffset -
                    padding * (board_len - 1)) / Math.pow(board_len, 2),
        len = height * (32 / 27),
        flip = false,
        dX = Math.sqrt(Math.pow(len, 2) - Math.pow(height, 2)) * (flip ? -1 : 1),
        start_offset = new Vec2(
            Math.round((display.cvs.width - (len + dX) * board_len) / 2), voffset);

    const ret = { cells: [], crosses: [], circles: [] };
    for (let y = 0; y < Math.pow(board_len, 2); y++) 
        for (let x = 0; x < board_len; x++) {
            const 
                new_offset = start_offset.add(
                    new Vec2((y % board_len) * dX + x * len, 
                        Math.floor(y / board_len) * padding + y * height)),
                [cell, cross, circle] = makeCell(new_offset, len, height, flip, dX);

            ret.cells.push(cell);
            ret.crosses.push(cross);
            ret.circles.push(circle);
        }

    return ret;
}

function genLogicBoard(board_len) {
    return new Array(Math.pow(board_len, 3)).fill(0);
}

function undoState() {
    state.player1 = true;

    state.winner = -1;
    state.winning_cells = new Array(state.board_len).fill(-1);

    state.counter = 0;
    state.logic.fill(0);
}

function changeBoard() {
    state.board_len = document.getElementById('inputBox').value;
    state.paths = genCells(state.board_len);
    state.logic = genLogicBoard(state.board_len);
    undoState();
}

function index([x, y, z]) {
    return z * Math.pow(state.board_len, 2) + y * state.board_len + x;
}

function unindex(idx) {
    const
        z = Math.floor(idx / Math.pow(state.board_len, 2)),
        y = Math.floor((idx % Math.pow(state.board_len, 2)) / state.board_len),
        x = idx % Math.pow(state.board_len, 2) % state.board_len;

    return [x, y, z];
}

function chooseIndexation(idx, iter, [x, y, z]) {
    switch (idx) {
        // Regular
        case 0: return [iter, y, z];
        case 1: return [x, iter, z];
        case 2: return [x, y, iter];

        // 2D Diagonals
        case 3: return [iter, iter, z];
        case 4: return [state.board_len - 1 - iter, iter, z];

        case 5: return [x, iter, iter];
        case 6: return [x, state.board_len - 1 - iter, iter];

        case 7: return [iter, y, iter];
        case 8: return [state.board_len - 1 - iter, y, iter];

        // 3D Diagonals
        case 9: return  [iter, iter, iter];
        case 10: return [state.board_len - 1 - iter, state.board_len - 1 - iter, iter];

        case 11: return [state.board_len - 1 - iter, iter, iter];
        case 12: return [iter, state.board_len - 1 - iter, iter];
    }
}

function fillWinningCells(idx, point) {
    for (let iter = 0; iter < state.board_len; iter++) {
        state.winning_cells[iter] = index(chooseIndexation(idx, iter, point));
    }
}

function checkWin(player, point) {
    let checks = new Array(13).fill(true);

    for (let iter = 0; iter < state.board_len; iter++) {
        let allCheck = false;
        for (const [idx, check] of checks.entries()) {
            const value = state.logic[index(chooseIndexation(idx, iter, point))];

            checks[idx] = check ? (!player || value == 1) && (player || value == 2) : false;
            allCheck ||= checks[idx];
        }

        if (!allCheck) break;
    }

    let idx;
    if ((idx = checks.findIndex((elem) => elem == true)) != -1) {
        state.winner = player ? 1 : 2;
        fillWinningCells(idx, point);
        return;
    }
}

function gameLogic(ctx) {
    if (state.winner > -1) {
        state.cursorPos = new Vec2(-1, -1);
        return;
    }

    if (state.cursorPos.comp(new Vec2(-1, -1)))
        return;

    for (let i = 0; i < state.logic.length; i++) {
        if (ctx.isPointInPath(state.paths.cells[i], state.cursorPos.x, state.cursorPos.y)) {
            const point = unindex(i);

            if (DEBUG) state.telemetry.push(point);

            if (state.logic[i] != 0)
                break;

            state.logic[i] = state.player1 ? 1 : 2;
            checkWin(state.player1, point);

            if (++state.counter == Math.pow(state.board_len, 3))
                state.winner = 0;

            state.player1 = !state.player1;
            break;
        }
    }

    state.cursorPos = new Vec2(-1, -1);
}

function clearScreen(cvs, ctx) {
    const dumpFillStyle = ctx.fillStyle;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = dumpFillStyle;
}

function isWinningCell(i) {
    return state.winning_cells.findIndex(elem => elem == i) != -1;
}

function drawCell(ctx) {
    ctx.save();

    let delayedPath = -1;
    ctx.fillStyle = "#FFFF00";

    for (let i = 0; i < state.logic.length; i++) {
        if (isWinningCell(i))
            ctx.fill(state.paths.cells[i]);

        if (delayedPath == -1 && ctx.isPointInPath(
            state.paths.cells[i], state.cursorHover.x, state.cursorHover.y)) {
            delayedPath = i;
        } else {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.stroke(state.paths.cells[i]);
        }

        if (state.logic[i] == 1) {
            ctx.strokeStyle = "#5555FF";
            ctx.lineWidth = 3;
            ctx.stroke(state.paths.crosses[i]);
        }

        if (state.logic[i] == 2) {
            ctx.strokeStyle = "#FF00FF";
            ctx.lineWidth = 3;
            ctx.stroke(state.paths.circles[i]);
        }
    }

    if (delayedPath > -1) {
        ctx.strokeStyle = (state.logic[delayedPath] == 0) ? "#00FF00" : "#FF0000";
        ctx.lineWidth = 2;
        ctx.stroke(state.paths.cells[delayedPath]);
    }

    ctx.restore();
}

function printDebug(cvs, ctx) {
    ctx.save();

    let offset = 10;
    ctx.font = "10px Arial";
    ctx.fillText("Resolution: " + cvs.width.toString() + " x " + cvs.height.toString(), 10, (offset += 10));
    ctx.fillText("FPS: " + Math.round(1000 / state.deltaTime).toString(), 10, (offset += 10));
    ctx.fillText("Hover position: " + 
        state.cursorHover.x.toString() + " x " + state.cursorHover.y.toString(), 10, (offset += 10));
    ctx.fillText("Winner: " + state.winner.toString() 
        + ", (" + state.winning_cells.toString() + ")", 10, (offset += 10));

    let padding = 0;
    ctx.fillText("Telemetry:", 10, (offset += 20));
    for (const point of state.telemetry) {
        ctx.fillText(
            "(" + point[0].toString() + ", " 
                + point[1].toString() + ", "  
                + point[2].toString() + ")", 10, (offset += 10));

        offset += 10 * (++padding % 4 == 0);
    }

    ctx.restore();
}

function drawWinner(cvs, ctx) {
    if (state.winner == -1)
        return;

    ctx.save();

    ctx.font = "100px Arial";
    let message;

    switch (state.winner) {
        case 0:
            message = "Loosers";
            ctx.fillStyle = "#000000";
            break;
        case 1:
            message = "P1 Wins";
            ctx.fillStyle = "#5555FF";
            break;
        case 2:
            message = "P2 Wins";
            ctx.fillStyle = "#FF00FF";
            break;
    }

    const 
        metrics = ctx.measureText(message),
        txtheight = metrics.actualBoundingBoxAscent 
                + metrics.actualBoundingBoxDescent;

    ctx.fillRect(0, 0, txtheight, cvs.height);
    ctx.fillRect(cvs.width - txtheight, 0, txtheight, cvs.height);

    ctx.fillStyle = "#FFFFFF";

    ctx.save();
    ctx.translate(txtheight, (cvs.height + metrics.width) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(message, 0, 0);
    ctx.restore();

    ctx.translate(cvs.width - txtheight, (cvs.height - metrics.width) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(message, 0, 0);

    ctx.restore();
}

function draw(cvs, ctx) {
    clearScreen(cvs, ctx);
    drawWinner(cvs, ctx);
    drawCell(ctx);
    if (DEBUG) printDebug(cvs, ctx);
}

function getCursorPositionCallback(cvs, e) {
    const rect = cvs.getBoundingClientRect();
    state.cursorPos.x = e.clientX - rect.left - display.border.left;
    state.cursorPos.y = e.clientY - rect.top - display.border.top;
}

function getCursorHoverCallback(cvs, e) {
    const rect = cvs.getBoundingClientRect();
    state.cursorHover.x = e.clientX - rect.left - display.border.left;
    state.cursorHover.y = e.clientY - rect.top - display.border.top;
}

function gameLoopCallback(currTime) {
    state.deltaTime = currTime - state.prevTime;

    gameLogic(buffer.ctx);
    draw(buffer.cvs, buffer.ctx);
    display.ctx.drawImage(buffer.cvs, 0, 0);

    state.prevTime = currTime;
    window.requestAnimationFrame(gameLoopCallback);
}

display.cvs.addEventListener('mousedown', function (e) { getCursorPositionCallback(display.cvs, e); });
display.cvs.addEventListener('mousemove', function (e) { getCursorHoverCallback(display.cvs, e); });
window.undoState = undoState;
window.changeBoard = changeBoard;
window.requestAnimationFrame(gameLoopCallback);
