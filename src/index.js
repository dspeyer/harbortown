import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { gameState, ui, buildingHelpers, endGame, newGame } from './gamestate.js';
import { pickTownResource, pickPlayerResources, pickResources, pickBuilding, pickBuildingPlan, pickPlayerBuilding, initUi, showError } from './interaction.js';
import { initBuildings, buildings_by_number } from './building.js';

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

newGame(4);

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
