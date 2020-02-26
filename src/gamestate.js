import { resources, drop_tiles, player_colors } from './data.js';

export let gameState = {};

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


class Player {
    constructor(i) {
        this.name = example_names[i];
        this.color = player_colors[i];
        this.resources = {};
        this.buildings = [];
    }
    countSymbol(sym) {
        let cnt = 0;
        for (let b of this.buildings) {
            for (let s of b.symbols) {
                if (sym==s) {
                    cnt += 1;
                }
            }
        }
        return cnt;
    }
    addResources(gain) {
        console.log(['adding resources',this.resources,gain]);
        for (let r in gain) {
            if (this.resources[r] == undefined) this.resources[r]=0;
            this.resources[r] += gain[r];
        }
    }
}

export function newGame(nplayers) {
    endGame();
    for (let i=0; i<nplayers; i++) {
        gameState.players.push(new Player(i));
    }
    gameState.advancers = shuffle(drop_tiles);
    gameState.townResources = {};
    for (let i of drop_tiles) {
        for (let j of i) {
            gameState.townResources[j] = 0;
        }
    }
    gameState.currentAdvancer = -1;
    gameState.currentPlayer = 0;
    gameState.initBuildings();
    nextTurn();
}

export function safeCopy(x) {
    if (typeof(x)=='object') {
        if (Array.isArray(x)) {
            return x.map(safeCopy);
        } else if ((x.constructor==Object && x.prototype==undefined) ||
                   (x.constructor==Player)) {
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
    gameState.currentAdvancer %= gameState.advancers.length;
    for (let res of gameState.advancers[gameState.currentAdvancer]) {
        gameState.townResources[res] += 1;
    }
    if (gameState.ui) {
        gameState.ui.update();
    }
}

export async function takeResource() {
    const resource = await gameState.pickTownResource();
    const player = gameState.players[gameState.currentPlayer];
    if ( ! ( gameState.townResources[resource] > 0 ) ) return false;
    if (player.resources[resource] == undefined) player.resources[resource] = 0;
    player.resources[resource] += gameState.townResources[resource];
    gameState.townResources[resource] = 0;
    if (gameState.ui) gameState.ui.update();
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
    

export async function useBuilding() {
    try {
        const player = gameState.players[gameState.currentPlayer];
        const building = await gameState.pickBuilding();
        const pt = Object.keys(building.entry);
        if (pt.length==1 && pt[0]==['money']) {
            subtractResources(player, building.entry);
            if (gameState.ui) gameState.ui.update();
        } else if (pt.length) {
            const entryres = await gameState.pickPlayerResources(player, (res)=>{return resources[res].food>0}, "Pick resources for entry cost: "+JSON.stringify(building.entry));
            if ( ! satisfies(entryres, building.entry) ) throw "Insufficient Entry Resources";
        }
        await building.action(player);
        if (gameState.ui) gameState.ui.update();
    } catch (e) {
        window.alert(e);
    }
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

export async function buy() {
    const player = gameState.players[gameState.currentPlayer];
    const b = await gameState.pickBuildingPlan('Choose a building to buy', player.resources, true);
    subtractResources(player, {money:b.cost});
    let idx;
    if (b._deck && b._deck[0]==b) {
        b._deck.shift();
    } else if ((idx = gameState.townBuildings.indexOf(b))!=-1) {
        gameState.townBuildings.splice(idx,1);
    } else {
        throw "Not purchaseable";
    }
    player.buildings.push(b);
    if (gameState.ui) gameState.ui.update();
} 

export async function sell() {
    const player = gameState.players[gameState.currentPlayer];
    const b = await gameState.pickPlayerBuilding('Choose a building to sell', player);
    const idx = player.buildings.indexOf(b);
    if (idx == -1) throw "Cannot sell";
    player.buildings.splice(idx,1);
    player.addResources({money:Math.floor(b.cost/2)});
    gameState.townBuildings.push(b);
    if (gameState.ui) gameState.ui.update();
}

export async function cheat() {
    gameState.players[gameState.currentPlayer].addResources({money:20,wood:20,clay:20,iron:20});
    if (gameState.ui) gameState.ui.update();
}

export async function wrap(callback) {
    const backup = safeCopy(gameState);
    try {
        await callback();
    } catch (e) {
        alert(e);
        restore(gameState, backup);
    }
    if (gameState.ui) gameState.ui.update();
}
/*
function restore(active, canon) {
    let keys = {};
    for (let k in active) keys[k]=true;
    for (let k in canon) keys[k]=true;
    for (let k in keys) {
        if (k in canon && k in active) {
            if (typeof(canon[k]) != typeof(active[k])) throw "Cannot Restore "+k+JSON.stringify(canon[k],active[k]);
            if (typeof(canon[k]==Object)) {
                if (canon[k].isBuilding != active[k].isBuilding) throw "Cannot Restore "+k+JSON.stringify(canon[k],active[k]);
                if (canon[k].isBuilding) {
                    active[k] = gameState.buildingsByNumber[canon[k].number
                */
