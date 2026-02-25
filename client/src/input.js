export class Input{
    constructor(){
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;

        this.targetThrottle = 0;
        this.targetSteer = 0;
    }

    setForward(value){
        this.forward = value;
    }

    setBackward(value){
        this.backward = value;
    }

    setLeft(value){
        this.left = value;
    }

    setRight(value){
        this.right = value;
    }

    hasInput(){
        return this.forward || this.backward || this.left || this.right;
    }

    getInput(){
        return {
            throttle: (this.forward ? 1 : 0) + (this.backward ? -1 : 0),
            steer: (this.left ? -1 : 0) + (this.right ? 1 : 0)
        };
    }
}