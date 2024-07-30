const width = 675;
const height = 675;
const speedOfSound = 343; // m/s
const pixelsPerMeter = 100;

let simulations = [
    { frequency: 440, amplitude: 1, listenerPosition: 0, isPlaying: false, useColor: false, phase: 0 },
    { frequency: 440, amplitude: 1, separation: 1, listenerPosition: 0, isPlaying: false, useColor: false, phase: 0 },
    { frequency: 440, amplitude: 1, wallPosition: 0.25, wallAngle: 0, isPlaying: false, useColor: false, phase: 0, mode: 'continuous', hasPulse: false, pulseX: 0, pulseY: 0, pulsePhase: 0 },
    { frequency: 440, amplitude: 1, isPlaying: false, useColor: false, phase: 0 }
];

let canvases = [], ctxs = [], imageDatas = [];
let audioContext, oscillators = [];
let currentTab = 0;
let stopwatchInterval, stopwatchTime = 0;
let soundSourceIcon, listenerIcon;

function preload() {
    soundSourceIcon = new Image();
    soundSourceIcon.src = 'assets/icons/speaker.svg';
    listenerIcon = new Image();
    listenerIcon.src = 'assets/icons/user.svg';
}



function setup() {
    preload();
    for (let i = 0; i < 4; i++) {  // Aumentado a 4 para incluir el nuevo tab
        let canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        document.getElementById(`canvas-container${i+1}`).appendChild(canvas);
        canvases[i] = canvas;
        ctxs[i] = canvas.getContext('2d');
        imageDatas[i] = ctxs[i].createImageData(width, height);
    }

    setupControls();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Configurar los listeners para los cambios de tab
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const newTab = parseInt(event.target.id.charAt(event.target.id.length - 1)) - 1;
            resetSimulation(currentTab);
            currentTab = newTab;
        });
    });
    // Configurar elementos arrastrables
    setupDraggables();

    // Configurar cronómetro
    setupStopwatch();

    // alignDraggablesToCanvas();
}

function alignDraggablesToCanvas() {
    const canvas = document.querySelector('#canvas-container4 canvas');
    const canvasRect = canvas.getBoundingClientRect();

    const ruler = document.getElementById('ruler');
    const stopwatch = document.getElementById('stopwatch');

    ruler.style.left = `${canvasRect.left}px`;
    ruler.style.top = `${canvasRect.top + canvasRect.height + 10}px`; // 10px de margen

    stopwatch.style.left = `${canvasRect.left + canvasRect.width - stopwatch.offsetWidth}px`;
    stopwatch.style.top = `${canvasRect.top + canvasRect.height + 10}px`; // 10px de margen
}


