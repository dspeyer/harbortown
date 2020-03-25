import { log_event } from './dbg.js';
import * as gs from '../common/gamestate.js';
import { initBuildings, buildings_by_number } from '../common/building.js';
import { games } from './gamelist.js';

let sockets_by_id = {};


async function replay_event(e, game, playfrom) {
    let input = 1;
    gs.restore(gs.gameState, game);
    const player = gs.gameState.players.filter((p)=>{return p.name==playfrom;})[0];
    const currentPlayer = gs.gameState.players[gs.gameState.currentPlayer];
    console.log('Replaying ',e)
    if (e[0]!='completeFeed' && player !== currentPlayer) {
        throw "It's not your turn (you're ["+playfrom+"] but it's ["+currentPlayer.name+"]'s turn)";
    }
    const rawget = () => { return e[input++]; };
    const bget = () => { return buildings_by_number[e[input++]]; };
    gs.ui.pickTownResource =
        gs.ui.pickResources =
        rawget;
    gs.ui.pickBuilding =
        gs.ui.pickPlayerBuilding =
        gs.ui.pickBuildingPlan =
        gs.ui.pickNextSpecialBuilding =
        bget;
    if (e[0]=='nextTurn' || e[0]=='completeFeed') {
        gs.ui.pickPlayerResources = async (player, filter, msg, feeding) => {
            console.log(' PPR in fooddemand for '+JSON.stringify(player));
            for (let s of sockets_by_id[game.id]) {
                if (s.readyState==3) { //TODO: named constant
                    console.log('  skipping closed socket for '+s.name);
                    continue;
                }
                if (s.name == player.name) {
                    console.log('  sending fooddemand to '+player.name);
                    s.send(JSON.stringify({foodDemand:msg, newGameState: gs.gameState}));
                } else {
                    console.log('  Skipping socket for '+s.name);
                }
            }
            return null;
        };
    } else {
        gs.ui.pickPlayerResources = (player, filter, msg, feeding) => {
            let r = rawget();
            gs.subtractResources(player, r);
            return r;
        }
    };

    let callback = gs[e[0]];
    if (e[0]=='completeFeed'){
        callback = callback.bind(null, player, e[1]);
        gs.subtractResources(player, e[1]);
    }
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
                if (s.readyState != 3) { // CLOSED -- TODO: find the named constant
                    s.send(JSON.stringify({newGameState:game}));
                }
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

gs.ui.endGame = function() {
    gs.gameState.ended = Date.now();
}
