import { resources, drop_tiles, player_colors, game_events, ship_capacities, ship_feeds, ship_prices } from './data.js';

export const gameState = { players:[] };
export const buildingHelpers = {};
export const ui = {};
ui.update = ()=>{}; // so it can be called before it's initialized
export const backend = {};

export function endGame() {
    gameState.players = [];
    gameState.advancers = [];
    gameState.townResources = {};

}

export function shuffle(input) {
    let array = input.slice(); // copy
    for ( let i = array.length; i>0; i-- ) {
	let rnd = Math.floor(Math.random() * i);
	let tmp = array[i-1];
	array[i-1] = array[rnd];
	array[rnd] = tmp;
    }
    return array
};

const example_names = ['Daniel', 'Nick', 'Eppilito', 'Pei-hsin', 'Bob'];

export function countSymbol(player, sym) {
    let cnt = 0;
    for (let b of player.buildings) {
        for (let s of buildingHelpers.buildings_by_number[b].symbols) {
            if (sym==s) {
                cnt += 1;
            }
        }
    }
    return cnt;
}

export function addResources(player, gain) {
    for (let r in gain) {
        if (player.resources[r] == undefined) player.resources[r]=0;
        player.resources[r] += gain[r];
    }
}


export function newGame(players) {
    gameState.players = players.map( (n,i)=> {
        return {
            name: n,
            color: player_colors[i],
            number: i,
            resources: {money:5, coal:1},
            buildings: [],
            ships: []
        };
    } );
    gameState.advancers = shuffle(drop_tiles);
    gameState.townResources = {money:2, wood:2, fish:2, clay:1, iron:0, wheat:0, cattle:0};
    gameState.ships = {wood:[], iron: [], steel: [], luxury: []};
    gameState.shipStats = {luxury: {feed: 0, ship: 0}};
    for (let r of ['wood','iron','steel']) gameState.shipStats[r] = {feed: ship_feeds[r][players.length], ship: ship_capacities[r] };
    gameState.events = game_events[players.length];
    gameState.disks_by_building = {};
    gameState.currentTurn = 0;
    gameState.currentAdvancer = -1;
    gameState.currentPlayer = -1;
    gameState.sockets = []; // Used by server
    buildingHelpers.initBuildings(players.length);
    nextTurn();
}

export function safeCopy(x) {
    if (x && typeof(x)=='object') {
        if (Array.isArray(x)) {
            return x.map(safeCopy);
        } else if ((x.constructor==Object && x.prototype==undefined)) {
            let out = {};
            for (let i in x) {
                if (i[0]=='_') continue;
                let tmp = safeCopy(x[i]);
                if (tmp || ! x[i]) {
                    out[i] = tmp;
                }
            }
            return out;
        } else {
            return null;
        }
    } else {
        return x;
    }
}

export function completeFeed(player, food) {
    if ( ! food ) return;
    const fed = countPile(food,'food');
    if (fed < player.hunger) {
        player.hunger -= fed;
        ui.pickPlayerResources(player,
                               (r)=>resources[r].food,
                               player.name+': that was '+fed+' food, now eat another '+player.hunger+' food',
                               true).
            then(completeFeed.bind(null, player));
    } else {
        delete player.hunger
        ui.update();
        if (gameState.players.filter((p)=>(p.hunger>0)).length == 0) {
            nextTurn();
        }
    }
}

