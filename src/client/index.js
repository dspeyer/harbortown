import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { newGame } from '../common/actions.js';
import { restore } from '../common/utils.js';
import { gameState } from './state.js';
import { ui, initUi } from './interaction.js';
import { initBuildings, clientCheat } from '../common/building.js';
import * as net from './net.js';

clientCheat.game = gameState;

if (document.cookie) {
    for (let crumb of document.cookie.split(';')) {
        let words = crumb.split('=');
        if (words.length==2 && words[0]=='name') {
            gameState.whoami = unescape(words[1]);
        }
    }
}

initUi(5);
if (window.location.search) {
    net.init();
} else {
    gameState.whoami = false;
    restore(gameState,
            newGame(['Daniel','Nick','Eppilito','Pei-hsin','Ken Horan'],
                    initBuildings));
}

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

export const setupdone = 1;
