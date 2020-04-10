import React from 'react';
import ReactDOM from 'react-dom';
import './main.css';
import App from './App.js';
import * as serviceWorker from './serviceWorker';
import { newGame } from '../common/actions.js';
import { restore } from '../common/utils.js';
import { gameState } from './state.js';
import { initUi } from './interaction.js';
import { initBuildings, clientCheat } from '../common/buildings.js';
import * as net from './net.js';
import { initDialogs } from './dialogs.js';

clientCheat.game = gameState;

initUi(5);
initDialogs();
if (window.location.search) {
    net.init();
} else {
    restore(gameState,
            newGame(['Daniel','Nick','Eppilito','Pei-hsin','Ken Horan'],
                    initBuildings));
    for (let p of gameState.players) p.isMe = true;
    gameState.desc = 'Client-only game';
}

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

