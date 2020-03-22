import { log_event } from './dbg.js';
import * as gs from '../common/gamestate.js';
import { initBuildings, buildings_by_number } from '../common/building.js';
import { games } from './gamelist.js';

let sockets_by_id = {};


async function replay_event(e, game, playfrom) {
    let input = 1;
    gs.restore(gs.gameState, game);
    const player = gs.gameState.players[gs.gameState.currentPlayer];
    if (player.name != playfrom) throw "It's not your turn (you're ["+playfrom+"] but it's ["+player.name+"]'s turn)";
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
    gs.restore(game, gs.gameState);
}

function set_id(id, ws) {
    ws.gameid = id;
    const game = games[id];
    if ( ! (id in sockets_by_id) ) sockets_by_id[id] = [];
    sockets_by_id[id].push(ws);
    ws.send(JSON.stringify({newGameState:game}));
}

export function game_socket_open(ws,req) {
    ws.name = req.cookies.name;
    console.log('socket',ws.name,req.path);
    ws.on('message', async (msg) => {
        const pmsg = JSON.parse(msg);
        const backup = gs.safeCopy(gs.gameState);
        const game = games[ws.gameid];
        for (let e of pmsg) {
            log_event(e);
            try {
                if (e[0]=='set_id') {
                    set_id(e[1], ws);
                    return;
                } else {
                    await replay_event(e, game, ws.name);
                }
            } catch (e) {
                log_event(['ERROR',e]);
                ws.send(JSON.stringify({newGameState:backup,error:e}));
                gs.restore(gs.gameState, gs.backup);
                return;
            }
        }
        for (let s of sockets_by_id[game.id]) {
            try {
                s.send(JSON.stringify({newGameState:game}));
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
}
