import { gameState, restore, ui } from './gamestate.js';
import { showError } from './interaction.js';

let log = [];
let socket;

export function init() {
    let hn = window.location.hostname;
    let port = window.location.port;
    socket = new WebSocket('ws://'+hn+':'+port+'/socket');
    socket.addEventListener('message', (raw) => {
        console.log('got message: '+raw.data)
        const msg = JSON.parse(raw.data);
        if (msg.newGameState) {
            restore(gameState, msg.newGameState);
            ui.update();
        }
        if (msg.error) {
            showError("Server Error: "+msg.error);
        }
    });
    send_log();
}

export function prepare_log(txt) {
    log.push([txt]);
}

export function annotate_log(obj) {
    log[log.length-1].push(obj);
}

export function send_log() {
    if (socket.readyState == WebSocket.OPEN) {
        console.log(log);
        socket.send(JSON.stringify(log));
    }
    log = [];
}

export function abort_log() {
    log.pop();
}
