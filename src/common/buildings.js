import { shuffle, subtractResources, addResources, countSymbol, countPile, buildings_by_number } from './utils.js';
import { utilizeBuilding, build } from './actions.js';
import {resources} from './data.js';


function autoEnergy(res, q) {
    let out = {};
    for (let i of ['coke','charcoal','coal','wood']) {
        out[i] = Math.min(res[i]||0, Math.floor(q/resources[i].energy));
        console.log('aE1',i,res[i],q,out[i]);
        q -= out[i] * resources[i].energy;
    }
    if (q>0) {
        for (let i of ['charcoal','coal','coke']) {
            if (res[i]>out[i]) {
                out[i]+=1;
                q -= resources[i].energy;
                break;
            }
        }
    }
    if (q<0) {
        for (let i of ['coal','charcoal','wood']) {
            let c = Math.min(out[i], -Math.ceil(q/resources[i].energy));
            out[i] -= c;
            q += c * resources[i].energy;
            if (q>=0) break;
        }
    }
    return out;
}

export const building_firm = { name: 'Building Firm',
                               symbols: ['🏠','🔨'],
                               text: 'Build 1 building',
                               action: async (player, ui, game) => { await build({player,ui,game}); }
                             };

export const clientCheat = {};

const wharf = { getname(){ return this.modernized ? 'Modernized Wharf' : 'Wharf'; },
                symbols: ['🏭'],
                entry: {food:2},
                value: 14,
                buildcost: {wood:2,clay:2,iron:2},
                truegetmodernized(game){ return (this.number in game.wharfModernization); },
                truesetmodernized(game, v){ game.wharfModernization[this.number] = v; },
                getmodernized() { return clientCheat.game ? this.truegetmodernized(clientCheat.game) : false; },
                gettext(){ return this.modernized ? 'Build a ship' : 'Build wooden ship, or metal w/ modernization'; },
                
                action: async (player, ui, game, self) => {
                    let modernized = self.truegetmodernized(game);
                    let ship_type = await ui.pickShip(player, modernized);
                    if (! game.ships[ship_type].length ) throw "No "+ship_type+" ships available to build";
                    if (ship_type == 'luxury') subtractResources(player, {'steel':3});
                    if (ship_type == 'steel') subtractResources(player, {'steel':2});
                    if (ship_type == 'iron') subtractResources(player, {'iron':Math.min(4,player.resources.iron||0),
                                                                        'steel':4-Math.min(4,player.resources.iron||0)});
                    if (ship_type == 'wood') subtractResources(player, {'wood':5});
                    if (ship_type != 'wood' && ! modernized) {
                        try {
                            subtractResources(player, {brick:1});
                            self.truesetmodernized(game, true)
                            modernized = true;
                            game.log.push('Modernized');
                        } catch (e) {
                            throw e+" to modernize";
                        }
                    }
                    ui.update();

                    let msg = "Send 3ϟ (energy).";
                    if (!modernized && player.resources.brick>0) msg += " (You may also send a brick to charitably modernize.)";
                    let filter = (res)=>((!modernized && res=='brick') || resources[res].energy > 0);
                    let res = await ui.pickPlayerResources(player, filter, {msg, auto:(res)=>autoEnergy(res,3), req:{energy:3}});
                    if (res.brick > 1) throw "Only one brick needed to modernize";
                    if ( ! modernized && res.brick>0) {
                        self.truesetmodernized(game, true)
                        modernized = true;
                        game.log.push('Modernized');
                    }
                    if (countPile(res,'energy') < 3) throw "Not enough energy";

                    game.log.push('€'+game.ships[ship_type][0]+' '+ship_type+' ship')
                    player.ships.push([ship_type,game.ships[ship_type].shift()]);
                }
              };



