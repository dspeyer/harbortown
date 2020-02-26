import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { gameState, endGame, newGame } from './gamestate.js';
import { pickTownResource, pickPlayerResources, pickResources, pickBuilding, pickBuildingPlan, pickPlayerBuilding } from './interaction.js';
import { initBuildings } from './building.js';

gameState.pickTownResource = pickTownResource;
gameState.pickPlayerResources = pickPlayerResources;
gameState.pickResources = pickResources;
gameState.pickBuilding = pickBuilding;
gameState.pickPlayerBuilding = pickPlayerBuilding;
gameState.pickBuildingPlan = pickBuildingPlan;
gameState.initBuildings = initBuildings;

newGame(4);

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
