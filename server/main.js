import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Config } from '../shared/configuration.js';
import { Road } from '../shared/road.js';
import * as HELPERS from '../shared/helpers.js';

const app = express();

const publicFilename = fileURLToPath(import.meta.url);
const publicDirname = path.dirname(publicFilename);
const buildPath = path.resolve(publicDirname, '..', 'build');

app.use(express.static(buildPath));

app.get('/{*splat}', (req, res, next) => {
    res.sendFile(path.join(buildPath, 'index.html'), (err) => {
        if (err) next(err);
    })
})

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

let gameState = Config.GAME_STATE.LOBBY;
const players = new Map();
const inputQueue = new Map();
let tick = 0;
let raceStartTime = null;

io.on('connection', (socket) => {
    console.log(`New player connected: ${socket.id}`);
    socket.emit('welcome', { message: `Connected to 3D multiplayer browser racing game! Your id: ${socket.id}`});
    console.log(`Number of active players: ${io.engine.clientsCount}`);
    
    if(gameState === Config.GAME_STATE.LOBBY){
        players.set(socket.id, { id: socket.id, nickname: `Noname player-${socket.id.slice(0, 4)}`,
                    position: { x: Config.INIT_X_POS, y: Config.ROAD_Y, z: Config.INIT_Z_POS }, 
                    velocity: 0, velocityY: 0, rotation: -1.25, throttle: 0, steer: 0,
                    actualSegment: 0, lastSegment: 0, lap: 0, progress: 0, finish: false,
                    finishTime: 0, isGrounded: true, falling: false, lastProcessedInput: 0, });
        inputQueue.set(socket.id, []);
        socket.emit('initPlayer', { id: socket.id });
    }else{
        socket.emit('initObserver');
    }

    emitLobbtyUpdate();

    socket.on('setNickname', (data) => {
        const player = players.get(socket.id);
        if (!player){
            return;
        }
        if (typeof data?.nickname !== 'string'){
            return;
        }

        const nickname = data.nickname
            .trim()
            .replace(/\s+/g, '')
            .slice(0, 21);
        if (!nickname){
            return;
        }

        player.nickname = nickname;

        console.log(`Player: ${socket.id} changed nickname to ${nickname}`);

        emitLobbtyUpdate();
    })

    socket.on('clientStartRace', () => {
        if(gameState !== Config.GAME_STATE.LOBBY || players.size < 2) return;
        startRace();
    });

    socket.on('playerInput', (inputPack) => {
        inputQueue.get(socket.id).push(inputPack);
    });
    
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}, nick: ${players.get(socket.id).nickname}`);
        players.delete(socket.id);
        console.log(`Number of active players: ${io.engine.clientsCount}`);
        socket.broadcast.emit('playerDisconnected', socket.id);
        emitLobbtyUpdate();
    });
});

function emitLobbtyUpdate(){
    const playersCount = players.size;
    io.emit('lobbyUpdate', {playersCount, gameState});
}

server.listen(Config.PORT, '0.0.0.0', () => {
    console.log(`Game server running on port ${Config.PORT}`);
});

const road = new Road();
const points = await HELPERS.loadSampledPointsFromRoadCurveServer();
road.initFromSampledPoints(points);

function simulatePlayer(player, inputPack, dt) {
    if(player.finish){
        return;
    }

    if(player.isGrounded){
        player.isGrounded = road.isGrounded(player);
        const input = inputPack.input;

        player.throttle += (input.throttle - player.throttle) * Config.RESPONSE * dt;
        player.steer += (input.steer - player.steer) * Config.RESPONSE * dt;

        let targetSpeed = 0;
        
        if (input.throttle > 0) {
            targetSpeed = Config.MAX_SPEED * input.throttle;
        } else if (input.throttle < 0) {
            targetSpeed = -Config.MAX_SPEED * -input.throttle;
        }

        const acceleration = Math.abs(targetSpeed) > Math.abs(player.velocity) ? Config.ACCELERATION : Config.FRICTION;

        player.velocity = HELPERS.moveTowards(player.velocity, targetSpeed, acceleration*dt);

        const speedFactor = Math.min(Math.abs(player.velocity) / Config.MAX_SPEED, 1);
        const direction = Math.sign(player.velocity) || 1;
        player.rotation += player.steer * Config.TURN_RATE * speedFactor * dt * direction;

        updateRoadProgress(player, road.getLength());
    }

    if(player.falling){
        if(player.position.y < Config.RESPAWN_HEIGHT){
            respawn(player)
        }else{
            player.velocityY -= Config.GRAVITY * dt;
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
    player.position.y = Config.ROAD_Y;
    player.rotation = road.getSegmentRotation(player.actualSegment);
}

function updateRoadProgress(player, roadLength){
    if(!player.finish){
        if ((player.lastSegment > roadLength - 10) &&
            (player.actualSegment < 10) && 
            (player.lap < Config.TOTAL_LAPS)){
                player.lap++;
        }

        player.lastSegment = player.actualSegment;

        const totalSegments = Config.TOTAL_LAPS * roadLength;
        player.progress = (player.lap * roadLength + player.actualSegment) / totalSegments;

        if(player.progress > 1){
            if(!player.isGrounded) respawn(player);
            player.finish = true;
            player.progress = 1;
            player.finishTime = Date.now() - raceStartTime;
            io.to(player.id).emit('finishUpdate');
            io.emit('playerFinished', player.id);
        }
    }
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
    if(a.finish || b.finish) return false;

    const dx = a.position.x - b.position.x;
    const dz = a.position.z - b.position.z;
    const res = dx*dx + dz*dz < Config.CAR_DIAMETER;
    return res;
}

function resolveCollision(a, b){
    const dx = a.position.x - b.position.x;
    const dz = a.position.z - b.position.z;

    const length = Math.hypot(dx, dz);
    if (length == 0) return;

    const nx = dx / length;
    const nz = dz / length;

    a.position.x += nx * Config.COLLISION_PUSH;
    a.position.z += nz * Config.COLLISION_PUSH;
    b.position.x -= nx * Config.COLLISION_PUSH;
    b.position.z -= nz * Config.COLLISION_PUSH;

    a.velocity *= 0.8;
    b.velocity *= 0.8;
}

function startRace(){
    if(gameState !== Config.GAME_STATE.LOBBY || players.size < 2) return;
    gameState = Config.GAME_STATE.RACE;
    raceStartTime = Date.now();
    emitLobbtyUpdate();

    setInterval(() => {
        for (const [playerId, inputPack] of inputQueue.entries()) {
            const player = players.get(playerId);
            if (!player) continue;

            const inputPacks = inputQueue.get(playerId);
            while (inputPacks.length > 0) {
                const inputPack = inputPacks.shift();
                simulatePlayer(player, inputPack, 1 / Config.TICK_RATE);
                player.lastProcessedInput = inputPack.seq;
            }
        }

        resolveAllCollisions();

        const snapshot = { tick, serverTime: Date.now(), players: Array.from(players.values()) };
        io.emit('snapshot', snapshot);
        tick++;
    }, 1000 / Config.TICK_RATE);
}