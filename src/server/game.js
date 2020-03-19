import { log_event } from './dbg.js';
import * as gs from '../common/gamestate.js';
import { initBuildings, buildings_by_number } from '../common/building.js';

let sockets = [];

async function replay_event(e) {
    let input = 1;
    const player = gs.gameState.players[gs.gameState.currentPlayer];
    const rawget = () => { return e[input++]; };
    const bget = () => { return buildings_by_number[e[input++]]; };
    gs.ui.pickTownResource =
        gs.ui.pickResources =
        rawget;
    gs.ui.pickBuilding =
        gs.ui.pickPlayerBuilding =
        gs.ui.pickBuildingPlan =
        bget;
    gs.ui.pickPlayerResources = () => {
        let r = rawget();
        gs.subtractResources(player, r);
        return r;
    };

    const callback = gs[e[0]];
    await callback();
}


export function game_socket_open(ws,req) {
    sockets.push(ws);
    ws.on('message', async (msg) => {
        const pmsg = JSON.parse(msg);
        const backup = gs.safeCopy(gs.gameState);
        for (let e of pmsg) {
            log_event(e);
            try {
                await replay_event(e);
            } catch (e) {
                log_event(['ERROR',e]);
                ws.send(JSON.stringify({newGameState:backup,error:e}));
                gs.restore(gs.gameState, gs.backup);
                return;
            }
        }
        for (let s of sockets) {
            try {
                s.send(JSON.stringify({newGameState:gs.gameState}));
            }catch (e) {
                console.log(e);
            }
        }
    });
}

export function init_game() {
    gs.ui.initUi = ()=>{};
    gs.buildingHelpers.initBuildings = initBuildings;
    gs.buildingHelpers.buildings_by_number = buildings_by_number;
    gs.newGame(4);
}