function setupControls() {
    for (let i = 0; i < 3; i++) {
        document.getElementById(`frequency${i+1}`).addEventListener('input', (e) => {
            simulations[i].frequency = Number(e.target.value);
            document.getElementById(`frequencyValue${i+1}`).textContent = simulations[i].frequency;
            if (oscillators[i]) {
                oscillators[i].frequency.setValueAtTime(simulations[i].frequency, audioContext.currentTime);
            }
        });

        document.getElementById(`amplitude${i+1}`).addEventListener('input', (e) => {
            simulations[i].amplitude = Number(e.target.value);
            document.getElementById(`amplitudeValue${i+1}`).textContent = simulations[i].amplitude;
            if (oscillators[i]) {
                oscillators[i].gain.setValueAtTime(simulations[i].amplitude, audioContext.currentTime);
            }
        });

        if (i === 1) {
            document.getElementById('separation2').addEventListener('input', (e) => {
                simulations[1].separation = Number(e.target.value);
                document.getElementById('separationValue2').textContent = simulations[1].separation;
            });
        }

        if (i < 2) {
            document.getElementById(`listenerPosition${i+1}`).addEventListener('input', (e) => {
                simulations[i].listenerPosition = Number(e.target.value);
                document.getElementById(`listenerPositionValue${i+1}`).textContent = simulations[i].listenerPosition;
            });
        }

        if (i === 2) {
            document.getElementById('wallPosition3').addEventListener('input', (e) => {
                simulations[2].wallPosition = Number(e.target.value);
                document.getElementById('wallPositionValue3').textContent = simulations[2].wallPosition;
            });

            document.getElementById('wallAngle3').addEventListener('input', (e) => {
                simulations[2].wallAngle = Number(e.target.value);
                document.getElementById('wallAngleValue3').textContent = simulations[2].wallAngle;
            });

            document.getElementById('waveMode3').addEventListener('change', (e) => {
                simulations[2].mode = e.target.value;
            });
        }

        document.getElementById('frequency4').addEventListener('input', (e) => {
            simulations[3].frequency = Number(e.target.value);
            document.getElementById('frequencyValue4').textContent = simulations[3].frequency;
        });

        document.getElementById('amplitude4').addEventListener('input', (e) => {
            simulations[3].amplitude = Number(e.target.value);
            document.getElementById('amplitudeValue4').textContent = simulations[3].amplitude;
        });

        document.getElementById(`playPause${i+1}`).addEventListener('click', () => togglePlay(i));
        document.getElementById(`reset${i+1}`).addEventListener('click', () => resetSimulation(i));
        document.getElementById(`toggleColor${i+1}`).addEventListener('click', () => toggleColorMode(i));
        document.getElementById(`playAudio${i+1}`).addEventListener('click', () => toggleAudio(i));
        document.getElementById(`clear${i+1}`).addEventListener('click', () => clearWaves(i));


        document.getElementById('playPause4').addEventListener('click', () => togglePlay(3));
        document.getElementById('reset4').addEventListener('click', () => resetSimulation(3));
        document.getElementById('toggleColor4').addEventListener('click', () => toggleColorMode(3));
    }

    // Evento para el modo de pulso en la simulación de reflexión
    canvases[2].addEventListener('click', (event) => {
        if (simulations[2].mode === 'pulse') {
            const rect = canvases[2].getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            createPulse(2, x, y);
        }
    });
}

function updateWaveBuffer(index) {
    const sim = simulations[index];
    const pixels = imageDatas[index].data;
    const wavelength = speedOfSound / sim.frequency;
    const k = 2 * Math.PI / wavelength;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const pixelIndex = (x + y * width) * 4;
            const xm = x / pixelsPerMeter;
            const ym = y / pixelsPerMeter;

            let amplitude = 0;
            if (index === 0 || index === 3) {
                const d = Math.hypot(xm - width / pixelsPerMeter, ym - height / (2 * pixelsPerMeter));
                amplitude = (Math.sin(k * d - sim.phase) / (1 + d * 0.2)) * sim.amplitude;
            } else if (index === 1) {
                const d1 = Math.hypot(xm - width / pixelsPerMeter, ym - height / (2 * pixelsPerMeter) + sim.separation / 2);
                const d2 = Math.hypot(xm - width / pixelsPerMeter, ym - height / (2 * pixelsPerMeter) - sim.separation / 2);
                amplitude = ((Math.sin(k * d1 - sim.phase) / (1 + d1 * 0.2)) + (Math.sin(k * d2 - sim.phase) / (1 + d2 * 0.2))) / 2 * sim.amplitude;
            } else if (index === 2) {
                if (sim.mode === 'continuous') {
                    const d = Math.hypot(xm - width / pixelsPerMeter, ym - height / (2 * pixelsPerMeter));
                    const wallX = sim.wallPosition * width / pixelsPerMeter;
                    const wallY = height / pixelsPerMeter;
                    const wallAngleRad = sim.wallAngle * Math.PI / 180;
                    const dx = xm - wallX;
                    const dy = ym - wallY;
                    const rotatedX = dx * Math.cos(wallAngleRad) - dy * Math.sin(wallAngleRad);
                    const reflectedD = Math.hypot(2 * rotatedX, dy);
                    amplitude = (Math.sin(k * d - sim.phase) / (1 + d * 0.2) + Math.sin(k * reflectedD - sim.phase) / (1 + reflectedD * 0.2)) * sim.amplitude;
                } else if (sim.mode === 'pulse' && sim.hasPulse) {
                    const d = Math.hypot(x - sim.pulseX, y - sim.pulseY);
                    const wallX = sim.wallPosition * width;
                    const wallY = height;
                    const wallAngleRad = sim.wallAngle * Math.PI / 180;
                    const dx = x - wallX;
                    const dy = y - wallY;
                    const rotatedX = dx * Math.cos(wallAngleRad) - dy * Math.sin(wallAngleRad);
                    const reflectedD = Math.hypot(2 * rotatedX, dy);

                    const pulseWidth = 10;
                    const directPulse = Math.exp(-Math.pow(d - sim.pulsePhase * speedOfSound / 60, 2) / (2 * Math.pow(pulseWidth, 2)));
                    const reflectedPulse = Math.exp(-Math.pow(reflectedD - sim.pulsePhase * speedOfSound / 60, 2) / (2 * Math.pow(pulseWidth, 2)));

                    amplitude = (directPulse + reflectedPulse) * sim.amplitude;
                }
            }

            let value;
            if (sim.useColor) {
                const hue = (amplitude + 1) * 180;
                const [r, g, b] = hslToRgb(hue / 360, 1, 0.5);
                pixels[pixelIndex] = r;
                pixels[pixelIndex + 1] = g;
                pixels[pixelIndex + 2] = b;
            } else {
                value = (amplitude + 1) * 127.5;
                pixels[pixelIndex] = value;
                pixels[pixelIndex + 1] = value;
                pixels[pixelIndex + 2] = value;
            }
            pixels[pixelIndex + 3] = 255;
        }
    }

    ctxs[index].putImageData(imageDatas[index], 0, 0);
}


