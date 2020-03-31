import { resources, drop_tiles, player_colors, game_events, ship_capacities, ship_feeds, ship_prices } from './data.js';

export const buildings_by_number = {}; // filled in by buildings.js

export const ui = {};
ui.update = ()=>{}; // so it can be called before it's initialized

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

export function countSymbol(player, sym) {
    let cnt = 0;
    for (let b of player.buildings) {
        for (let s of buildings_by_number[b].symbols) {
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
    
export function satisfies(provided, reqs) {
    if (('money' in reqs) && (provided.money >= reqs.money)) return true;
    if (('food' in reqs) && (countPile(provided,'food') >= reqs.food)) return true;
    return false;
}
    

export function findOwner(bn, game) {
    for (let p of game.players) {
        if (p.buildings.indexOf(bn)!=-1) {
            return p;
        }
    }
    if (game.townBuildings.indexOf(bn)!=-1) {
        return 'town';
    }
    throw "Building does not exist!";
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

export function checkDecks(bn, game) {
    for (let i=0; i<game.buildingPlans.length; i++) {
        if (game.buildingPlans[i] && game.buildingPlans[i][0]==bn) {
            return i;
        }
    }
    return -1;
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
