let buffer2;
let buffer1;
let frequencySlider, amplitudeSlider, soundToggle, pausePlayBtn, resetBtn, bounceToggle, wallToggle, wallAngleSlider, wallDistanceSlider;
let frequency = 100;
let amplitude = 0.5;
const DAMPENING = 0.9995;
let oscillator;
let isPaused = false;
let shouldBounce = true;
let showWall = false;
let wallAngle = 0;
let wallDistance = 0.5;
const WAVE_SCALE = 20;


function setup() {
  const canvas = createCanvas(550, 550); 
  canvas.parent('canvas-container');
  pixelDensity(1);

  canvas.elt.getContext('2d', { willReadFrequently: true });

  buffer2 = Array(width).fill().map(() => Array(height).fill(0));
  buffer1 = Array(width).fill().map(() => Array(height).fill(0));

  setupControls();
  setupOscillator();
}

function setupControls() {
    frequencySlider = select('#frequencySlider');
    amplitudeSlider = select('#amplitudeSlider');
    soundToggle = select('#soundToggle');
    pausePlayBtn = select('#pausePlayBtn');
    resetBtn = select('#resetBtn');
    bounceToggle = select('#bounceToggle');
    wallToggle = select('#wallToggle');
    wallAngleSlider = select('#wallAngleSlider');
    wallDistanceSlider = select('#wallDistanceSlider');

    frequencySlider.input(updateFrequency);
    amplitudeSlider.input(updateAmplitude);
    soundToggle.changed(toggleSound);
    pausePlayBtn.mousePressed(togglePause);
    resetBtn.mousePressed(resetSimulation);
    bounceToggle.changed(updateBounce);
    wallToggle.changed(updateWall);
    wallAngleSlider.input(updateWallAngle);
    wallDistanceSlider.input(updateWallDistance);
}

function setupOscillator() {
    oscillator = new p5.Oscillator('sine');
    oscillator.freq(frequency);
    oscillator.amp(0);
}

function updateFrequency() {
    frequency = frequencySlider.value();
    select('#frequencyValue').html(frequency);
    if (oscillator) oscillator.freq(frequency);
}

function updateAmplitude() {
    amplitude = amplitudeSlider.value() / 100;
    select('#amplitudeValue').html(amplitudeSlider.value());
    if (oscillator && soundToggle.checked()) oscillator.amp(amplitude, 0.1);
}

function toggleSound() {
    if (soundToggle.checked()) {
        oscillator.start();
        oscillator.amp(amplitude, 0.1);
    } else {
        oscillator.amp(0, 0.1);
    }
}

function togglePause() {
    isPaused = !isPaused;
    pausePlayBtn.html(isPaused ? '<i class="bi bi-play-fill"></i> Reproducir' : '<i class="bi bi-pause-fill"></i> Pausar');
    if (isPaused) {
        noLoop();
        if (oscillator) oscillator.amp(0, 0.1);
    } else {
        loop();
        if (oscillator && soundToggle.checked()) oscillator.amp(amplitude, 0.1);
    }
}

function resetSimulation() {
    buffer1 = Array(width).fill().map(() => Array(height).fill(0));
    buffer2 = Array(width).fill().map(() => Array(height).fill(0));
}

function updateBounce() {
    shouldBounce = bounceToggle.checked();
}

function updateWall() {
    showWall = wallToggle.checked();
    resetSimulation();
}

function updateWallAngle() {
    wallAngle = wallAngleSlider.value();
    select('#wallAngleValue').html(wallAngle);
    resetSimulation();
}

function updateWallDistance() {
    wallDistance = wallDistanceSlider.value() / 100;
    select('#wallDistanceValue').html(wallDistanceSlider.value());
    resetSimulation();
}

function createWave(x, y, strength) {
  // Redondea x e y a enteros y verifica que estén dentro de los límites del arreglo
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && x < width && y >= 0 && y < height) {
      if (!buffer1[x]) {
          buffer1[x] = []; // Asegura que buffer1[x] esté definido
      }
      buffer1[x][y] = strength;
  }
}

function draw() {
    background(0);
    loadPixels();

    if (frameCount % Math.floor(60 / (frequency / 60)) === 0) {
        createWave(width / 2, height / 2, 500 * amplitude);
    }

    for (let i = 1; i < width - 1; i++) {
        for (let j = 1; j < height - 1; j++) {
            buffer2[i][j] = (buffer1[i - 1][j] + buffer1[i + 1][j] + buffer1[i][j - 1] + buffer1[i][j + 1]) / 2 - buffer2[i][j];
            buffer2[i][j] *= DAMPENING;

            if (showWall) {
                let d = distToWall(i, j);
                if (d < 1) buffer2[i][j] *= -1; // Refleja la onda en la pared
            }

            if (!shouldBounce) {
                if (i === 1 || i === width - 2 || j === 1 || j === height - 2) {
                    buffer2[i][j] = 0;
                }
            }

            const index = (i + j * width) * 4;
            let value = constrain(buffer2[i][j] * WAVE_SCALE, 0, 255);
            pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
        }
    }

    updatePixels();

    let temp = buffer1;
    buffer1 = buffer2;
    buffer2 = temp;

    // Dibujar la pared
    if (showWall) {
        stroke(255, 0, 0);
        strokeWeight(2);
        let wallStart = p5.Vector.fromAngle(radians(wallAngle)).mult(width * wallDistance).add(width / 2, height / 2);
        let wallEnd = p5.Vector.fromAngle(radians(wallAngle + 90)).mult(width).add(wallStart);
        line(wallStart.x, wallStart.y, wallEnd.x, wallEnd.y);
        noStroke();
    }

    // Dibujar el emisor de sonido
    fill(255, 0, 0);
    ellipse(width / 2, height / 2, 5, 5);
}

function distToWall(x, y) {
    let v = createVector(x - width / 2, y - height / 2);
    let wallNormal = p5.Vector.fromAngle(radians(wallAngle + 90));
    let distanceToCenter = v.dot(wallNormal);
    return abs(distanceToCenter - width * wallDistance);
}