export function nextTurn() {
    gameState.currentAdvancer += 1;
    if ((gameState.currentTurn >= gameState.events.length) && (gameState.currentAdvancer >= gameState.players.length)) {
        ui.endGame();
        return;
    }
    if (gameState.currentAdvancer == gameState.advancers.length) {
        const ev = gameState.events[gameState.currentTurn];
        gameState.ships[ev.ship[0]].unshift(ev.ship[1]);
        if (ev.building) {
            let best=9999, bestdeck=null;
            for (let deck of gameState.buildingPlans) {
                if (deck.length>0 && deck[0]<best) {
                    best=deck[0];
                    bestdeck=deck;
                }
            }
            if (bestdeck) {
                gameState.townBuildings.push(bestdeck.shift());
            }
        }
        if (ev.special) {
            gameState.townBuildings.push(gameState.specialBuildings.shift());
        }
        if ( ! ev.noharvest) {
            for (let p of gameState.players) {
                if (p.resources.wheat > 0) p.resources.wheat += 1;
                if (p.resources.cattle > 1) p.resources.cattle += 1;
            }
        }
        for (let p of gameState.players){
            p.hunger = ev.feed;
            for (let s of p.ships) {
                p.hunger -= ship_feeds[s[0]][gameState.players.length];
            }
            if (p.hunger <= 0) {
                delete p.hunger;
                continue;
            }
            let available = countPile(p.resources,'food');
            if (available <= p.hunger) {
                console.log('autofeeding ',p);
                for (let r in p.resources) {
                    if (resources[r].food) {
                        p.resources[r] = 0;
                    }
                }
                p.hunger -= available;
                const loans = Math.ceil(p.hunger/4);
                const money = loans*4 - p.hunger;
                addResources(p,{loans,money});
                delete p.hunger
            } else {
                const foodtypes = Object.entries(p.resources).filter((e)=>(resources[e[0]].food>0 && e[1]>0));
                if (foodtypes.length == 1) {
                    console.log('autofeeding ',p,'using',foodtypes);
                    const n = Math.ceil(p.hunger / resources[foodtypes[0][0]].food);
                    subtractResources(p,{[foodtypes[0][0]]: n});
                    delete p.hunger;
                } else if ( ! ui.am_client_to_server ) {
                    console.log('manual feeding ',p);
                    ui.pickPlayerResources(p,
                                           (r)=>resources[r].food,
                                           p.name+': eat '+p.hunger+' food',
                                          true).
                        then(completeFeed.bind(null,p));
                } else {
                    console.log('letting the server worry about feeding ',p);
                }

            }
        }
        gameState.currentTurn += 1;
        if (gameState.players.filter((p)=>(p.hunger>0)).length) {
            gameState.currentAdvancer = -1;
            return;
        } else {
            gameState.currentAdvancer = 0;
        }
    }
    for (let res of gameState.advancers[gameState.currentAdvancer]) {
        if (res != 'interest') {
            gameState.townResources[res] += 1;
        } else {
            for (let p of gameState.players) {
                if (p.resources.loans > 0) {
                    try {
                        subtractResources(p,{money:1});
                    } catch {
                        addResources(p,{loans:1,money:3});
                    }
                }
            }
        }
    }
    gameState.currentPlayer += 1;
    gameState.currentPlayer %= gameState.players.length;
    gameState.bigActionTaken = false;
    ui.update();
}

export async function takeResource() {
    const resource = await ui.pickTownResource();
    const player = gameState.players[gameState.currentPlayer];
    if ( ! ( gameState.townResources[resource] > 0 ) ) return false;
    if (player.resources[resource] == undefined) player.resources[resource] = 0;
    player.resources[resource] += gameState.townResources[resource];
    gameState.townResources[resource] = 0;
    gameState.bigActionTaken = true;
    ui.update();
}
    
function satisfies(provided, reqs) {
    if (('money' in reqs) && (provided.money >= reqs.money)) return true;
    if (('food' in reqs) && (countPile(provided,'food') >= reqs.food)) return true;
    return false;
}
    

export function findOwner(bn) {
    for (let p of gameState.players) {
        if (p.buildings.indexOf(bn)!=-1) {
            return p;
        }
    }
    if (gameState.townBuildings.indexOf(bn)!=-1) {
        return 'town';
    }
    throw "Building does not exist!";
}

export async function utilizeBuilding(building) {
    const player = gameState.players[gameState.currentPlayer];
    if (building === undefined) {
        building = await ui.pickBuilding();
    }
    if (gameState.currentTurn < gameState.events.length) {
        if (gameState.disks_by_building[building.number] > -1) throw "Building Occupied";
    }
    for (let b in gameState.disks_by_building) {
        if (gameState.disks_by_building[b] == gameState.currentPlayer) {
            delete gameState.disks_by_building[b];
        }
    }
    gameState.disks_by_building[building.number] = gameState.currentPlayer;
    const owner = findOwner(building.number);
    if (owner != player) {
        const pt = Object.keys(building.entry);
        if (pt.length==1 && pt[0]==['money']) {
            subtractResources(player, building.entry);
            if (owner!='town') addResources(owner, building.entry);
            ui.update();
        } else if (pt.length) {
            const entryres = await ui.pickPlayerResources(player, (res)=>resources[res].food,
                                                          "Pick resources for entry cost: "+JSON.stringify(building.entry));
            if (owner!='town') addResources(owner, entryres);
            if ( ! satisfies(entryres, building.entry) ) throw "Insufficient Entry Resources";
        }
    }
    await building.action(player, building);
    gameState.bigActionTaken = true;
    ui.update();
}
    
