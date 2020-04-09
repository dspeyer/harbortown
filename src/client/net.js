import React from 'react';
import { restore, safeCopy } from '../common/utils.js';
import { resources } from '../common/data.js';
import { showMessage, showError, clearMessages, pickPlayerResources, ui, score } from './interaction.js';
import { gameState } from './state.js';

let log = [];
let socket;

export function init() {
    let hn = window.location.hostname;
    let port = window.location.port;
    let id = window.location.search.substr(1);
    showMessage("Trying to connect...", /*lasting=*/ true);
    socket = new WebSocket('ws://'+hn+':'+port+'/socket');
    socket.addEventListener('message', (raw) => {
        const msg = JSON.parse(raw.data);
        if (msg.newGameState) {
            restore(gameState, msg.newGameState);
            if (gameState.ended) score();
            ui.update();
        }
        if (msg.msg) {
            showMessage(msg.msg);
        }
        if (msg.init && ! msg.foodDemand) {
            const p = gameState.players.filter((p)=> p.isMe)[0];
            if (p.hunger > 0) msg.foodDemand = "It's feeding time: eat "+p.hunger;
        }
        if (msg.foodDemand) {
            const p = gameState.players.filter((p)=> p.isMe)[0];
            pickPlayerResources(p, (r)=> resources[r].food>0, msg.foodDemand).
                then((food)=>{
                    socket.send(JSON.stringify([['completeFeed',food]]))});
        }
    });
    socket.addEventListener('open', () => {
        socket.send(JSON.stringify([['set_id',id]]));
        ui.am_client_to_server = true;
        clearMessages();
        ui.prepnet = null;
    });
    socket.addEventListener('close', () => {
        showError(<span>Lost contact with server <input type="button" value="reconnect" onClick={init} /></span>, /*lasting=*/ true);
        ui.prepnet = init;
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
        console.log('Sending', log);
        socket.send(JSON.stringify(log));
    } else {
        console.log('Unable to send', log);
    }
    log = [];
}

export function abort_log() {
    log.pop();
}

export function clear_log() {
    log = [];
}
