import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { ui, buildingHelpers, backend, endGame, newGame } from '../common/gamestate.js';
import { gameState } from './state.js';
import { pickTownResource, pickPlayerResources, pickResources, pickBuilding, pickBuildingPlan, pickPlayerBuilding,
         pickNextSpecialBuilding, initUi, showMessage, score } from './interaction.js';
import { initBuildings, buildings_by_number, clientCheat } from '../common/building.js';
import * as net from './net.js';

ui.pickTownResource = pickTownResource;
ui.pickPlayerResources = pickPlayerResources;
ui.pickResources = pickResources;
ui.pickBuilding = pickBuilding;
ui.pickPlayerBuilding = pickPlayerBuilding;
ui.pickNextSpecialBuilding = pickNextSpecialBuilding;
ui.pickBuildingPlan = pickBuildingPlan;
ui.initUi = initUi;
ui.showMessage = (msg, personal) => { if ( ! ui.am_client_to_server || personal) showMessage(msg); };
ui.endGame = score;

buildingHelpers.initBuildings = initBuildings;
buildingHelpers.buildings_by_number = buildings_by_number;

backend.prepare_log = net.prepare_log;
backend.send_log = net.send_log;
backend.abort_log = net.abort_log;

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
    newGame(['Daniel','Nick','Eppilito','Pei-hsin','Ken Horan']);
}

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

export const setupdone = 1;
