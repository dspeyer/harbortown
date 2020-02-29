import { resources, drop_tiles, player_colors, game_events, ship_capacities, ship_feeds } from './data.js';

export const gameState = {};
export const buildingHelpers = {};
export const ui = {};
ui.update = ()=>{}; // so it can be called before it's initialized

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


export function newGame(nplayers) {
    endGame();
    ui.initUi(nplayers);
    for (let i=0; i<nplayers; i++) {
        gameState.players.push({
            name: example_names[i],
            color: player_colors[i],
            number: i,
            resources: {},
            buildings: [],
            ships: []
        });
    }
    gameState.advancers = shuffle(drop_tiles);
    gameState.townResources = {};
    for (let i of drop_tiles) {
        for (let j of i) {
            gameState.townResources[j] = 0;
        }
    }
    gameState.ships = {wood:[], iron: [], steel: [], luxury: []};
    gameState.shipStats = {luxury: {feed: 0, ship: 0}};
    for (let r of ['wood','iron','steel']) gameState.shipStats[r] = {feed: ship_feeds[r][nplayers], ship: ship_capacities[r] };
    gameState.events = game_events[nplayers];
    gameState.currentTurn = 0;
    gameState.currentAdvancer = -1;
    gameState.currentPlayer = -1;
    buildingHelpers.initBuildings();
    nextTurn();
}

export function safeCopy(x) {
    if (typeof(x)=='object') {
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

export function nextTurn() {
    gameState.currentAdvancer += 1;
    if (gameState.currentAdvancer == gameState.advancers.length) {
        const ev = gameState.events[gameState.currentTurn];
        // TODO: feed
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
        // TODO: special
        if ( ! ev.noharvest) {
            for (let p of gameState.players) {
                if (p.resources.wheat > 0) p.resources.wheat += 1;
                if (p.resources.cattle > 1) p.resources.cattle += 1;
            }
        }
        gameState.currentTurn += 1;
        gameState.currentAdvancer = 0;
    }
    for (let res of gameState.advancers[gameState.currentAdvancer]) {
        gameState.townResources[res] += 1;
    }
    gameState.currentPlayer += 1;
    gameState.currentPlayer %= gameState.players.length;
    ui.update();
}

export async function takeResource() {
    const resource = await ui.pickTownResource();
    const player = gameState.players[gameState.currentPlayer];
    if ( ! ( gameState.townResources[resource] > 0 ) ) return false;
    if (player.resources[resource] == undefined) player.resources[resource] = 0;
    player.resources[resource] += gameState.townResources[resource];
    gameState.townResources[resource] = 0;
    ui.update();
}
    
function satisfies(provided, reqs) {
    if (('money' in reqs) && (provided.money >= reqs.money)) return true;
    if ('food' in reqs) {
        let food = 0;
        for (let res in provided) {
            food += provided[res] * resources[res].food;
        }
        if (food >= reqs.food) return true;
    }
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

export async function useBuilding() {
    const player = gameState.players[gameState.currentPlayer];
    const building = await ui.pickBuilding();
    const owner = findOwner(building.number);
    if (owner != player) {
        const pt = Object.keys(building.entry);
        if (pt.length==1 && pt[0]==['money']) {
            subtractResources(player, building.entry);
            if (owner!='town') addResources(owner, building.entry);
            ui.update();
        } else if (pt.length) {
            const entryres = await ui.pickPlayerResources(player, (res)=>{return resources[res].food>0}, "Pick resources for entry cost: "+JSON.stringify(building.entry));
            if (owner!='town') addResources(owner, entryres);
            if ( ! satisfies(entryres, building.entry) ) throw "Insufficient Entry Resources";
        }
    }
    await building.action(player, building);
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
    const b = await ui.pickBuildingPlan('Choose a building to buy', player.resources, true);
    subtractResources(player, {money:b.cost});
    let idx;
    if ( (idx = checkDecks(b.number)) != -1 ) {
        gameState.buildingPlans[idx].shift();
    } else if ( (idx = gameState.townBuildings.indexOf(b.number)) != -1 ) {
        gameState.townBuildings.splice(idx,1);
    } else {
        throw "Not purchaseable";
    }
    player.buildings.push(b.number);
    ui.update();
} 

export async function sell() {
    const player = gameState.players[gameState.currentPlayer];
    const b = await ui.pickPlayerBuilding('Choose a building to sell', player);
    const idx = player.buildings.indexOf(b.number);
    if (idx == -1) throw "Cannot sell";
    player.buildings.splice(idx,1);
    addResources(player, {money:Math.floor(b.cost/2)});
    gameState.townBuildings.push(b.number);
    ui.update();
}

export async function cheat() {
    addResources(gameState.players[gameState.currentPlayer], {money:20,wood:20,clay:20,iron:20});
    ui.update();
}

export async function wrap(callback) {
    const backup = safeCopy(gameState);
    try {
        if (ui.cancelButton) ui.cancelButton.setState({active:true});
        await callback();
    } catch (e) {
        ui.showError(e+'');
        restore(gameState, backup);
        throw e;
    } finally {
        if (ui.cancelButton) ui.cancelButton.setState({active:false});
        ui.update();
    }
}

function restore(active, canon) {
    for (let k in canon) {
        active[k] = safeCopy(canon[k]);
    }
}
