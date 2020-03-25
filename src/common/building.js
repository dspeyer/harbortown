import {gameState, ui, shuffle, safeCopy, subtractResources,
        addResources, countSymbol, checkDecks, countPile, utilizeBuilding } from './gamestate.js';
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
                    if (countPile(res,'energy') < 3) throw "Not enough energy";

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

function capOfShips(ships,n) {
    let rem = n;
    let cap = 0;
    for (let t of ['steel','iron','wood']) {
        for (let s of ships) {
            if (s[0]==t) {
                cap += gameState.shipStats[t].ship;
                rem -= 1;
            }
            if (rem==0) {
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
     cost: 10,
     buildcost: {'wood':2, 'brick':2},
     minplayers: 1,
     text: '3 ϟ + boatload ⮕ value',
     action: async (player) => {
         const enres = await ui.pickPlayerResources(player, (x)=>{return resources[x].energy;}, "Choose energy to load ships with 3/ship");
         const energy = countPile(enres,'energy');
         const nship = Math.floor(energy/3);
         const cap = capOfShips(player.ships, nship);
         const sres = await ui.pickPlayerResources(player, (x)=>{return resources[x].value>0;}, "Choose goods to ship (max "+cap+")");
         if (countPile(sres,'value',(x)=>{return 1;}) > cap) throw "Too many goods";
         const v = countPile(sres,'value');
         addResources(player,{money:v});
     }
    },
    
    {name: 'Grocery Market',
     number: 19,
     symbols: ['🏢'],
     entry: {'money': 1},
     cost: 10,
     buildcost: {'wood':1, 'brick':1},
     minplayers: 3,
     text: 'Gain 1 of each food-related resource',
     action: async (player) => { addResources(player,{cattle:1,fish:1,wheat:1,meat:1,lox:1,bread:1}); }
    },
    
    {name: 'Bridge',
     number: 27,
     symbols: [],
     entry: {'money':2},
     cost: 16,
     buildcost: {iron: 3},
     minplayers: 3,
     text: 'Sell adv for 1, basic for 1/3',
     action: async (player) => {
         const toSell = await ui.pickPlayerResources(player, (res)=>{return res!='money' && res!='loans';});
         const adv = countPile(toSell,'advanced');
         const basic = countPile(toSell,'value',(x)=>{return 1;}) - adv;
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
     minplayers: 1,
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
     minplayers: 2,
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
     minplayers: 3,
     text: '+2 each unavailable town resource',
     action: async (player) => {
         for (let res in gameState.townResources) {
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
     cost: 10,
     buildcost: {wood:1,clay:1},
     minplayers: 1,
     text: 'Take 3 + 🎣 fish',
     action: async (player) => { addResources(player,{fish:3+countSymbol(player,'🎣')}); }
    },
    
    {name: 'Town Hall',
     number: 28,
     symbols: ['🏛'],
     entry: {unobtainium:1},
     cost: 30, //TODO: 6
     buildcost: {wood:4,brick:3},
     minplayers: 2,
     text: 'Endgame bonus: 4/🏛 2/🏠',
     engameBonus: (player) => { return countSymbol(player,'🏛')*4+countSymbol(player,'🏠')*2; },
    },
    
    {name: 'Tannery',
     number: 20,
     symbols: ['🏠'],
     entry: {},
     cost: 12,
     buildcost: {wood:1,brick:1},
     minplayers: 1,
     text: 'hides ⮕ leather + money (max 4)',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='hides';});
         const n = res.hides;
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
     minplayers: 1,
     text: '2 wheat + 1 ϟ ⮕ 2 bread + 1 money',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='wheat' || resources[res].energy>0;});
         const energy = countPile(res,'energy')
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
     minplayers: 1,
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
     minplayers: 3,
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
     minplayers: 1,
     text: 'fish + any ϟ ⮕ lox 1/2 money (max 6)',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='fish' || resources[res].energy>0;});
         if ( ! (res.fish > 0) ) throw "fish required";
         const energytokens = countPile(res,'energy',(x)=>{return 1;});
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
     minplayers: 2,
     text: 'Endgame bonus: 2/🏢 3/🏭',
     engameBonus: (player) => { return countSymbol(player,'🏢')*2+countSymbol(player,'🏭')*3; },
    },

    {name: 'Steel Mill',
     number: 23,
     symbols: ['🏭'],
     entry: {money:2},
     cost: 22,
     buildcost: {brick:4,iron:2},
     minplayers: 1,
     text: '5 ϟ + 1 iron ⮕ steel',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='iron' || resources[res].energy>0;});
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
     cost: 12,
     buildcost: {wood:4,clay:1},
     minplayers: 3,
     text: '4 any ⮕ steel and/or 1 any ⮕ charcoal / brick / leather',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (res)=>{return res!='money' && res!='loans';});
         const cnt = countPile(res,'value',(x)=>{return 1;});
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
     cost: 10,
     buildcost: {wood:1,clay:3},
     minplayers: 1,
     text: '+3 coal (4 if 🔨)',
     action: async (player) => { addResources(player,{coal:3+(countSymbol(player,'🔨')>0)}); }
    },

    {name: 'Sawmill',
     number: 2,
     symbols: ['🏭'],
     entry: {},
     cost: 14,
     buildcost: {clay:1,iron:1},
     minplayers: 3,
     text: 'Build one building, save one wood',
     action: async (player,self) => { await building_firm.action(player, self, "Choose building to saw"); }
    },
    
    {name: 'Clay Mound',
     number: 10,
     symbols: [],
     entry: {food:1},
     cost: 2,
     buildcost: {unobtainium:1},
     minplayers: 1,
     text: '3+🔨 clay',
     action: async (player) => { addResources(player,{clay:3+countSymbol(player,'🔨')}); }
    },

    {name: 'Abbatoir',
     number: 9,
     symbols: ['🏠'],
     entry: {money:2},
     cost: 8,
     buildcost: {wood:1,clay:1,iron:1},
     minplayers: 1,
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
     minplayers: 1,
     text: '3 iron (4 if 6ϟ)',
     action: async (player) => { 
         const res = await ui.pickPlayerResources(player, (res)=>{return resources[res].energy>0;});
         const energy = countPile(res, 'energy');
         addResources(player,{iron:3+(energy>=6)});
     }
    },

    {name: 'Brickworks',
     number: 14,
     symbols: ['🏭'],
     entry: {food:1},
     cost: 14,
     buildcost: {wood:2,clay:1,iron:1},
     minplayers: 1,
     text: 'clay + 1/2 ϟ ⮕ brick + 1/2 money',
     action: async (player) => { 
         const res = await ui.pickPlayerResources(player, (res)=>{return res=='clay' || res=='brick' || resources[res].energy>0;});
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
     cost: 6,
     buildcost: {wood:2},
     minplayers: 1,
     text: '2+🏠 different standard goods',
     action: async (player) => {
         const wanted = 2+countSymbol(player,'🏠');
         const goods = await ui.pickResources(['wood','clay','iron','fish','wheat','cattle','hides','coal'], wanted);
         if (Object.values(goods).reduce((a,b)=>a+b,0)!=wanted) throw "Wrong number of goods";
         addResources(player, goods);
         const nsb = await ui.pickNextSpecialBuilding();
         if (nsb != gameState.specialBuildings[0]) {
             const tmp = gameState.specialBuildings[0];
             gameState.specialBuildings[0] = gameState.specialBuildings[1];
             gameState.specialBuildings[1] = tmp;
         }
     }
    },

    {name: 'Local Court',
     number: 15,
     symbols: ['🏛'],
     entry: {},
     cost: 16,
     buildcost: {wood:3,clay:2},
     minplayers: 3,
     text: 'Forgive 1/1.5/2 loans if you have 1/2/3+',
     action: async (player) => { } //TODO: loans
    },

    {name: 'Arts Center',
     number: 11,
     symbols: ['🎣','🏛'],
     entry: {food:1},
     cost: 10,
     buildcost: {wood:1,clay:2},
     minplayers: 4,
     text: '€4 for other player in your buildings',
     action: async (player) => {
         let cnt=0;
         for (let b of player.buildings) {
             if (b in gameState.disks_by_building) {
                 const pid = gameState.disks_by_building[b];
                 if (gameState.players[pid] != player) {
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
     cost: 10,
     buildcost: {wood:1, brick:2, iron:2},
     minplayers: 4,
     text: 'Endgame €4 / ⛴',
     endgameBonus: async (player) => { return player.ships.length * 4; } 
    },

    {name: 'Storehouse',
     number: 24,
     symbols: ['🔨','🏢'],
     entry: {unobtanium: 1},
     cost: 4,
     buildcost: {wood:2,brick:2},
     minplayers: 4,
     text: 'Endgame: 1/2 per common 1 per advanced',
     action: async (player) => { return countPile(player.resources, 'advanced', (a)=>{return a?1:0.5;}); } //TODO: loans
    },
]

const special_buildings = [
    {name: 'Plant Nursery',
     number: 's011',
     symbols: ['🔨','🏠'],
     entry: {food:1},
     cost: 6,
     buildcost: {},
     text: '3 money + 4 wood',
     action: async (player) => { addResources(player,{money:3,wood:4}); }
    },

    {name: 'Baguette Shop',
     number: 'S003',
     symbols: ['🏢'],
     entry: {food:1},
     cost: 4,
     buildcost: {},
     text: 'bread + meat ⮕ 6 money (4x)',
     action: async (player) => {
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
     cost: 8,
     buildcost: {},
     text: 'iron + 15 ϟ ⮕ 2 steel (once)',
     action: async (player) => {
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
     cost: 6,
     buildcost: {},
     text: 'wheat ⮕ 2 money (max 4)',
     action: async (player) => {
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
     cost: 8,
     buildcost: {},
     text: '3 leather + 14 money ⮕ 30 money (once)',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (r)=>(r=='leather'||r=='money'));
         if (res.leather!=3 || res.money!=14) throw "Wrong resources";
         addResources(player, {money:30});
     }
    },

    {name: 'Iron/Coal Mine',
     number: 'S006',
     symbols: ['🔨'],
     entry: {food:1},
     cost: 6,
     buildcost: {},
     text: '2 iron + 1 coal',
     action: async (player) => { addResources(player,{iron:2,coal:1})}
    },

    {name: 'Labour Exchange',
     number: 'S001',
     symbols: ['🏛','🎣'],
     entry: {},
     cost: 6,
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
     cost: 6,
     buildcost: {},
     text: 'wood bread lox ⮕ 8 money (max 3x)',
     action: async (player) => {
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
     cost: 8,
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
     cost: 4,
     buildcost: {},
     text: '🍪 ⮕ charcoal (1x), 2🍪 ⮕ coal (5x)',
     action: async (player) => {
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
     cost: 6,
     buildcost: {},
     text: 'nonsteel adv per 🏠',
     action: async (player) => {
         const wanted = countSymbol(player,'🏠');
         const goods = await ui.pickResources(['charcoal','brick','lox','bread','meat','leather','coke'], wanted);
         if (Object.values(goods).reduce((a,b)=>a+b,0)!=wanted) throw "Wrong number of goods";
         addResources(player, goods);
     }
    },

    {name: 'Fish Restaurant',
     number: 'S008',
     symbols: ['🏢','🎣'],
     entry: {food:1},
     cost: 6,
     buildcost: {},
     text: 'lox ⮕ 3 money',
     action: async (player) => {
         const res = await ui.pickPlayerResources(player, (r)=>r=='lox');
         if (!res.lox) throw "No Lox";
         addResources(player,{money:3*res.lox});
     }
    },

    {name: 'Harbor Watch',
     number: 'S014',
     symbols: ['🏛'],
     entry: {food:1},
     cost: 6,
     buildcost: {},
     text: 'Use in use building, pay player 1 money',
     action: async (player) => {
         const building = await ui.pickBuilding();
         if (gameState.disks_by_building[building.number] === undefined) throw "Building must be occupied by an opponent";
         subtractResources(player,{money:1});
         addResources(gameState.players[gameState.disks_by_building[building.number]],{money:1});
         delete gameState.disks_by_building[building.number];
         ui.update();
         await utilizeBuilding(building);
     }
    },
]
    
export const buildings_by_number = {};
for (let b of starting_buildings) buildings_by_number[b.number] = b;
for (let b of special_buildings) buildings_by_number[b.number] = b;
for (let b of buildings) buildings_by_number[b.number] = b;


export function initBuildings(nplayers) {
    gameState.townBuildings = starting_buildings.map((b)=>{return b.number});
    let deck = buildings.filter((b)=>{return nplayers>=b.minplayers;}).map((b)=>{return b.number});
    deck = shuffle(deck);
    let n = Math.floor(deck.length/3)
    let decks = [deck.slice(0,n), deck.slice(n,2*n), deck.slice(2*n)];
    for (let deck of decks) {
        deck.sort((a,b)=>{return a-b;});
    }
    gameState.buildingPlans = decks;
    gameState.wharfModernization = {};
    gameState.specialBuildings = shuffle(special_buildings.map((b)=>b.number));
}
