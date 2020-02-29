import {gameState, ui, shuffle, safeCopy, subtractResources, addResources, countSymbol, checkDecks} from './gamestate.js';
import {resources} from './data.js';

const building_firm = {name: 'Building Firm',
                       symbols: ['🏠','🔨'],
                       text: 'Build 1 building',
                       action: async (player, self, msg) => {
                           const plan = await ui.pickBuildingPlan(msg || 'Choose a building to build', player.resources);
                           let idx;
                           if ( (idx = checkDecks(plan.number)) != -1 ) {
                               gameState.buildingPlans[idx].shift();
                           } else {
                               throw "Not buildable";
                           }
                           let buildcost = safeCopy(plan.buildcost);
                           if (self.name=='Sawmill' && buildcost.wood > 0) { buildcost.wood -= 1; }
                           subtractResources(player, buildcost);
                           player.buildings.push(plan.number);
                       }
                      };

const wharf = { getname(){ return this.modernized ? 'Modernized Wharf' : 'Wharf'; },
                symbols: ['🏭'],
                entry: {food:2},
                cost: 14,
                buildcost: {wood:2,clay:2,iron:2},
                getmodernized(){ return (this.number in gameState.wharfModernization); },
                setmodernized(x){ gameState.wharfModernization[this.number] = x; },
                gettext(){ return this.modernized ? 'Build a ship' : 'Build wooden ship, or metal w/ modernization'; },
                
                action: async (player, self) => {
                    let res = await ui.pickPlayerResources(player, (res)=>{return res=='wood' || res=='iron' || res=='steel' ||
                                                                                  (!self.modernized && res=='brick') ||
                                                                                  resources[res].energy > 0;});
                    if (res.brick > 1) throw "Only one brick needed to modernize";
                    if ( ! self.modernized && res.brick>0) {
                        self.modernized = true;
                    }
                    if ((res.steel>0 || res.iron>0) && ! self.modernized) {
                        throw "Only modernized wharf can use metal";
                    }
                    
                    let ship_type;
                    if (res.steel==3) ship_type='luxury';
                    else if (res.steel==2) ship_type='steel';
                    else if ( (res.steel||0) + (res.iron||0) == 4 ) ship_type='iron';
                    else if (res.wood>=5) { res.wood -=5; ship_type='wood'; }
                    else throw "Cannot deduce intended ship type";

                    //TODO: unify this?
                    let energy = 0;
                    for (let r in res) {
                        if (resources[r].energy > 0) {
                            energy += resources[r].energy * res[r];
                        }
                    }
                    if (energy < 3) throw "Not enough energy";

                    if (gameState.ships[ship_type].length == 0) throw "No "+ship_type+" ships available to build";
                    player.ships.push([ship_type,gameState.ships[ship_type].shift()]);
                }
              };



export const starting_buildings = [
    { ...building_firm,
      entry: {},
      cost: 4,
      number: 'b1'},
    { ...building_firm,
      entry: {food: 1},
      cost: 6,
      number: 'b2'},
    { name: 'Construction Firm',
      symbols: ['🔨','🏭'],
      text: 'Build 1 or 2 buildings',
      entry: {food: 2},
      cost: 8,
      number: 'b3',
      action: async (player,self) => {
          await building_firm.action(player,self);
          ui.update();
          try {
              await building_firm.action(player,self,'Choose a second building to build');
          } catch(e) {
              if (e!='canceled' && e!='nothing_to_choose') {
                  throw e;
              }
          }
      }},
];