export const starting_buildings = [
    { ...building_firm,
      entry: {},
      value: 4,
      number: 'b1'},
    { ...building_firm,
      entry: {food: 1},
      value: 6,
      number: 'b2'},
    { name: 'Construction Firm',
      symbols: ['🔨','🏭'],
      text: 'Build 1 or 2 buildings',
      entry: {food: 2},
      value: 8,
      number: 'b3',
      action: async (player,ui,game,self) => {
          await build({player,ui,game,msg:"Choose first building to build"});
          ui.update();
          try {
              await build({player,ui,game,msg:'Choose a second building to build or ', pausable:true});
          } catch(e) {
              if (e=='canceled' || e=='nothing_to_choose') {
                  return;
              }
              if (e=='Paused') {
                  game.bigActionTaken -= 0.5;
                  return;
              }
              throw e;
          }
      }},
];

function capOfShips(ships,n,game) {
    let rem = n;
    let cap = 0;
    let shipsFound = []
    for (let t of ['steel','iron','wood']) {
        for (let s of ships) {
            if (s[0]==t) {
                cap += game.shipStats[t].ship;
                rem -= 1;
                shipsFound.push(t)
            }
            if (rem==0) {
                game.log.push('Using '+shipsFound.join(', ')+' to ship '+cap+' goods');
                return cap;
            }
        }
    }
    return cap;
}


