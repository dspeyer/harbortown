import { log_event } from './dbg.js';
import * as actions from '../common/actions.js';
import { initBuildings } from '../common/buildings.js';
import { subtractResources, safeCopy, buildings_by_number } from '../common/utils.js';
import { player_colors } from '../common/data.js';
import { colls } from './gamelist.js';
import { sendLoginLink } from './login.js';

let sockets_by_id = {};

let broadcastMessages = [];

function clean(game, email) {
    let out = safeCopy(game);
    for (let p of out.players) {
        if (p.email == email) {
            p.isMe = true;
        }
        delete p.email;
    }
    let colorCnt = Object.assign(...player_colors.map(x =>({[x]:0})));
    for (let p of out.players) {
        colorCnt[p.color] += 1;
    }
    for (let p of out.players) {
        if (p.isMe) continue;
        if (colorCnt[p.color] == 1) continue;
        for (let c of player_colors) {
            if (colorCnt[c]==0) {
                colorCnt[p.color] -= 1;
                p.color = c;
                colorCnt[c] += 1;
                break;
            }
        }
    }
    out.specialBuildings = out.specialBuildings.slice(0,2);
    return out;
}

async function demandPlayerResources(game, player, filter, msg, feeding) {
    console.log(' PPR in fooddemand for '+JSON.stringify(player));
    for (let s of sockets_by_id[game.id]) {
        if (s.readyState==3) { //TODO: named constant
            console.log('  skipping closed socket for '+s.name);
            continue;
        }
        if (s.email == player.email) {
            console.log('  sending fooddemand to '+player.name);
            s.send(JSON.stringify({foodDemand:msg, newGameState: clean(game,player.email)}));
        } else {
            console.log('  Skipping socket for '+s.name);
        }
    }
    if (player != game.players[game.currentPlayer]) {
        const person = await colls.people.findOne({email:player.email});
        if (person.turnemails && person.validated) {
            sendLoginLink('Your turn',
                          "Pick your end-of-round food in game #"+game.id+" ("+game.desc+")",
                          person.email,
                          '/game/?id='+game.id);
        }
    }
    return null;
};

async function announceGameEnd(game) {
    for (let p of game.players) {
        let email = p.email;
        let person = await colls.people.findOne({email:player.email});
        if (person.turnemails && person.validated) {
            sendLoginLink('Game Over',
                          "Game #"+game.id+" ("+game.desc+") has finished",
                          person.email,
                          '/game/?id='+game.id);
        }
    }
}
            


async function replay_event(e, game, playfrom) {
    console.log('Replaying ',e)
    let input = 1;

    const player = game.players.filter((p)=>(p.email==playfrom))[0];
    const currentPlayer = game.players[game.currentPlayer];
    if (e[0]!='completeFeed' && player !== currentPlayer) {
        throw "It's not your turn (you're ["+playfrom+"] but it's ["+currentPlayer.name+"]'s turn)";
    }
    
    const rawget = () => { return e[input++]; };
    const bget = () => buildings_by_number[rawget()];
    const logged = (cb,fmt) => (()=>{ let o=cb(); game.log.push(fmt(o)); return o; });
    let ui = {
        pickTownResource: logged(rawget, (x)=>x),
        pickResources: logged(rawget, (x)=>'Choose '+Object.keys(x).join(', ')),
        pickBuildingPlan: rawget,
        pickNextSpecialBuilding: rawget,
        pickBuilding: logged(bget, (x)=>x.name),
        pickPlayerBuilding: logged(bget, (x)=>x.name),
        pickPlayerResources: (p,_,msg) => { let r = rawget();
                                            subtractResources(p, r);
                                            if (e[0]!='completeFeed') game.log.push(((msg && msg.indexOf('entry')!=-1)?'Entry: ':'Sent: ') +
                                                                                    JSON.stringify(r) );
                                            return r; },
        showMessage: (msg, personal) => { if (!personal) broadcastMessages.push(msg);},
        initUi: ()=>{},
        update: ()=>{},
        endGame: (game) => { game.ended = Date.now(); announceGameEnd(game); }
    }
    if (e[0]=='nextTurn' || e[0]=='completeFeed') {
        ui.serverPickResources = ui.pickPlayerResources;
        ui.pickPlayerResources = demandPlayerResources.bind(null,game);
    } else {
        game.log.push([2,e[0]]);
    }
    
    let callback = actions[e[0]];
    await callback(player, game, ui);
}

function set_id(id, ws) {
    ws.gameid = id;
    if ( ! (id in sockets_by_id) ) sockets_by_id[id] = [];
    sockets_by_id[id].push(ws);
    colls.games.findOne({id}).then((game)=>{
        ws.send(JSON.stringify({newGameState:clean(game,ws.email),init:true}))
    });
}

export function game_socket_open(ws,req) {
    ws.name = req.cookies.name;
    ws.email = req.cookies.email;
    console.log('socket',ws.name,req.path);
    ws.on('message', async (msg) => {
        if (msg=='keepalive') return;
        broadcastMessages = [];
        const pmsg = JSON.parse(msg);
        let game = await colls.games.findOne({id:ws.gameid});
        if (game) delete game._id;
        const backup = safeCopy(game);
        for (let e of pmsg) {
            log_event(e);
            try {
                if (e[0]=='set_id') {
                    set_id(e[1], ws);
                    return;
                } else {
                    await replay_event(e, game, ws.email);
                }
            } catch (e) {
                log_event(['ERROR',e]);
                ws.send(JSON.stringify({newGameState:clean(backup,ws.email),msg:'ERROR '+e}));
                return;
            }
        }
        await colls.games.updateOne({id:ws.gameid},{$set:game});
        if (game.currentPlayer != backup.currentPlayer && game.currentPlayer != -1) {
            const email = game.players[game.currentPlayer].email;
            const person = await colls.people.findOne({email});
            if (person.turnemails && person.validated) {
                sendLoginLink('Your turn', "It's your turn in game #"+game.id+" ("+game.desc+")", email, '/game/?id='+game.id)
            }
        }
        for (let s of sockets_by_id[game.id]) {
            try {
                if (s.readyState != 3) { // CLOSED -- TODO: find the named constant
                    s.send(JSON.stringify({newGameState:clean(game,s.email), msg:broadcastMessages.join('\n\n')}));
                }
            }catch (e) {
                console.log(e);
            }
        }
    });
}