function draw() {
    for (let i = 0; i < 4; i++) {
        if (simulations[i].isPlaying && (i !== 2 || simulations[i].mode === 'continuous')) {
            simulations[i].phase += 0.1;
            simulations[i].phase %= 2 * Math.PI;
        }

        if (i === 2 && simulations[i].mode === 'pulse' && simulations[i].hasPulse) {
            simulations[i].pulsePhase += 1;
            if (simulations[i].pulsePhase > 60) {
                simulations[i].hasPulse = false;
            }
        }

        updateWaveBuffer(i);

        const iconSize = 60;
        const halfIconSize = iconSize / 2;

        // Dibujar la(s) fuente(s) de sonido
        ctxs[i].fillStyle = 'red';
        ctxs[i].beginPath();
        if (i === 1) {
            const y1 = height / 2 - simulations[i].separation * pixelsPerMeter / 2;
            const y2 = height / 2 + simulations[i].separation * pixelsPerMeter / 2;
            ctxs[i].arc(width - 15, y1, 5, 0, 2 * Math.PI);
            ctxs[i].arc(width - 15, y2, 5, 0, 2 * Math.PI);
            ctxs[i].fill();

            // Dibujar los iconos de la fuente de sonido
            ctxs[i].drawImage(soundSourceIcon, width - 15 - halfIconSize, y1 - halfIconSize, iconSize, iconSize);
            ctxs[i].drawImage(soundSourceIcon, width - 15 - halfIconSize, y2 - halfIconSize, iconSize, iconSize);
        } else {
            ctxs[i].arc(width - 15, height / 2, 5, 0, 2 * Math.PI);
            ctxs[i].fill();

            // Dibujar el icono de la fuente de sonido
            ctxs[i].drawImage(soundSourceIcon, width - 15 - halfIconSize, height / 2 - halfIconSize, iconSize, iconSize);
        }

        if (i < 2) {
            // Dibujar el escucha
            const listenerX = 10 + simulations[i].listenerPosition * (width - 20);
            ctxs[i].fillStyle = 'blue';
            ctxs[i].beginPath();
            ctxs[i].arc(listenerX, height / 2, 5, 0, 2 * Math.PI);
            ctxs[i].fill();

            // Dibujar el icono del escucha
            ctxs[i].drawImage(listenerIcon, listenerX - halfIconSize, height / 2 - halfIconSize, iconSize, iconSize);
        }

        if (i === 2) {
            // Dibujar la pared
            const wallX = simulations[i].wallPosition * width;
            const wallY = height;
            const wallLength = 200;
            const wallAngleRad = simulations[i].wallAngle * Math.PI / 180;

            ctxs[i].strokeStyle = 'white';
            ctxs[i].lineWidth = 3;
            ctxs[i].beginPath();
            ctxs[i].moveTo(wallX, wallY);
            ctxs[i].lineTo(wallX + wallLength * Math.sin(wallAngleRad), wallY - wallLength * Math.cos(wallAngleRad));
            ctxs[i].stroke();
        }

        // Actualizar la regla en el tab de medición
        if (i === 3) {
            const ruler = document.getElementById('ruler');
            const rulerWidth = ruler.offsetWidth;
            const rulerMeters = rulerWidth / pixelsPerMeter;
            document.querySelector('.ruler-label').textContent = `${rulerMeters.toFixed(2)} m`;
        }
    }

    requestAnimationFrame(draw);
}