export const buildings = [
    {name: 'Shipping Line',
     number: 18,
     symbols: ['🎣', '🏢'],
     entry: {food: 2},
     value: 10,
     buildcost: {'wood':2, 'brick':2},
     minplayers: 1,
     text: '3 ϟ + boatload ⮕ value',
     action: async (player, ui, game) => {
         const enres = await ui.pickPlayerResources(player, (x)=>resources[x].energy, {msg:"Choose energy to load ships with 3/ship"});
         const energy = countPile(enres,'energy');
         const nship = Math.floor(energy/3);
         const cap = capOfShips(player.ships, nship, game);
         function auto(res) {
             let out = {};
             let rem = cap;
             let opts = Object.keys(res).filter((x)=>resources[x].value>0);
             let shipability = (x) => ((resources[x].value||0) - (resources[x].energy||0)/10 - (resources[x].food||0)/100);
             opts.sort((a,b)=>shipability(b)-shipability(a));
             for (let r of opts) {
                 out[r] = Math.min(res[r],rem);
                 rem -= out[r];
                 if (!rem) break;
             }
             return out;
         }
         const sres = await ui.pickPlayerResources(player, (x)=>resources[x].value>0, {msg:"Choose goods to ship (max "+cap+")",auto});
         if (countPile(sres,'value',(x)=>1) > cap) throw "Too many goods";
         const v = countPile(sres,'value');
         addResources(player,{money:v});
         game.log.push('Making €'+v);
     }
    },
    
    {name: 'Grocery Market',
     number: 19,
     symbols: ['🏢'],
     entry: {'money': 1},
     value: 10,
     buildcost: {'wood':1, 'brick':1},
     minplayers: 3,
     text: 'Gain 1 of each food-related resource',
     action: async (player) => { addResources(player,{cattle:1,fish:1,wheat:1,meat:1,lox:1,bread:1}); }
    },
    
    {name: 'Bridge',
     number: 27,
     symbols: [],
     entry: {'money':2},
     value: 16,
     buildcost: {iron: 3},
     minplayers: 3,
     text: 'Sell adv for 1, basic for 1/3',
     action: async (player, ui) => {
         const toSell = await ui.pickPlayerResources(player, (res) => (res!='money' && res!='loans'), {auto:'all'});
         const adv = countPile(toSell,'advanced');
         const basic = countPile(toSell,'value',(x)=>1) - adv;
         if (basic%3 != 0) {
             ui.showMessage('Bridging '+basic+' basic goods wastes '+(basic%3)+' goods', /*personal=*/ true);
         }
         addResources(player,{ money: adv+Math.floor(basic/3) });
     }
    },
    
    {name: 'Cokery',
     number: 25,
     symbols: ['🏭'],
     entry: {money: 1},
     value: 18,
     buildcost: {brick:2, iron:2},
     minplayers: 1,
     text: 'coal ⮕ coke + money',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (res)=>(res=='coal'), {auto:'all'});
         const n = res.coal;
         addResources(player,{coke:n,money:n});
     }
    },
    
    {name: 'Church',
     number: 30,
     symbols: ['🏛'],
     entry: {},
     value: 26,
     price: 999,
     buildcost: {wood:5, brick:3, iron:1},
     minplayers: 2,
     text: '5 loaves 2 fish ⮕ 10 loaves 5 fish once',
     action: async (player) => {
         subtractResources(player,{bread:5,fish:2});
         addResources(player,{bread:10,fish:5});
     }
    },
    
    {name: 'Black Market',
     number: 13,
     symbols: [],
     entry: {food:1},
     value: 2,
     buildcost: {unobtainium:1},
     minplayers: 3,
     text: '+2 each unavailable town resource',
     action: async (player, ui, game) => {
         for (let res in game.townResources) {
             if (game.townResources[res]==0) {
                 addResources(player,{ [res]:2 });
             }
         }
     }
    },
    
    {name: 'Hardware Store',
     number: 6,
     symbols: ['🔨','🎣','🏢'],
     entry: {food:1},
     value: 8,
     buildcost: {wood:3,clay:1},
     minplayers: 3,
     text: '+1 wood brick iron',
     action: async (player) => { addResources(player,{wood:1,brick:1,iron:1});}
    },

    {...wharf,
     get name() { return this.getname(); },
     get text() { return this.gettext(); },
     get modernized() { return this.getmodernized(); },
     set modernized(x) { return this.setmodernized(x); },
     minplayers: 1,
     number: 12},
    {...wharf,
     get name() { return this.getname(); },
     get text() { return this.gettext(); },
     get modernized() { return this.getmodernized(); },
     set modernized(x) { return this.setmodernized(x); },
     minplayers: 3,
     number: 17},
    
    {name: 'Fishery',
     number: 3,
     symbols: ['🎣','🏠'],
     entry: {},
     value: 10,
     buildcost: {wood:1,clay:1},
     minplayers: 1,
     text: 'Take 3 + 🎣 fish',
     action: async (player) => { addResources(player,{fish:3+countSymbol(player,'🎣')}); }
    },
    
    {name: 'Town Hall',
     number: 28,
     symbols: ['🏛'],
     entry: {unobtainium:1},
     value: 6,
     price: 30,
     buildcost: {wood:4,brick:3},
     minplayers: 2,
     text: 'Endgame bonus: 4/🏛 2/🏠',
     endgameBonus: (player) => { return countSymbol(player,'🏛')*4+countSymbol(player,'🏠')*2; },
    },
    
    {name: 'Tannery',
     number: 20,
     symbols: ['🏠'],
     entry: {},
     value: 12,
     buildcost: {wood:1,brick:1},
     minplayers: 1,
     text: 'hides ⮕ leather + money (max 4)',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (res)=>(res=='hides'));
         const n = res.hides;
         if (n > 4) throw "Too many hides";
         addResources(player,{leather:n,money:n});
     }
    },

    {name: 'Bakehouse',
     number: 5,
     symbols: ['🏠'],
     entry: {food:1},
     value: 8,
     buildcost: {clay:2},
     minplayers: 1,
     text: '2 wheat + 1 ϟ ⮕ 2 bread + 1 money',
     action: async (player, ui) => {
         function auto(res) {
             console.log('bh auto', res);
             let out = autoEnergy(res,Math.ceil((res.wheat-1)/2));
             out.wheat = Math.min(res.wheat-1, 2*countPile(out,'energy'));
             return out;
         }
         const res = await ui.pickPlayerResources(player, (res) => (res=='wheat' || resources[res].energy>0), {auto});
         const energy = countPile(res,'energy')
         if (2*energy < res.wheat) {
             throw "Not enough energy for that wheat";
         }
         addResources(player,{bread:res.wheat, money:Math.floor(res.wheat/2)});
         if (res.wheat%2 == 1) {
             ui.showMessage(player.name+unescape("%20%62%61%6b%65%64%20%74%68%65%20%61%66%69%6b%6f%6d%65%6e"));
         }
     }
    },

    {name: 'Charcoal Kiln',
     number: 7,
     symbols: ['🏠'],
     entry: {},
     value: 8,
     buildcost: {clay:1},
     minplayers: 1,
     text: 'wood ⮕ charcoal',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (res)=>(res=='wood'), {auto:'all'});
         addResources(player,{charcoal:res.wood});
     }
    },

    {name: 'Joinery',
     number: 4,
     symbols: ['🔨','🏠'],
     entry: {food:1},
     value: 8,
     buildcost: {wood:3},
     minplayers: 3,
     text: '1/2/3 wood ⮕ 5/6/7 money',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (res)=>(res=='wood'));
         if (res.wood>3) throw "Too much wood (must be 1-3)";
         if (!res.wood) throw "No wood!";
         addResources(player,{money:res.wood+4});
     }
    },

    {name: 'Smokehouse',
     number: 8,
     symbols: ['🎣','🏠'],
     entry: {food:2,money:1},
     value: 6,
     buildcost: {wood:2,clay:1},
     minplayers: 1,
     text: 'fish + any ϟ ⮕ lox 1/2 money (max 6)',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player,
                                                  (res)=>(res=='fish' || resources[res].energy>0),
                                                  {auto:(r)=>({fish:Math.min(r.fish,6), ...autoEnergy(r,1)})});
         if ( ! (res.fish > 0) ) throw "fish required";
         const energytokens = countPile(res,'energy',(x)=>1);
         if (energytokens == 0) throw "energy required";
         if (energytokens > 1) throw "too much energy: any at all will suffice";
         addResources(player,{lox:res.fish,money:Math.floor(res.fish/2)});
     }
    },

    {name: 'Bank',
     number: 29,
     symbols: ['🏢'],
     entry: {unobtainium:1},
     value: 16,
     price: 40,
     buildcost: {brick:4,steel:1},
     minplayers: 2,
     text: 'Endgame bonus: 2/🏢 3/🏭',
     endgameBonus: (player) => { return countSymbol(player,'🏢')*2+countSymbol(player,'🏭')*3; },
    },

    {name: 'Steel Mill',
     number: 23,
     symbols: ['🏭'],
     entry: {money:2},
     value: 22,
     buildcost: {brick:4,iron:2},
     minplayers: 1,
     text: '5 ϟ + 1 iron ⮕ steel',
     action: async (player, ui) => {
         function auto(res) {
             let n = Math.floor(Math.min((res.coke||0),(res.iron||0)/2));
             return {iron:n*2,coke:n};
         }
         const res = await ui.pickPlayerResources(player, (res)=>(res=='iron' || resources[res].energy>0), {auto});
         const energy = countPile(res,'energy');
         if (energy < res.iron*5) {
             throw "Not enough energy for that iron";
         }
         addResources(player,{steel:res.iron});
     }
    },

    {name: 'Business Office',
     number: 21,
     symbols: ['🔨','🎣','🏢'],
     entry: {money:1},
     value: 12,
     buildcost: {wood:4,clay:1},
     minplayers: 3,
     text: '4 any ⮕ steel and/or 1 any ⮕ charcoal / brick / leather',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (res)=>(res!='money' && res!='loans'));
         const cnt = countPile(res,'value',(x)=>1);
         if (cnt!=1 && cnt!=4 && cnt!=5) throw "Must select exactly one, four or five resources";
         if (cnt >= 4) {
             addResources(player,{steel:1});
         }
         if (cnt==1 || cnt==5) {
             const goods = await ui.pickResources(['charcoal','brick','leather'],1);
             addResources(player,{[Object.keys(goods)[0]]:1});
         }
     }
    },

    {name: 'Colliery',
     number: 16,
     symbols: ['🏭'],
     entry: {food:2},
     value: 10,
     buildcost: {wood:1,clay:3},
     minplayers: 1,
     text: '+3 coal (4 if 🔨)',
     action: async (player) => { addResources(player,{coal:3+(countSymbol(player,'🔨')>0)}); }
    },

    {name: 'Sawmill',
     number: 2,
     symbols: ['🏭'],
     entry: {},
     value: 14,
     buildcost: {clay:1,iron:1},
     minplayers: 3,
     text: 'Build one building, save one wood',
     action: async (player,ui,game,self) => { await build({player, ui, game, sawmill:true, msg:"Choose building to saw"}); }
    },
    
    {name: 'Clay Mound',
     number: 10,
     symbols: [],
     entry: {food:1},
     value: 2,
     buildcost: {unobtainium:1},
     minplayers: 1,
     text: '3+🔨 clay',
     action: async (player) => { addResources(player,{clay:3+countSymbol(player,'🔨')}); }
    },

    {name: 'Abbatoir',
     number: 9,
     symbols: ['🏠'],
     entry: {money:2},
     value: 8,
     buildcost: {wood:1,clay:1,iron:1},
     minplayers: 1,
     text: 'cattle ⮕ meat + 1/2 hides',
     action: async (player, ui) => { 
         const res = await ui.pickPlayerResources(player, (res)=>(res=='cattle'), {auto:(r)=>({cattle:Math.max(r.cattle-2,1)})});
         addResources(player,{meat:res.cattle, hides:Math.floor(res.cattle/2)});
     }
    },

    {name: 'Ironworks',
     number: 22,
     symbols: ['🔨','🏭'],
     entry: {food:3,money:1},
     value: 12,
     buildcost: {wood:3,brick:2},
     minplayers: 1,
     text: '3 iron (4 if 6ϟ)',
     action: async (player, ui) => { 
         const res = await ui.pickPlayerResources(player, (res)=>resources[res].energy,
                                                  {auto:(r)=>autoEnergy(r,6), msg:"Send 6ϟ (energy) if you want a 4th iron"});
         const energy = countPile(res, 'energy');
         addResources(player,{iron:3+(energy>=6)});
     }
    },

    {name: 'Brickworks',
     number: 14,
     symbols: ['🏭'],
     entry: {food:1},
     value: 14,
     buildcost: {wood:2,clay:1,iron:1},
     minplayers: 1,
     text: 'clay + 1/2 ϟ ⮕ brick + 1/2 money',
     action: async (player, ui) => {
         function auto(res) {
             let out = autoEnergy(res,Math.ceil(res.clay/2));
             out.clay = Math.min(res.clay, 2*countPile(out,'energy'));
             return out;
         }
         const res = await ui.pickPlayerResources(player, (res)=>(res=='clay' || res=='brick' || resources[res].energy>0), {auto});
         const energy = countPile(res,'energy');
         const clay = (res.clay||0) + (res.brick||0);
         if (2*energy < clay) {
             throw "Not enough energy for that clay";
         }
         addResources(player,{brick:clay, money:Math.floor(clay/2)});
     }
    },

    {name: 'Marketplace',
     number: 1,
     symbols: [],
     entry: {food:2,money:1},
     value: 6,
     buildcost: {wood:2},
     minplayers: 1,
     text: '2+🏠 standard goods; pick next special building',
     action: async (player, ui, game) => {
         const wanted = 2+countSymbol(player,'🏠');
         const opts = ['wood','clay','iron','fish','wheat','cattle','hides','coal'];
         const goods = await ui.pickResources(opts, wanted);
         if (Object.values(goods).reduce((a,b)=>a+b,0)!=Math.min(wanted,opts.length)) throw "Wrong number of goods";
         addResources(player, goods);
         const nsb = await ui.pickNextSpecialBuilding();
         if (nsb != game.specialBuildings[0]) {
             const tmp = game.specialBuildings[0];
             game.specialBuildings[0] = game.specialBuildings[1];
             game.specialBuildings[1] = tmp;
         }
     }
    },

    {name: 'Local Court',
     number: 15,
     symbols: ['🏛'],
     entry: {},
     value: 16,
     buildcost: {wood:3,clay:2},
     minplayers: 3,
     text: 'Forgive 1/1.5/2 loans if you have 1/2/3+',
     action: async (player, ui) => {
         if (player.resources.loans >= 3) {
             subtractResources(player, {loans:2});
         } else if (player.resources.loans == 2) {
             subtractResources(player, {loans:1});
             addResources(player, {money: 2});
         } else if (player.resources.loans == 1) {
             subtractResources(player, {loans:1});
         }
     }
    },

    {name: 'Arts Center',
     number: 11,
     symbols: ['🎣','🏛'],
     entry: {food:1},
     value: 10,
     buildcost: {wood:1,clay:2},
     minplayers: 4,
     text: '€4 for other player in your buildings',
     action: async (player, ui, game) => {
         let cnt=0;
         for (let b of player.buildings) {
             if (b in game.disks_by_building) {
                 const pid = game.disks_by_building[b];
                 if (game.players[pid] != player) {
                     cnt++;
                 }
             }
         }
         addResources(player, {money: cnt*4});
     } 
    },

    {name: 'Dock',
     number: 26,
     symbols: ['🏭'],
     entry: {unobtainium: 1},
     value: 10,
     price: 24,
     buildcost: {wood:1, brick:2, iron:2},
     minplayers: 4,
     text: 'Endgame €4 / ⛴',
     endgameBonus: (player) => { return player.ships.length * 4; } 
    },

    {name: 'Storehouse',
     number: 24,
     symbols: ['🔨','🏢'],
     entry: {unobtanium: 1},
     value: 4,
     price: 10,
     buildcost: {wood:2,brick:2},
     minplayers: 4,
     text: 'Endgame: 1/2 per common 1 per advanced',
     endgameBonus: (p) => Math.floor( countPile(p.resources,'advanced',(a)=>(a?1:0.5)) - p.resources.loans/2 )
    },
]

