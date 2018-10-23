import { createJoyMap, createStreamModule } from '../../src/index';

document.getElementById('app').innerHTML = `
    <article class="examples-container">
        <header>
            <h1 className="title">JoyMap video fun times example using the stream module</h1>
        </header>
        <canvas class="photo"></canvas>
        <video class="player"></video>
    </article>`;

const joyMap = createJoyMap();
const module = createStreamModule({ padId: joyMap.getUnusedPadId() });
joyMap.addModule(module);
joyMap.start();

const video = document.querySelector('.player');
const canvas = document.querySelector('.photo');
const ctx = canvas.getContext('2d');

async function startVideo() {
    const localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

    try {
        video.srcObject = localMediaStream;
    } catch (error) {
        video.src = window.URL.createObjectURL(localMediaStream);
    }

    video.play();
}

function rgbSplit(pixels, rate) {
    if (!rate) {
        return pixels;
    }
    if (rate > 0) {
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i + (4 * rate) + 1] = pixels.data[i];
            pixels.data[(i - (4 * rate)) + 2] = pixels.data[i + 2];
        }
    } else {
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[(i + (-4 * rate)) + 2] = pixels.data[i + 0];
            pixels.data[(i - (-4 * rate)) + 1] = pixels.data[i + 1];
        }
    }

    return pixels;
}

function drawPlaceholder() {
    ctx.fillStyle = '#EEE';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = 'normal bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
        'Please connect a gamepad & play with the left analog stick',
        canvas.width * 0.5,
        canvas.height * 0.25
    );
}

function setup() {
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    drawPlaceholder();

    /* setInterval(() => {
        ctx.drawImage(video, 0, 0, width, height);
        ctx.globalAlpha = 0.1;
        ctx.putImageData(
            ctx.getImageData(0, 0, width, height),
            0,
            0
        );
    }, 16); */

    module.getStickStream('L').subscribe(state => {
        ctx.drawImage(video, 0, 0, width, height);
        ctx.putImageData(
            rgbSplit(
                ctx.getImageData(0, 0, width, height),
                Math.round(state.value[0] * 100)
            ),
            0,
            0
        );
    });
}

startVideo();
video.addEventListener('canplay', setup);
