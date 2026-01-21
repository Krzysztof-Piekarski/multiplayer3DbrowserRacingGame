import express from 'express';
import { createServer } from 'http';
import {Server} from 'socket.io';

const PORT = 3000;
const clientPORT = 888;
const SPEED = 1;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: `http://localhost:${clientPORT}`,
    }
});

const TICK_RATE = 20;
const players = new Map();

io.on('connection', (socket) => {
    console.log(`New player connected: ${socket.id}`);
    socket.emit('welcome', { message: `Connected to 3D multiplayer browser racing game! Your id: ${socket.id}`});
    console.log(`Number of active players: ${io.engine.clientsCount}`);
    players.set(socket.id, { id: socket.id, position: { x: 0, y: 0, z: 0 } });
    socket.emit('initPlayer', { id: socket.id });

    socket.on('playerInput', (inputData) => {
        const player = players.get(socket.id);
        if (!player) return;
        applyPlayerInput(player, inputData);
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

function applyPlayerInput(player, inputData) {
    if (inputData.forward) player.position.z -= SPEED;
    if (inputData.backward) player.position.z += SPEED;
    if (inputData.left) player.position.x -= SPEED;
    if (inputData.right) player.position.x += SPEED;
}

let lastTime = Date.now();
setInterval(() => {
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;
}, 1000 / TICK_RATE);

setInterval(() => {
    const playersArray = Array.from(players.values());
    io.sockets.emit('playersUpdate', playersArray);
}, 1000 / TICK_RATE);