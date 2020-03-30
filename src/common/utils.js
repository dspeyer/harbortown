import { resources, drop_tiles, player_colors, game_events, ship_capacities, ship_feeds, ship_prices } from './data.js';
import { buildings_by_number, building_firm } from './building.js';

export const buildingHelpers = {};
export const ui = {};
ui.update = ()=>{}; // so it can be called before it's initialized
export const backend = {};

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
    let game = {}
    game.players = players.map( (n,i)=> {
        return {
            name: n,
            color: player_colors[i],
            number: i,
            resources: {money:5, coal:1},
            buildings: [],
            ships: []
        };
    } );
    game.advancers = shuffle(drop_tiles);
    game.townResources = {money:2, wood:2, fish:2, clay:1, iron:0, wheat:0, cattle:0};
    game.ships = {wood:[], iron: [], steel: [], luxury: []};
    game.shipStats = {luxury: {feed: 0, ship: 0}};
    for (let r of ['wood','iron','steel']) game.shipStats[r] = {feed: ship_feeds[r][players.length], ship: ship_capacities[r] };
    game.events = game_events[players.length];
    game.disks_by_building = {};
    game.currentTurn = 0;
    game.currentAdvancer = -1;
    game.currentPlayer = -1;
    game.sockets = []; // Used by server
    buildingHelpers.initBuildings(game);
    nextTurn(null, game);
    return game;
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

export function completeFeed(player, game, food) {
    if (food === undefined) food = ui.serverPickResources(player);
    if (food === null) return;
    const fed = countPile(food,'food');
    if (fed < player.hunger) {
        player.hunger -= fed;
        ui.pickPlayerResources(player,
                               (r)=>resources[r].food,
                               player.name+': that was '+fed+' food, now eat another '+player.hunger+' food',
                               true).
            then(completeFeed.bind(null, player, game));
    } else {
        delete player.hunger
        ui.update();
        if (game.players.filter((p)=>(p.hunger>0)).length == 0) {
            nextTurn(null, game);
        }
    }
}

export function nextTurn(player, game) {
    game.currentAdvancer += 1;
    if ((game.currentTurn >= game.events.length) && (game.currentAdvancer >= game.players.length)) {
        ui.endGame(game);
        return;
    }
    if (game.currentAdvancer == game.advancers.length) {
        const ev = game.events[game.currentTurn];
        game.ships[ev.ship[0]].unshift(ev.ship[1]);
        if (ev.building) {
            let best=9999, bestdeck=null;
            for (let deck of game.buildingPlans) {
                if (deck.length>0 && deck[0]<best) {
                    best=deck[0];
                    bestdeck=deck;
                }
            }
            if (bestdeck) {
                game.townBuildings.push(bestdeck.shift());
                let b = buildings_by_number[ game.townBuildings[game.townBuildings.length-1] ];
                ui.showMessage('Town built '+b.name);
            }
        }
        if (ev.special) {
            game.townBuildings.push(game.specialBuildings.shift());
            let b = buildings_by_number[ game.townBuildings[game.townBuildings.length-1] ];
            ui.showMessage('Town built '+b.name+' ('+b.text+')');
        }
        if ( ! ev.noharvest) {
            for (let p of game.players) {
                if (p.resources.wheat > 0) p.resources.wheat += 1;
                if (p.resources.cattle > 1) p.resources.cattle += 1;
            }
        }
        for (let p of game.players){
            p.hunger = ev.feed;
            for (let s of p.ships) {
                p.hunger -= ship_feeds[s[0]][game.players.length];
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
                        then(completeFeed.bind(null,p,game));
                } else {
                    console.log('letting the server worry about feeding ',p);
                }

            }
        }
        game.currentTurn += 1;
        if (game.players.filter((p)=>(p.hunger>0)).length) {
            game.currentAdvancer = -1;
            return;
        } else {
            game.currentAdvancer = 0;
        }
    }
    for (let res of game.advancers[game.currentAdvancer]) {
        if (res != 'interest') {
            game.townResources[res] += 1;
        } else {
            for (let p of game.players) {
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
    game.currentPlayer += 1;
    game.currentPlayer %= game.players.length;
    game.bigActionTaken = 0;
    ui.update();
}

export async function takeResource(player, game) {
    if (game.bigActionTaken) throw "You already took your turn";
    const resource = await ui.pickTownResource();
    if ( ! ( game.townResources[resource] > 0 ) ) return false;
    if (player.resources[resource] == undefined) player.resources[resource] = 0;
    player.resources[resource] += game.townResources[resource];
    game.townResources[resource] = 0;
    game.bigActionTaken = 1;
    ui.update();
}
    
function satisfies(provided, reqs) {
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

export async function utilizeBuilding(player, game, building) {
    if (game.bigActionTaken) throw "You already took your turn";
    if (building === undefined) {
        building = await ui.pickBuilding();
    }
    if (game.currentTurn < game.events.length) {
        if (game.disks_by_building[building.number] > -1) throw "Building Occupied";
    }
    for (let b in game.disks_by_building) {
        if (game.disks_by_building[b] == game.currentPlayer) {
            delete game.disks_by_building[b];
        }
    }
    game.disks_by_building[building.number] = game.currentPlayer;
    const owner = findOwner(building.number, game);
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
    await building.action(player, game, building);
    game.bigActionTaken += 1;
    ui.update();
}

export async function resumeConstruction(player, game) {
    if (game.bigActionTaken != 0.5) throw "Construction isn't paused";
    await building_firm.action(player,{},'Choose a second building or ',true);
    game.bigActionTaken += 0.5;
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

export async function buy(player, game) {
    const bn = await ui.pickBuildingPlan('Choose a building or ship to buy', {for_buy: true});
    if (bn in game.ships) {
        subtractResources(player, { money: ship_prices[bn] });
        player.ships.push([ bn, game.ships[bn].shift() ]);
    } else if (bn in buildings_by_number) {
        let b = buildings_by_number[bn];
        subtractResources(player, {money:(b.price||b.value)});
        let idx;
        if ( (idx = checkDecks(b.number, game)) != -1 ) {
            game.buildingPlans[idx].shift();
        } else if ( (idx = game.townBuildings.indexOf(b.number)) != -1 ) {
            game.townBuildings.splice(idx,1);
        } else {
            throw "Not purchaseable";
        }
        if (b.number in game.disks_by_building) {
            delete game.disks_by_building[b.number];
        }
        player.buildings.push(b.number);
    } else {
        throw "Cannot buy "+bn+" -- don't know what it is";
    }
    ui.update();
}

export async function repayLoan(player, game) {
    subtractResources(player,{loans:1,money:5});
}

export async function sell(player, game) {
    const b = await ui.pickPlayerBuilding('Choose a building to sell', player);
    const idx = player.buildings.indexOf(b.number);
    if (idx == -1) throw "Cannot sell";
    player.buildings.splice(idx,1);
    addResources(player, {money:Math.floor(b.value/2)});
    game.townBuildings.push(b.number);
        if (b.number in game.disks_by_building) {
        delete game.disks_by_building[b.number];
    }
    ui.update();
}

export async function cheat(player, game) {
    addResources(player, {money:20,wood:20,clay:20,iron:20,wheat:20,coal:20,bread:20,meat:20,lox:20,fish:10,cattle:10});
    ui.update();
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
