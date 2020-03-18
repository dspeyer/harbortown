import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { gameState, ui, buildingHelpers, backend, endGame, newGame } from './gamestate.js';
import { pickTownResource, pickPlayerResources, pickResources, pickBuilding, pickBuildingPlan, pickPlayerBuilding, initUi, showError } from './interaction.js';
import { initBuildings, buildings_by_number } from './building.js';
import { init, prepare_log, abort_log, send_log } from './net.js';

init(); // net

ui.pickTownResource = pickTownResource;
ui.pickPlayerResources = pickPlayerResources;
ui.pickResources = pickResources;
ui.pickBuilding = pickBuilding;
ui.pickPlayerBuilding = pickPlayerBuilding;
ui.pickBuildingPlan = pickBuildingPlan;
ui.initUi = initUi;
ui.showError = showError;

buildingHelpers.initBuildings = initBuildings;
buildingHelpers.buildings_by_number = buildings_by_number;

backend.prepare_log = prepare_log;
backend.send_log = send_log;
backend.abort_log = abort_log;

newGame(4);

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