export function subtractResources(player, spend) {
    for (let r in spend) {
        if (player.resources[r] == undefined) player.resources[r]=0;
        if (player.resources[r] >= spend[r]) {
            player.resources[r] -= spend[r];
        } else {
            if (r=='clay' && player.resources['clay']+player.resources['brick']>=spend[r]) {
                player.resources.brick -= (spend.clay - player.resources.clay);
                player.resources.clay = 0;
            } else if (r=='iron' && player.resources['iron']+player.resources['steel']>=spend[r]) {
                player.resources.steel -= (spend.iron - player.resources.iron);
                player.resources.iron = 0;
            } else {
                throw "Insufficient Resources";
            }
        }
    }
}

export function checkDecks(bn) {
    for (let i=0; i<gameState.buildingPlans.length; i++) {
        if (gameState.buildingPlans[i] && gameState.buildingPlans[i][0]==bn) {
            return i;
        }
    }
    return -1;
}

export async function buy() {
    const player = gameState.players[gameState.currentPlayer];
    const b = await ui.pickBuildingPlan('Choose a building or ship to buy', player.resources, true);
    if (b.is_ship) {
        subtractResources(player, { money: ship_prices[b.material] });
        player.ships.push([b.material,gameState.ships[b.material].shift()]);
    } else {
        subtractResources(player, {money:(b.price||b.value)});
        let idx;
        if ( (idx = checkDecks(b.number)) != -1 ) {
            gameState.buildingPlans[idx].shift();
        } else if ( (idx = gameState.townBuildings.indexOf(b.number)) != -1 ) {
            gameState.townBuildings.splice(idx,1);
        } else {
            throw "Not purchaseable";
        }
        if (b.number in gameState.disks_by_building) {
            delete gameState.disks_by_building[b.number];
        }
        player.buildings.push(b.number);
    } 
    ui.update();
}

export async function repayLoan() {
    const player = gameState.players[gameState.currentPlayer];
    subtractResources(player,{loans:1,money:5});
}

export async function sell() {
    const player = gameState.players[gameState.currentPlayer];
    const b = await ui.pickPlayerBuilding('Choose a building to sell', player);
    const idx = player.buildings.indexOf(b.number);
    if (idx == -1) throw "Cannot sell";
    player.buildings.splice(idx,1);
    addResources(player, {money:Math.floor(b.value/2)});
    gameState.townBuildings.push(b.number);
        if (b.number in gameState.disks_by_building) {
        delete gameState.disks_by_building[b.number];
    }
    ui.update();
}

export async function cheat() {
    addResources(gameState.players[gameState.currentPlayer], {money:20,wood:20,clay:20,iron:20,wheat:20,coal:20,bread:20,meat:20,lox:20,fish:10,cattle:10});
    ui.update();
}

export async function wrap(callback) {
    const backup = safeCopy(gameState);
    try {
        console.log('callback',callback,' has name ',callback.name)
        backend.prepare_log(callback.name);
        if (ui.cancelButton) ui.cancelButton.setState({active:true});
        await callback();
        backend.send_log()
    } catch (e) {
        backend.abort_log();
        ui.showError(e+'');
        restore(gameState, backup);
        throw e;
    } finally {
        if (ui.cancelButton) ui.cancelButton.setState({active:false});
        ui.update();
    }
}

export function restore(active, canon) {
    for (let k in canon) {
        active[k] = safeCopy(canon[k]);
    }
}

export function countPile(res, aspect, fn) {
    if (!fn) fn=((x)=>x);
    let out = 0;
    for (let r in res) {
        if (resources[r][aspect] > 0) {
            out += fn(resources[r][aspect]) * res[r];
        }
    }
    return out;
}