export const special_buildings = [
    {name: 'Plant Nursery',
     number: 's011',
     symbols: ['🔨','🏠'],
     entry: {food:1},
     value: 6,
     buildcost: {},
     text: '3 money + 4 wood',
     action: async (player, ui) => { addResources(player,{money:3,wood:4}); }
    },

    {name: 'Baguette Shop',
     number: 'S003',
     symbols: ['🏢'],
     entry: {food:1},
     value: 4,
     buildcost: {},
     text: 'bread + meat ⮕ 6 money (4x)',
     action: async (player, ui) => {
         const resources = await ui.pickPlayerResources(player, (r)=>(r=='bread'||r=='meat'));
         if (!resources.bread) throw "No baguettes!";
         if (resources.bread != resources.meat) throw "Mismatched ingredients";
         if (resources.bread > 4) throw "Too much food (max 4 sandwiches)";
         addResources(player,{money:6*resources.bread});
     }
    },

    {name: 'Steelworks',
     number: 'S031',
     symbols: ['🔨','🏭'],
     entry: {food:2,money:1},
     value: 8,
     buildcost: {},
     text: 'iron + 15 ϟ ⮕ 2 steel (once)',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (r)=>(r=='iron'||resources[r].energy));
         if (countPile(res,'energy') < 15) throw "Insufficient Energy";
         if (res.iron!=1) throw "Should have exactly one iron";
         addResources(player,{steel:2});
     }
    },

    {name: 'Scnapps Distillery',
     number: 'S030',
     symbols: ['🏠'],
     entry: {food:1},
     value: 6,
     buildcost: {},
     text: 'wheat ⮕ 2 money (max 4)',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (r)=>(r=='wheat'));
         if (res.wheat>4) throw "Too much wheat";
         if (!res.wheat) throw "Must have wheat";
         addResources(player,{money:res.wheat*2});
     }
    },

    {name: 'Leather Industry',
     number: 'S021',
     symbols: ['🏭'],
     entry: {food:2},
     value: 8,
     buildcost: {},
     text: '3 leather + 14 money ⮕ 30 money (once)',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (r)=>(r=='leather'||r=='money'));
         if (res.leather!=3 || res.money!=14) throw "Wrong resources";
         addResources(player, {money:30});
     }
    },

    {name: 'Iron/Coal Mine',
     number: 'S006',
     symbols: ['🔨'],
     entry: {food:1},
     value: 6,
     buildcost: {},
     text: '2 iron + 1 coal',
     action: async (player) => { addResources(player,{iron:2,coal:1})}
    },

    {name: 'Labour Exchange',
     number: 'S001',
     symbols: ['🏛','🎣'],
     entry: {},
     value: 6,
     buildcost: {},
     text: 'fish per 🎣, coal per 🔨',
     action: async (player) => {
         addResources(player, {fish: countSymbol(player,'🎣'), coal:countSymbol(player,'🔨')});
     }
    },

    {name: 'Diner',
     number: 'S016',
     symbols: ['🎣','🏢'],
     entry: {food:1},
     value: 6,
     buildcost: {},
     text: 'wood bread lox ⮕ 8 money (max 3x)',
     action: async (player, ui) => {
         const r = await ui.pickPlayerResources(player, (r)=>(r=='bread'||r=='lox'||r=='wood'));
         if (r.bread!=r.lox || r.bread!=r.wood) throw "Mismatched ingredients";
         if (!r.bread) throw "No resourced!";
         if (r.bread > 3) throw "Too much food (max 3)";
         addResources(player,{money:8*r.bread});
     }
    },

    {name: 'Zoo',
     number: 'S035',
     symbols: ['🎣','🏛'],
     entry: {money:1},
     value: 8,
     buildcost: {},
     text: '1 money for every 3 fish or cattle you have',
     action: async (player) => {
         const f = Math.floor( (player.resources.fish || 0) / 3 );
         const c = Math.floor( (player.resources.cattle || 0) / 3 );
         addResources(player, {money: f+c});
     }
    },

    {name: 'Coal Trader',
     number: 'S018',
     symbols: ['🏢'],
     entry: {food:1},
     value: 4,
     buildcost: {},
     text: '🍪 ⮕ charcoal (1x), 2🍪 ⮕ coal (5x)',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (r)=>resources[r].food);
         let food = countPile(res,'food');
         if (food>13) throw "Too much food: Only 11 can be used";
         if (food>11) food=11;
         addResources(player,{coal:Math.floor(food/2),charcoal:food%2});
     }
    },

    {name: 'Town Square',
     number: 'S027',
     symbols: [],
     entry: {money:1},
     value: 6,
     buildcost: {},
     text: 'nonsteel adv per 🏠',
     action: async (player, ui) => {
         const wanted = countSymbol(player,'🏠');
         const opts = ['charcoal','brick','lox','bread','meat','leather','coke'];
         const goods = await ui.pickResources(opts, wanted);
         if (Object.values(goods).reduce((a,b)=>a+b,0)!=Math.min(wanted,opts.length)) throw "Wrong number of goods";
         addResources(player, goods);
     }
    },

    {name: 'Fish Restaurant',
     number: 'S008',
     symbols: ['🏢','🎣'],
     entry: {food:1},
     value: 6,
     buildcost: {},
     text: 'lox ⮕ 3 money',
     action: async (player, ui) => {
         const res = await ui.pickPlayerResources(player, (r)=>r=='lox');
         if (!res.lox) throw "No Lox";
         addResources(player,{money:3*res.lox});
     }
    },

    {name: 'Harbor Watch',
     number: 'S014',
     symbols: ['🏛'],
     entry: {food:1},
     value: 6,
     buildcost: {},
     text: 'Use in use building, pay player 1 money',
     action: async (player, ui, game) => {
         const building = await ui.pickBuilding();
         if (game.disks_by_building[building.number] === undefined) throw "Building must be occupied by an opponent";
         subtractResources(player,{money:1});
         addResources(game.players[game.disks_by_building[building.number]],{money:1});
         delete game.disks_by_building[building.number];
         ui.update();
         await utilizeBuilding(player,game,ui,building);
     }
    },
]
    
for (let b of starting_buildings) buildings_by_number[b.number] = b;
for (let b of special_buildings) buildings_by_number[b.number] = b;
for (let b of buildings) buildings_by_number[b.number] = b;


export function initBuildings(game) {
    const nplayers = game.players.length;
    game.townBuildings = starting_buildings.map((b)=>b.number);
    let deck = buildings. filter((b)=>(nplayers>=b.minplayers)). map((b)=>b.number);
    deck = shuffle(deck);
    let n = Math.floor(deck.length/3)
    let decks = [deck.slice(0,n), deck.slice(n,2*n), deck.slice(2*n)];
    for (let deck of decks) {
        deck.sort((a,b)=>(a-b));
    }
    game.buildingPlans = decks;
    game.wharfModernization = {};
    game.specialBuildings = shuffle(special_buildings.map((b)=>b.number));
}
