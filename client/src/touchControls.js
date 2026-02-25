export function setupTouchControls(input) {
    function setupTouchButton(element, onPress, onRelease){
        element.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            element.classList.add('pressed');
            onPress();
        });

        function release() {
            element.classList.remove('pressed');
            onRelease();
        }

        element.addEventListener('pointerup', release);
        element.addEventListener('pointercancel', release);
        element.addEventListener('pointerleave', release);
    }

    const forwardBtn = document.getElementById('forward-btn');
    const backwardBtn = document.getElementById('backward-btn');
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');

    setupTouchButton(forwardBtn,
        () => input.setForward(true),
        () => input.setForward(false)
    )

    setupTouchButton(backwardBtn,
        () => input.setBackward(true),
        () => input.setBackward(false)
    )

    setupTouchButton(leftBtn,
        () => input.setLeft(true),
        () => input.setLeft(false)
    )

    setupTouchButton(rightBtn,
        () => input.setRight(true),
        () => input.setRight(false)
    )
}