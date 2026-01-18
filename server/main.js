import express from 'express';
import { createServer } from 'http';
import {Server} from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:8024",
    }
});

const PORT = 3000;

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    socket.emit('welcome', { message: 'Welcome to the 3D multiplayer browser racing game!' });
    socket.on('playerMove', (movementData) => {
        socket.broadcast.emit('playerMoved', { id: socket.id, movement: movementData });
    });
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        socket.broadcast.emit('playerDisconnected', socket.id );
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}\nTo start game open http://localhost:8024 in your browser.`);
});