import express from 'express';
import { createServer } from 'http';
import {Server} from 'socket.io';

const PORT = 3000;
const clientPORT = 888;
const SPEED = 4;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: `http://localhost:${clientPORT}`,
    }
});

const TICK_RATE = 20;
const players = new Map();
const lastInput = new Map();
let tick = 0;

io.on('connection', (socket) => {
    console.log(`New player connected: ${socket.id}`);
    socket.emit('welcome', { message: `Connected to 3D multiplayer browser racing game! Your id: ${socket.id}`});
    console.log(`Number of active players: ${io.engine.clientsCount}`);
    players.set(socket.id, { id: socket.id, position: { x: 0, y: 0, z: 0 }, lastProcessedInput: 0 });
    socket.emit('initPlayer', { id: socket.id });

    socket.on('playerInput', (inputPack) => {
        lastInput.set(socket.id, inputPack);
    });
    
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        players.delete(socket.id);
        console.log(`Number of active players: ${io.engine.clientsCount}`);
        socket.broadcast.emit('playerDisconnected', socket.id );
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}\n
To start game open http://localhost:${clientPORT} in your browser.`);
});

function simulatePlayer(player, inputPack) {
    const input = inputPack.input;
    if (input.forward) player.position.x -= SPEED;
    if (input.backward) player.position.x += SPEED;
    if (input.left) player.position.z += SPEED;
    if (input.right) player.position.z -= SPEED;
}

setInterval(() => {
    for (const [playerId, inputPack] of lastInput.entries()) {
        const player = players.get(playerId);
        if (!player) continue;

        if (inputPack) {
            if(inputPack.seq > player.lastProcessedInput) {
            simulatePlayer(player, inputPack);
            player.lastProcessedInput = inputPack.seq;
            }
        }
    }

    const snapshot = { tick, serverTime: Date.now(), players: Array.from(players.values()) };
    io.sockets.emit('snapshot', snapshot);
    tick++;
}, 1000 / TICK_RATE);