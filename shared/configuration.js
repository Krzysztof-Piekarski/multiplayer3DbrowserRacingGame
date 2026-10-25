export class Config{
    static TICK_RATE = 20;
    static RESOLUTION_DOWNGRADE = 2;

    static INIT_X_POS = -259;
    static INIT_Z_POS = 280;

    static ROAD_WIDTH = 20;
    static ROAD_Y = 0.2;
    static TOTAL_LAPS = 2;

    static MAX_SPEED = 44;
    static ACCELERATION = 20;
    static FRICTION = 6;
    static TURN_RATE = 2;
    static RESPONSE = 10;

    static CAR_DIAMETER = 10;
    static COLLISION_PUSH = 10;

    static GRAVITY = 36;
    static RESPAWN_HEIGHT = -40;

    static GAME_STATE = {
        LOBBY: 'lobby',
        RACE: 'race',
        FINISHED: 'finished'
    };
}