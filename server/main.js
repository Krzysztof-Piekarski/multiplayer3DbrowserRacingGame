import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Set } from '../shared/settings.js';
import { Road } from '../shared/road.js';
import * as HELPERS from '../shared/helpers.js';

const PORT = 3000;
const clientPORT = 888;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: `http://localhost:${clientPORT}`,
    }
});

const players = new Map();
const inputQueue = new Map();
let tick = 0;

io.on('connection', (socket) => {
    console.log(`New player connected: ${socket.id}`);
    socket.emit('welcome', { message: `Connected to 3D multiplayer browser racing game! Your id: ${socket.id}`});
    console.log(`Number of active players: ${io.engine.clientsCount}`);
    players.set(socket.id, { id: socket.id,
                position: { x: Set.INIT_X_POS, y: Set.ROAD_Y, z: Set.INIT_Z_POS }, 
                velocity: 0, velocityY: 0, rotation: -1.25, throttle: 0, steer: 0,
                actualSegment: 0, lastSegment: 0, isGrounded: true, falling: false,
                lastProcessedInput: 0, lap: 0 });
    inputQueue.set(socket.id, []);
    socket.emit('initPlayer', { id: socket.id });

    socket.on('playerInput', (inputPack) => {
        inputQueue.get(socket.id).push(inputPack);
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

const road = new Road();
const points = await HELPERS.loadSampledPointsFromRoadCurveServer();
road.initFromSampledPoints(points);

function simulatePlayer(player, inputPack, dt) {
    if(player.isGrounded){
        player.isGrounded = road.isGrounded(player);
        const input = inputPack.input;

        player.throttle += (input.throttle - player.throttle) * Set.RESPONSE * dt;
        player.steer += (input.steer - player.steer) * Set.RESPONSE * dt;

        let targetSpeed = 0;
        
        if (input.throttle > 0) {
            targetSpeed = Set.MAX_SPEED * input.throttle;
        } else if (input.throttle < 0) {
            targetSpeed = -Set.MAX_SPEED * -input.throttle;
        }

        const acceleration = Math.abs(targetSpeed) > Math.abs(player.velocity) ? Set.ACCELERATION : Set.FRICTION;

        player.velocity = HELPERS.moveTowards(player.velocity, targetSpeed, acceleration*dt);

        let turnRate = Set.TURN_RATE;
        if(input.handbrake){
            turnRate *= 2;
            player.velocity *= 0.95;
        }

        const speedFactor = Math.min(Math.abs(player.velocity) / Set.MAX_SPEED, 1);
        const direction = Math.sign(player.velocity) || 1;
        player.rotation += player.steer * turnRate * speedFactor * dt * direction;

        updateLapCounter(player, road.getLength());
    }

    if(player.falling){
        if(player.position.y < Set.RESPAWN_HEIGHT){
            respawn(player)
        }else{
            player.velocityY -= Set.GRAVITY * dt;
            player.position.y += player.velocityY * dt;
        }
    }

    player.position.x += Math.cos(player.rotation) * player.velocity * dt;
    player.position.z += Math.sin(player.rotation) * player.velocity * dt;
}

function respawn(player){
    player.velocity = 0;
    player.velocityY = 0;
    player.isGrounded = true;
    player.falling = false;

    const segPos = road.getSegmentCenterPos(player.actualSegment);
    player.position.x = segPos.x;
    player.position.z = segPos.z;
    player.position.y = Set.ROAD_Y;
    player.rotation = road.getSegmentRotation(player.actualSegment);
}

function updateLapCounter(player, roadLength){
    if (player.lastSegment > roadLength - 10 &&
        player.actualSegment < 10){
            player.lap++;
        }

    player.lastSegment = player.actualSegment;
}

function resolveAllCollisions(){
    const list = Array.from(players.values());

    for (let i = 0; i < list.length; i++){
        for (let j = i+1; j < list.length; j++){

            if (carsCollide(list[i], list[j])){
                resolveCollision(list[i], list[j]);
            }
        }
    }
}

function carsCollide(a, b){
    const dx = a.position.x - b.position.x;
    const dz = a.position.z - b.position.z;
    const res = dx*dx + dz*dz < Set.CAR_DIAMETER;
    return res;
}

function resolveCollision(a, b){
    const dx = a.position.x - b.position.x;
    const dz = a.position.z - b.position.z;

    const length = Math.hypot(dx, dz);
    if (length == 0) return;

    const nx = dx / length;
    const nz = dz / length;

    a.position.x += nx * Set.COLLISION_PUSH;
    a.position.z += nz * Set.COLLISION_PUSH;
    b.position.x -= nx * Set.COLLISION_PUSH;
    b.position.z -= nz * Set.COLLISION_PUSH;

    a.velocity *= 0.8;
    b.velocity *= 0.8;
}

setInterval(() => {
    for (const [playerId, inputPack] of inputQueue.entries()) {
        const player = players.get(playerId);
        if (!player) continue;

        const inputPacks = inputQueue.get(playerId);
        while (inputPacks.length > 0) {
            const inputPack = inputPacks.shift();
            simulatePlayer(player, inputPack, 1 / Set.TICK_RATE);
            player.lastProcessedInput = inputPack.seq;
        }
    }

    resolveAllCollisions();

    const snapshot = { tick, serverTime: Date.now(), players: Array.from(players.values()) };
    io.sockets.emit('snapshot', snapshot);
    tick++;
}, 1000 / Set.TICK_RATE);