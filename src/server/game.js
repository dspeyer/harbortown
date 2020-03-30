import { log_event } from './dbg.js';
import * as gs from '../common/gamestate.js';
import { initBuildings, buildings_by_number } from '../common/building.js';
import { colls } from './gamelist.js';

let sockets_by_id = {};

let broadcastMessages = [];

async function demandPlayerResources(game, player, filter, msg, feeding) {
    console.log(' PPR in fooddemand for '+JSON.stringify(player));
    for (let s of sockets_by_id[game.id]) {
        if (s.readyState==3) { //TODO: named constant
            console.log('  skipping closed socket for '+s.name);
            continue;
        }
        if (s.name == player.name) {
            console.log('  sending fooddemand to '+player.name);
            s.send(JSON.stringify({foodDemand:msg, newGameState: game}));
        } else {
            console.log('  Skipping socket for '+s.name);
        }
    }
    return null;
};


async function replay_event(e, game, playfrom) {
    console.log('Replaying ',e)
    let input = 1;

    const player = game.players.filter((p)=>(p.name==playfrom))[0];
    const currentPlayer = game.players[game.currentPlayer];
    if (e[0]!='completeFeed' && player !== currentPlayer) {
        throw "It's not your turn (you're ["+playfrom+"] but it's ["+currentPlayer.name+"]'s turn)";
    }
    
    const rawget = () => { return e[input++]; };
    const bget = () => buildings_by_number[rawget()];
    gs.ui.pickTownResource =
        gs.ui.pickResources =
        gs.ui.pickBuildingPlan =
        rawget;
    gs.ui.pickBuilding =
        gs.ui.pickPlayerBuilding =
        gs.ui.pickNextSpecialBuilding =
        bget;
    gs.ui.pickPlayerResources = (player, filter, msg, feeding) => {
        let r = rawget();
        gs.subtractResources(player, r);
        return r;
    }
    if (e[0]=='nextTurn' || e[0]=='completeFeed') {
        gs.ui.serverPickResources = gs.ui.pickPlayerResources;
        gs.ui.pickPlayerResources = demandPlayerResources.bind(null,game);
    };
    gs.ui.showMessage = ((msg, personal) => { if (!personal) broadcastMessages.push(msg);});
    
    let callback = gs[e[0]];
    await callback(player, game);
}

function set_id(id, ws) {
    ws.gameid = id;
    if ( ! (id in sockets_by_id) ) sockets_by_id[id] = [];
    sockets_by_id[id].push(ws);
    colls.games.findOne({id}).then((game)=>{
        ws.send(JSON.stringify({newGameState:game,init:true}))
    });
}

export function game_socket_open(ws,req) {
    ws.name = req.cookies.name;
    console.log('socket',ws.name,req.path);
    ws.on('message', async (msg) => {
        broadcastMessages = [];
        const pmsg = JSON.parse(msg);
        let game = await colls.games.findOne({id:ws.gameid});
        if (game) delete game._id;
        const backup = gs.safeCopy(game);
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
                ws.send(JSON.stringify({newGameState:backup,msg:'ERROR '+e}));
                return;
            }
        }
        await colls.games.updateOne({id:ws.gameid},{$set:game});
        for (let s of sockets_by_id[game.id]) {
            try {
                if (s.readyState != 3) { // CLOSED -- TODO: find the named constant
                    s.send(JSON.stringify({newGameState:game, msg:broadcastMessages.join('\n\n')}));
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

gs.ui.endGame = function(game) {
    game.ended = Date.now();
}
