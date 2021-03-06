import { resources, drop_tiles, player_colors, game_events, ship_capacities, ship_feeds, ship_prices } from './data.js';
import { buildings_by_number, shuffle, addResources, satisfies, subtractResources, checkDecks, countPile, findOwner, appendKey, safeCopy, calcScore } from './utils.js';

export function newGame(players, initBuildings) {
    let game = {}
    game.players = players.map( (p,i)=> {
        return {
            name: p.name || p,
            email: p.email || '',
            color: p.color || player_colors[i],
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
    game.log = [];
    game.hilites = {};
    game.sockets = []; // Used by server
    initBuildings(game);
    game.log.push([1, 'Initial Setup']);
    game.log.push('Advancers: '+game.advancers.map((x)=>x.join('/')).join(', '));
    for (let i of game.buildingPlans) {
        game.log.push('Building Plan Pile: '+i.map((x)=>buildings_by_number[x].name).join(', '));
    }
    nextTurn(null, game, /*ui=*/ {update:()=>{}});
    return game;
}

export function completeFeed(player, game, ui, food) {
    if (food === undefined) food = ui.serverPickResources(player);
    if (food === null) return;
    game.log.push(player.name+' ate '+JSON.stringify(food));
    const fed = countPile(food,'food');
    if (fed < player.hunger) {
        player.hunger -= fed;
        ui.pickPlayerResources(player,
                               (r)=>resources[r].food,
                               {msg:player.name+': that was '+fed+' food, now eat another '+player.hunger+' food',
                                uncancelable:true,
                                req:{food:player.hunger}}).
            then(completeFeed.bind(null, player, game, ui));
    } else {
        delete player.hunger
        ui.update();
        if (game.players.filter((p)=>(p.hunger>0)).length == 0) {
            nextTurn(null, game, ui);
        }
    }
}

export function nextTurn(player, game, ui) {
    game.currentAdvancer += 1;
    if ((game.currentTurn >= game.events.length) && (game.currentAdvancer >= game.players.length)) {
        game.log.push([1,'End of Game']);
        for (let p of game.players) {
            while (p.resources.loans>0 && p.resources.money>5) {
                p.resources.loans -= 1;
                p.resources.money -= 5;
                game.log.push(p.name+' repayed loan');
            }
        }
        game.winner = null;
        game.highScore = -99999;
        for (let p of game.players) {
            let score = calcScore(p);
            game.log.push(p.name+' scored '+score.total);
            if (score.total > game.highScore) {
                game.winner = p.name;
                game.highScore = score.total;
            }
            game.log.push(game.winner+' wins');
        }
        ui.endGame(game);
        return;
    }
    if (game.currentAdvancer == game.advancers.length) {
        game.log.push([1,'End of Round']);
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
                game.log.push('Town built '+b.name);
            }
        }
        if (ev.special) {
            game.townBuildings.push(game.specialBuildings.shift());
            let b = buildings_by_number[ game.townBuildings[game.townBuildings.length-1] ];
            ui.showMessage('Town built '+b.name+' ('+b.text+')');
            game.log.push('Town built '+b.name);
        }
        if ( ! ev.noharvest) {
            game.log.push('Wheat and cattle grew');
            for (let p of game.players) {
                if (p.resources.wheat > 0) p.resources.wheat += 1;
                if (p.resources.cattle > 1) p.resources.cattle += 1;
            }
        }
        game.log.push([2,'All must feed '+ev.feed]);
        for (let p of game.players){
            p.hunger = ev.feed;
            for (let s of p.ships) {
                p.hunger -= ship_feeds[s[0]][game.players.length];
            }
            if (p.hunger <= 0) {
                delete p.hunger;
                game.log.push(p.name+' is covered');
                continue;
            }
            let available = countPile(p.resources,'food');
            if (available <= p.hunger) {
                console.log('autofeeding ',p);
                let msg = p.name+' ate ';
                for (let r in p.resources) {
                    if (resources[r].food) {
                        if (p.resources[r]) msg += p.resources[r]+' '+r+', ';
                        p.resources[r] = 0;
                    }
                }
                p.hunger -= available;
                const loans = Math.ceil(p.hunger/4);
                const money = loans*4 - p.hunger;
                addResources(p,{loans,money});
                if (loans) msg += ' and took '+loans+' loans';
                game.log.push(msg);
                delete p.hunger
            } else {
                const foodtypes = Object.entries(p.resources).filter((e)=>(resources[e[0]].food>0 && e[1]>0));
                if (foodtypes.length == 1) {
                    console.log('autofeeding ',p,'using',foodtypes);
                    const n = Math.ceil(p.hunger / resources[foodtypes[0][0]].food);
                    subtractResources(p,{[foodtypes[0][0]]: n});
                    game.log.push(p.name+' ate '+n+' '+foodtypes[0][0]);
                    delete p.hunger;
                } else if ( ! ui.am_client_to_server ) {
                    console.log('manual feeding ',p);
                    ui.pickPlayerResources(p,
                                           (r)=>resources[r].food,
                                           {msg:p.name+': eat '+p.hunger+' food',
                                            uncancelable:true,
                                            req:{food:p.hunger}}).
                        then(completeFeed.bind(null,p,game,ui));
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
            game.log.push([1,'Interest']);
            for (let p of game.players) {
                if (p.resources.loans > 0) {
                    try {
                        subtractResources(p,{money:1});
                        game.log.push(p.name+' paid');
                    } catch {
                        addResources(p,{loans:1,money:3});
                        game.log.push(p.name+' took another loan');
                    }
                }
            }
        }
    }
    game.currentPlayer += 1;
    game.currentPlayer %= game.players.length;
    game.log.push([1,game.players[game.currentPlayer].name+"'s Turn"]);
    game.bigActionTaken = 0;
    for (let i in game.hilites) {
        game.hilites[i] = game.hilites[i].filter((x)=>(x!=game.currentPlayer));
        if (game.hilites[i].length == 0) delete game.hilites[i];
    }
    ui.update();
}

export async function takeResource(player, game, ui) {
    if (game.bigActionTaken) throw "You already took your turn";
    const resource = await ui.pickTownResource();
    if ( ! ( game.townResources[resource] > 0 ) ) return false;
    if (player.resources[resource] == undefined) player.resources[resource] = 0;
    player.resources[resource] += game.townResources[resource];
    game.townResources[resource] = 0;
    game.bigActionTaken = 1;
    appendKey(game.hilites, resource, player.number);    
    ui.update();
}

export async function utilizeBuilding(player, game, ui, building) {
    if (game.bigActionTaken) throw "You already took your turn";
    if (building === undefined) {
        building = await ui.pickBuilding();
    }
    if (game.currentTurn < game.events.length) {
        if (game.disks_by_building[building.number] > -1) throw "Building Occupied";
        for (let b in game.disks_by_building) {
            if (game.disks_by_building[b] == game.currentPlayer) {
                delete game.disks_by_building[b];
            }
        }
        game.disks_by_building[building.number] = game.currentPlayer;
    } else {
        if (game.disks_by_building[building.number] == player.number) throw "Building Occupied By You";
    }
    const owner = findOwner(building.number, game);
    if (owner != player) {
        const pt = Object.keys(building.entry);
        if (pt.length==1 && pt[0]==['money']) {
            subtractResources(player, building.entry);
            if (owner!='town') addResources(owner, building.entry);
            ui.update();
        } else if (pt.length) {
            const msg = "Pick resources for entry cost: "+pt.map((x)=>building.entry[x]+' '+x).join(' or ');
            const entryres = await ui.pickPlayerResources(player, (res)=>resources[res].food, {msg, req:building.entry});
            if (owner!='town') addResources(owner, entryres);
            if ( ! satisfies(entryres, building.entry) ) throw "Insufficient Entry Resources";
        }
    }
    await building.action(player, ui, game, building);
    game.bigActionTaken += 1;
    appendKey(game.hilites, building.number, player.number);
    ui.update();
}

export async function build({player, ui, game, sawmill, msg, pausable}) {
    if (!msg) msg = 'Choose a building to build';
    const bn = await ui.pickBuildingPlan(msg, {resources:(!sawmill)&&player.resources, pausable});
    if (pausable && bn=='pause') throw "Paused";
    if (bn === undefined) throw "canceled"; // This can happen when replaying a 1 building construction firm
    let plan = buildings_by_number[bn];
    if (!plan) throw "Not a building: "+bn;
    let idx;
    if ( (idx = checkDecks(plan.number, game)) != -1 ) {
        game.buildingPlans[idx].shift();
    } else {
        throw "Not buildable "+JSON.stringify(plan);
    }
    let buildcost = safeCopy(plan.buildcost);
    if (sawmill && buildcost.wood > 0) { buildcost.wood -= 1; }
    subtractResources(player, buildcost);
    player.buildings.push(plan.number);
    game.log.push(plan.name);
}


export async function resumeConstruction(player, game, ui) {
    if (game.bigActionTaken != 0.5) throw "Construction isn't paused";
    await build({player,ui,game,msg:'Choose a second building or ',pausable:true});
    game.bigActionTaken += 0.5;
}

export async function buy(player, game, ui) {
    const bn = await ui.pickBuildingPlan('Choose a building or ship to buy', {for_buy: true, resources: player.resources});
    if (bn in game.ships) {
        subtractResources(player, { money: ship_prices[bn] });
        game.log.push('€'+game.ships[bn][0]+' '+bn+' ship for €'+ship_prices[bn])
        player.ships.push([ bn, game.ships[bn].shift() ]);
    } else if (bn in buildings_by_number) {
        let b = buildings_by_number[bn];
        subtractResources(player, {money:(b.price||b.value)});
        game.log.push(b.name+' for €'+(b.price||b.value));
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
        appendKey(game.hilites, b.number, player.number);
    } else {
        throw "Cannot buy "+bn+" -- don't know what it is";
    }
    ui.update();
}

export async function repayLoan(player, game, ui) {
    subtractResources(player,{loans:1,money:5});
}

export async function sell(player, game, ui) {
    const b = await ui.pickPlayerBuilding('Choose a building to sell', player);
    const idx = player.buildings.indexOf(b.number);
    if (idx == -1) throw "Cannot sell";
    player.buildings.splice(idx,1);
    addResources(player, {money:Math.floor(b.value/2)});
    game.log.push('Got €'+Math.floor(b.value/2));
    game.townBuildings.push(b.number);
    if (b.number in game.disks_by_building) {
        delete game.disks_by_building[b.number];
    }
    appendKey(game.hilites, b.number, player.number);
    ui.update();
}

export async function cheat(player, game, ui) {
    addResources(player, {money:200,wood:20,clay:20,iron:20,wheat:20,coal:20,bread:20,meat:20,lox:20,fish:10,cattle:10});
    ui.update();
}