function togglePlay(index) {
    simulations[index].isPlaying = !simulations[index].isPlaying;
    document.getElementById(`playPause${index+1}`).innerHTML = simulations[index].isPlaying ? '<i class="fas fa-pause"></i> Pausar' : '<i class="fas fa-play"></i> Iniciar';
}

function resetSimulation(index) {
    if (index === 0 || index === 2 || index === 3) {
        simulations[index] = { frequency: 440, amplitude: 1, isPlaying: false, useColor: false, phase: 0 };
        if (index === 2) {
            simulations[index].wallPosition = 0.25;
            simulations[index].wallAngle = 0;
            simulations[index].mode = 'continuous';
            simulations[index].hasPulse = false;
        }
    } else if (index === 1) {
        simulations[index] = { frequency: 440, amplitude: 1, separation: 1, listenerPosition: 0, isPlaying: false, useColor: false, phase: 0 };
    }
    updateControls(index);
    if (oscillators[index]) {
        oscillators[index].stop();
        oscillators[index].disconnect();
        oscillators[index] = null;
        document.getElementById(`playAudio${index+1}`).innerHTML = '<i class="fas fa-volume-up"></i> Reproducir Audio';
    }
    clearWaves(index);
}

function updateControls(index) {
    if (simulations[index]) {
        const frequencyInput = document.getElementById(`frequency${index+1}`);
        const frequencyValue = document.getElementById(`frequencyValue${index+1}`);
        const amplitudeInput = document.getElementById(`amplitude${index+1}`);
        const amplitudeValue = document.getElementById(`amplitudeValue${index+1}`);

        if (frequencyInput) frequencyInput.value = simulations[index].frequency || 440;
        if (frequencyValue) frequencyValue.textContent = simulations[index].frequency || 440;
        if (amplitudeInput) amplitudeInput.value = simulations[index].amplitude || 1;
        if (amplitudeValue) amplitudeValue.textContent = simulations[index].amplitude || 1;

        if (index === 1) {
            const separationInput = document.getElementById('separation2');
            const separationValue = document.getElementById('separationValue2');
            if (separationInput) separationInput.value = simulations[index].separation || 1;
            if (separationValue) separationValue.textContent = simulations[index].separation || 1;
        }
        if (index < 2) {
            const listenerPositionInput = document.getElementById(`listenerPosition${index+1}`);
            const listenerPositionValue = document.getElementById(`listenerPositionValue${index+1}`);
            if (listenerPositionInput) listenerPositionInput.value = simulations[index].listenerPosition || 0;
            if (listenerPositionValue) listenerPositionValue.textContent = simulations[index].listenerPosition || 0;
        }
        if (index === 2) {
            const wallPositionInput = document.getElementById('wallPosition3');
            const wallPositionValue = document.getElementById('wallPositionValue3');
            const wallAngleInput = document.getElementById('wallAngle3');
            const wallAngleValue = document.getElementById('wallAngleValue3');
            const waveModeSelect = document.getElementById('waveMode3');

            if (wallPositionInput) wallPositionInput.value = simulations[index].wallPosition || 0.25;
            if (wallPositionValue) wallPositionValue.textContent = simulations[index].wallPosition || 0.25;
            if (wallAngleInput) wallAngleInput.value = simulations[index].wallAngle || 0;
            if (wallAngleValue) wallAngleValue.textContent = simulations[index].wallAngle || 0;
            if (waveModeSelect) waveModeSelect.value = simulations[index].mode || 'continuous';
        }
    }

    const playPauseButton = document.getElementById(`playPause${index+1}`);
    const toggleColorButton = document.getElementById(`toggleColor${index+1}`);

    if (playPauseButton) playPauseButton.innerHTML = '<i class="fas fa-play"></i> Iniciar';
    if (toggleColorButton) toggleColorButton.innerHTML = '<i class="fas fa-palette"></i> Cambiar a Color';
}

