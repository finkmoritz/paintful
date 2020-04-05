let mousePressed = false;
let lastX, lastY;
let ctx;
let canvas;

$('document').ready(function(){
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext("2d");

    //window.addEventListener('resize', resizeCanvas, false);
    //window.addEventListener('orientationchange', resizeCanvas, false);
    resizeCanvas();

    canvas.addEventListener("mousedown", beginDraw);
    canvas.addEventListener("touchstart", beginDrawMobile);

    canvas.addEventListener("mousemove", doDraw);
    canvas.addEventListener("touchmove", doDrawMobile);

    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("touchend", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
});

function beginDraw (e) {
    mousePressed = true;
    draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, false);
}

function beginDrawMobile (e) {
    mousePressed = true;
    draw(getMobilePosX(e) - $(this).offset().left, getMobilePosY(e) - $(this).offset().top, false);
}

function doDraw (e) {
    if (mousePressed) {
        draw(e.pageX - $(this).offset().left, e.pageY - $(this).offset().top, true);
    }
}

function doDrawMobile (e) {
    if (mousePressed) {
        draw(getMobilePosX(e) - $(this).offset().left, getMobilePosY(e) - $(this).offset().top, true);
    }
}

function endDraw (e) {
    mousePressed = false;
}

function draw(x, y, isDown) {
    if (isDown) {
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = '4px';
        ctx.lineJoin = "round";
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.stroke();
    }
    lastX = x; lastY = y;
}

function getMobilePosX(e) {
    return (e.targetTouches[0] ? e.targetTouches[0].pageX : e.changedTouches[e.changedTouches.length-1].pageX)
}

function getMobilePosY(e) {
    return (e.targetTouches[0] ? e.targetTouches[0].pageY : e.changedTouches[e.changedTouches.length-1].pageY)
}

function resizeCanvas() {
    let size = 0.6 * Math.min(window.innerWidth, window.innerHeight);
    canvas.width = size;
    canvas.height = size;
}

function clearCanvas() {
    // Use the identity matrix while clearing the canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}