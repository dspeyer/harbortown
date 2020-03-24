import { gameState, restore, ui, safeCopy } from '../common/gamestate.js';
import { resources } from '../common/data.js';
import { showError, pickPlayerResources } from './interaction.js';


let log = [];
let socket;

export function init() {
    let hn = window.location.hostname;
    let port = window.location.port;
    let id = window.location.search.substr(1);
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
        if (msg.foodDemand) {
            const p = gameState.players.filter((p)=>{return p.name==gameState.whoami;})[0];
            pickPlayerResources(p, (r)=>{return resources[r].food>0;}, msg.foodDemand).
                then((food)=>{
                    socket.send(JSON.stringify([['completeFeed',food]]))});
        }
    });
    socket.addEventListener('open', () => {
        socket.send(JSON.stringify([['set_id',id]]));
        ui.am_client_to_server = true;
    });
}

export function prepare_log(txt) {
    log.push([txt]);
}

export function annotate_log(obj) {
    if (log.length) {
        log[log.length-1].push(safeCopy(obj));
    } // TODO: else
}

export function send_log() {
    if (socket && socket.readyState == WebSocket.OPEN) {
        console.log(log);
        socket.send(JSON.stringify(log));
    } else {
        console.log('Unable to send', log);
    }
    log = [];
}

export function abort_log() {
    log.pop();
}
