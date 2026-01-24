export class Input{
    constructor(){
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
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
            forward: this.forward,
            backward: this.backward,
            left: this.left,
            right: this.right
        };
    }
}