function toggleColorMode(index) {
    simulations[index].useColor = !simulations[index].useColor;
    document.getElementById(`toggleColor${index+1}`).innerHTML = simulations[index].useColor ?
        '<i class="fas fa-palette"></i> Cambiar a Escala de Grises' :
        '<i class="fas fa-palette"></i> Cambiar a Color';
}

function setupDraggables() {
    const draggables = document.querySelectorAll('.draggable');
    draggables.forEach(draggable => {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        draggable.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(window.getComputedStyle(draggable).left, 10);
            startTop = parseInt(window.getComputedStyle(draggable).top, 10);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            draggable.style.left = `${startLeft + dx}px`;
            draggable.style.top = `${startTop + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    });

    // Function to align draggables to the right of the control panel
    function alignDraggables() {
        const controlPanel = document.querySelector('.control-panel');
        const controlPanelRect = controlPanel.getBoundingClientRect();

        const ruler = document.getElementById('ruler');
        const stopwatch = document.getElementById('stopwatch');

        ruler.style.left = `${controlPanelRect.right + 30}px`; // 10px margin to the right of the control panel
        ruler.style.top = `${controlPanelRect.top}px`;

        stopwatch.style.left = `${controlPanelRect.right + 30}px`; // 10px margin to the right of the control panel
        stopwatch.style.top = `${controlPanelRect.top + ruler.offsetHeight + 60}px`; // 10px margin below the ruler
    }

    // Align draggables on window resize
    window.addEventListener('resize', alignDraggables);

    // Align draggables initially
    alignDraggables();
}




function setupStopwatch() {
    const startStopBtn = document.getElementById('startStopwatch');
    const resetBtn = document.getElementById('resetStopwatch');
    const display = document.querySelector('.stopwatch-display');

    startStopBtn.addEventListener('click', () => {
        if (stopwatchInterval) {
            clearInterval(stopwatchInterval);
            stopwatchInterval = null;
            startStopBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            const startTime = Date.now() - stopwatchTime;
            stopwatchInterval = setInterval(() => {
                stopwatchTime = Date.now() - startTime;
                display.textContent = formatTime(stopwatchTime);
            }, 10);
            startStopBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    });

    resetBtn.addEventListener('click', () => {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        stopwatchTime = 0;
        display.textContent = '00:000';
        startStopBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
}
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
}


function toggleAudio(index) {
    if (oscillators[index]) {
        oscillators[index].stop();
        oscillators[index].disconnect();
        oscillators[index] = null;
        const playAudioButton = document.getElementById(`playAudio${index+1}`);
        if (playAudioButton) playAudioButton.innerHTML = '<i class="fas fa-volume-up"></i> Reproducir Audio';
    } else {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = 'sine';

        let frequency = 440; // valor por defecto
        if (simulations[index] && typeof simulations[index].frequency === 'number' && isFinite(simulations[index].frequency)) {
            frequency = simulations[index].frequency;
        }
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

        let amplitude = 1; // valor por defecto
        if (simulations[index] && typeof simulations[index].amplitude === 'number' && isFinite(simulations[index].amplitude)) {
            amplitude = simulations[index].amplitude;
        }

        if (index < 2) {
            const listenerPosition = simulations[index] && typeof simulations[index].listenerPosition === 'number' ? simulations[index].listenerPosition : 0;
            const distance = 1 - listenerPosition;
            const gain = 1 / (1 + distance * 5);
            gainNode.gain.setValueAtTime(gain * amplitude, audioContext.currentTime);
        } else {
            gainNode.gain.setValueAtTime(amplitude, audioContext.currentTime);
        }

        oscillator.connect(gainNode).connect(audioContext.destination);
        oscillator.start();
        oscillators[index] = oscillator;
        const playAudioButton = document.getElementById(`playAudio${index+1}`);
        if (playAudioButton) playAudioButton.innerHTML = '<i class="fas fa-volume-mute"></i> Detener Audio';
    }
}

function clearWaves(index) {
    simulations[index].phase = 0;
    if (index === 2) {
        simulations[index].hasPulse = false;
    }
    updateWaveBuffer(index);
}

function createPulse(index, x, y) {
    const sim = simulations[index];
    sim.pulseX = x;
    sim.pulseY = y;
    sim.pulsePhase = 0;
    sim.hasPulse = true;
}

function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setup();
    draw();
});