export const buildings = [
    {name: 'Shipping Line',
     number: 18,
     symbols: ['🎣', '🏢'],
     entry: {food: 2},
     cost: 10,
     buildcost: {'wood':2, 'brick':2},
     text: '3 ϟ + boatload ⮕ value',
     action: async (player) => { throw 'TODO'; }
    },
    
    {name: 'Grocery Market',
     number: 19,
     symbols: ['🏢'],
     entry: {'money': 1},
     cost: 10,
     buildcost: {'wood':1, 'brick':1},
     text: 'Gain 1 of each food-related resource',
     action: async (player) => { addResources(player,{cattle:1,fish:1,wheat:1,meat:1,lox:1,bread:1}); }
    },
    
    {name: 'Bridge',
     number: 27,
     symbols: [],
     entry: {'money':2},
     cost: 16,
     buildcost: {iron: 3},
     text: 'Sell adv for 1, basic for 1/3',
     action: async (player) => {
         const toSell = await ui.pickPlayerResources(player, (res)=>{return res!='money';});
         let basic=0, adv=0;
         for (let r in toSell) {
             if (resources[r].advanced){
                 adv += toSell[r];
             } else {
                 basic += toSell[r];
             }
         }
         if (basic%3 != 0) {
             //TODO: warning
         }
         addResources(player,{ money: adv+Math.floor(basic/3) });
     }
    },
    
    {name: 'Cokery',
     number: 25,
     symbols: ['🏭'],
     entry: {money: 1},
     cost: 18,
     buildcost: {brick:2, iron:2},
     text: 'coal ⮕ coke + money',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='coal'});
         const n = res.coal;
         addResources(player,{coke:n,money:n});
     }
    },
    
    {name: 'Church',
     number: 30,
     symbols: ['🏛'],
     entry: {},
     cost: 26,
     buildcost: {wood:5, brick:3, iron:1},
     text: '5 loaves 2 fish ⮕ 10 loaves 5 fish once',
     action: async (player) => {
         player.subtractResources({bread:5,fish:2});
         addResources(player,{bread:10,fish:5});
     }
    },
    
    {name: 'Black Market',
     number: 13,
     symbols: [],
     entry: {food:1},
     cost: 2,
     buildcost: {unobtainium:1},
     text: '+2 each unavailable town resource',
     action: async (player) => {
         for (let res of gameState.townResources) {
             if (gameState.townResources[res]==0) {
                 addResources(player,{ [res]:2 });
             }
         }
     }
    },
    
    {name: 'Hardware Store',
     number: 6,
     symbols: ['🔨','🎣','🏢'],
     entry: {food:1},
     cost: 8,
     buildcost: {wood:3,clay:1},
     text: '+1 wood brick iron',
     action: async (player) => { addResources(player,{wood:1,brick:1,iron:1});}
    },

    {...wharf,
     get name() { return this.getname(); },
     get text() { return this.gettext(); },
     get modernized() { return this.getmodernized(); },
     set modernized(x) { return this.setmodernized(x); },
     number: 12},
    {...wharf,
     get name() { return this.getname(); },
     get text() { return this.gettext(); },
     get modernized() { return this.getmodernized(); },
     set modernized(x) { return this.setmodernized(x); },
     number: 17},
    
    {name: 'Fishery',
     number: 3,
     symbols: ['🎣','🏠'],
     entry: {},
     cost: 10,
     buildcost: {wood:1,clay:1},
     text: 'Take 3 + 🎣 fish',
     action: async (player) => { addResources(player,{fish:3+countSymbol(player,'🎣')}); }
    },
    
    {name: 'Town Hall',
     number: 28,
     symbols: ['🏛'],
     entry: {unobtainium:1},
     cost: 30, //TODO: 6
     buildcost: {wood:4,brick:3},
     text: 'Endgame bonus: 4/🏛 2/🏠',
     engameBonus: (player) => { return countSymbol(player,'🏛')*4+countSymbol(player,'🏠')*2; },
    },
    
    {name: 'Tannery',
     number: 20,
     symbols: ['🏠'],
     entry: {},
     cost: 12,
     buildcost: {wood:1,brick:1},
     text: 'hides ⮕ leather + money (max 4)',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='hides';});
         let n = res.hides;
         if (n > 4) throw "Too many hides";
         addResources(player,{leather:n,money:n});
     }
    },

    {name: 'Bakehouse',
     number: 5,
     symbols: ['🏠'],
     entry: {food:1},
     cost: 8,
     buildcost: {clay:2},
     text: '2 wheat + 1 ϟ ⮕ 2 bread + 1 money',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='wheat' || resources[res].energy>0;});
         let energy = 0;
         for (let r in res) {
             if (resources[r].energy > 0) {
                 energy += resources[r].energy * res[r];
             }
         }
         if (2*energy < res.wheat) {
             throw "Not enough energy for that wheat";
         }
         addResources(player,{bread:res.wheat, money:Math.floor(res.wheat/2)});
     }
    },

    {name: 'Charcoal Kiln',
     number: 7,
     symbols: ['🏠'],
     entry: {},
     cost: 8,
     buildcost: {clay:1},
     text: 'wood ⮕ charcoal',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='wood';});
         addResources(player,{charcoal:res.wood});
     }
    },

    {name: 'Joinery',
     number: 4,
     symbols: ['🔨','🏠'],
     entry: {food:1},
     cost: 8,
     buildcost: {wood:3},
     text: '1/2/3 wood ⮕ 5/6/7 money',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='wood';});
         addResources(player,{money:res.wood+4});
     }
    },

    {name: 'Smokehouse',
     number: 8,
     symbols: ['🎣','🏠'],
     entry: {food:2,money:1},
     cost: 6,
     buildcost: {wood:2,clay:1},
     text: 'fish + any ϟ ⮕ lox 1/2 money (max 6)',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='fish' || resources[res].energy>0;});
         if ( ! (res.fish > 0) ) throw "fish required";
         let energytokens = 0;
         for (let r in res) {
             if (resources[r].energy > 0) {
                 energytokens += res[r];
             }
         }
         if (energytokens == 0) throw "energy required";
         if (energytokens > 1) throw "too much energy: any at all will suffice";
         addResources(player,{lox:res.fish,money:Math.floor(res.fish/2)});
     }
    },

    {name: 'Bank',
     number: 29,
     symbols: ['🏢'],
     entry: {unobtainium:1},
     cost: 40,//TODO 16
     buildcost: {brick:4,steel:1},
     text: 'Endgame bonus: 2/🏢 3/🏭',
     engameBonus: (player) => { return countSymbol(player,'🏢')*2+countSymbol(player,'🏭')*3; },
    },

    {name: 'Steel Mill',
     number: 23,
     symbols: ['🏭'],
     entry: {money:2},
     cost: 22,
     buildcost: {brick:4,iron:2},
     text: '5 ϟ + 1 iron ⮕ steel',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='iron' || resources[res].energy>0;});
         let energy = 0;
         for (let r in res) {
             if (resources[r].energy > 0) {
                 energy += resources[r].energy * res[r];
             }
         }
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
     cost: 12,
     buildcost: {wood:4,clay:1},
     text: '4 any ⮕ steel and/or 1 any ⮕ charcoal / brick / leather',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return true;});
         let cnt = 0;
         for (let r in res) {
             cnt += res[r];
         }
         if (cnt!=1 && cnt!=4 && cnt!=5) throw "Must select exactly one, four or five resources";
         if (cnt==1 || cnt==5) {
             const goods = await ui.pickResources(['charcoal','brick','leather'],1);
             addResources(player,{[Object.keys(goods)[0]]:1});
         }
         addResources(player,{steel:1});
     }
    },

    {name: 'Colliery',
     number: 16,
     symbols: ['🏭'],
     entry: {food:2},
     cost: 10,
     buildcost: {wood:1,clay:3},
     text: '+3 coal (4 if 🔨)',
     action: async (player) => { addResources(player,{coal:3+(countSymbol(player,'🔨')>0)}); }
    },

    {name: 'Sawmill',
     number: 2,
     symbols: ['🏭'],
     entry: {},
     cost: 14,
     buildcost: {clay:1,iron:1},
     text: 'Build one building, save one wood',
     action: async (player,self) => { await building_firm.action(player, self, "Choose building to saw"); }
    },
    
    {name: 'Clay Mound',
     number: 10,
     symbols: [],
     entry: {food:1},
     cost: 2,
     buildcost: {unobtainium:1},
     text: '3+🔨 clay',
     action: async (player) => { addResources(player,{clay:3+countSymbol(player,'🔨')}); }
    },

    {name: 'Abbatoir',
     number: 9,
     symbols: ['🏠'],
     entry: {money:2},
     cost: 8,
     buildcost: {wood:1,clay:1,iron:1},
     text: 'cattle ⮕ meat + 1/2 hides',
     action: async (player) => { 
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='cattle';});
         addResources(player,{meat:res.cattle, hides:Math.floor(res.cattle/2)});
     }
    },

    {name: 'Ironworks',
     number: 22,
     symbols: ['🔨','🏭'],
     entry: {food:3,money:1},
     cost: 12,
     buildcost: {wood:3,brick:2},
     text: '3 iron (4 if 6ϟ)',
     action: async (player) => { 
         const res = await ui.pickPlayerResources(player, (res)=>{return resources[res].energy>0;});
         let energy = 0;
         for (let r in res) {
             if (resources[r].energy > 0) {
                 energy += resources[r].energy * res[r];
             }
         }
         addResources(player,{iron:3+(energy>6)});
     }
    },

    {name: 'Brickworks',
     number: 14,
     symbols: ['🏭'],
     entry: {food:1},
     cost: 14,
     buildcost: {wood:2,clay:1,iron:1},
     text: 'clay + 1/2 ϟ ⮕ brick + 1/2 money',
     action: async (player) => { 
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='clay' || res=='brick' || resources[res].energy>0;});
         let energy = 0;
         for (let r in res) {
             if (resources[r].energy > 0) {
                 energy += resources[r].energy * res[r];
             }
         }
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
     cost: 6,
     buildcost: {wood:2},
     text: '2+🏠 different standard goods',
     action: async (player) => {
         const goods = await ui.pickResources(['wood','clay','iron','fish','wheat','cattle','hides','coal'],
                                              2+countSymbol(player,'🏠')
                                             );
         for( let good in goods ) addResources(player,{[good]:1});
     }
    },

    {name: 'Local Court',
     number: 15,
     symbols: ['🏛'],
     entry: {},
     cost: 16,
     buildcost: {wood:3,clay:2},
     text: 'Forgive 1/1.5/2 loans if you have 1/2/3+',
     action: async (player) => { } //TODO: loans
    },

]

export const buildings_by_number = {};
for (let b of starting_buildings) buildings_by_number[b.number] = b;
for (let b of buildings) buildings_by_number[b.number] = b;


export function initBuildings(nplayers /*TODO: care*/) {
    gameState.townBuildings = starting_buildings.map((b)=>{return b.number});
    let deck = buildings.map((b)=>{return b.number});
    let n = Math.floor(deck.length/3)
    let decks = [deck.slice(0,n), deck.slice(n,2*n), deck.slice(2*n)];
    for (let deck of decks) {
        deck.sort((a,b)=>{return a-b;});
    }
    gameState.buildingPlans = decks;
    gameState.wharfModernization = {};
}
