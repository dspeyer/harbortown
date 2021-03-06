import React, { useEffect } from 'react';
import './dialogs.css';
import { restore, addResources, subtractResources, countPile, countSymbol, buildings_by_number } from '../common/utils.js';
import { gameState, ui } from './state.js';
import { ResourceStack, ResourceTile } from './resources.js';
import { annotate_log } from './net.js';
import { Building } from './buildingui.js';
import { Ship } from './ships.js';
import { ship_feeds, ship_capacities, ship_prices, sym_names } from '../common/data.js';
import { special_buildings } from '../common/buildings.js';
import { safeCopy, calcScore } from '../common/utils.js';
import { holders, showDialog, allInstructions, clearAllClickTargets, closeSelf } from './interaction.js';

export async function pickTownResource() {
    allInstructions[0].set('Take one pile of resources from the town');
    if (ui.setTab) ui.setTab('town');
    for (let res in gameState.townResources) {
        if (gameState.townResources[res] > 0) {
            holders.townResources[res].show();
        }
    }
    const wfu = new Promise((resolve,reject) => { ui.resolve = resolve; ui.reject = reject;} );
    const choice = await wfu; // invoked by the onClick of a ClickTarget
    clearAllClickTargets();
    ui.resolve = undefined;
    annotate_log(choice);
    return choice;
}

let allMessages = {};

class MessageDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state={opacity:1};
        this.dom = React.createRef();
        if ( ! props.lasting ) {
            this.timeout = window.setTimeout(this.tick.bind(this), 5000);
        }
        this.id = Date.now();
        allMessages[this.id] = this;
    }
    render() {
        return (<div className="msgDialog" ref={this.dom} style={ {opacity: this.state.opacity,
                                                                   background: this.props.color || '#ddd' } }>
                  <div className="close" onClick={this.close.bind(this)}>×</div>
                  {this.props.msg}
                </div>);
    }
    tick(){
        if (this.props.lasting) return;
        this.setState({opacity: this.state.opacity-0.05});
        this.timeout = window.setTimeout(this.tick.bind(this), 100);        
        if (this.state.opacity<=0) this.close();
    }
    close(){
        delete allMessages[this.id];
        window.clearTimeout(this.timeout);
        closeSelf({target:this.dom.current});
    }
}

export function clearMessages() {
    for (let m of Object.values(allMessages)) {
        m.close();
    }
}

export function showError(msg, lasting) {
    showDialog(<MessageDialog msg={msg} color="#fa0" lasting={lasting} />);
}

export function showMessage(msg, lasting) {
    showDialog(<MessageDialog msg={msg} color="#ff7" lasting={lasting} />);
}

class PickResourcesDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state={x:(window.innerWidth-350)/2, y:window.innerHeight/10, grabbed:false, chosen:{}};
        this.clickTargets={};
        props.out.push(this);
    }

    incr(res) {
        let chosen = safeCopy(this.state.chosen);
        chosen[res] = (chosen[res] || 0) + 1;
        this.setState({chosen});
    }

    decr(res) {
        if (this.props.player && this.state.chosen[res] > 0) {
            let chosen = safeCopy(this.state.chosen);
            chosen[res] -= 1;
            this.setState({chosen});
            addResources(this.props.player, { [res]: 1 });
            ui.update();
            window.setTimeout(()=>{holders.playerResources[this.props.player.number][res].show();}, 15);
        }
    }

    toggleOffer(res) {
        let chosen = safeCopy(this.state.chosen);
        chosen[res] = ( ! chosen[res]) +0;
        this.setState({chosen});
    }

    auto(cb) {
        console.log('invoked auto with ',cb);
        addResources(this.props.player, this.state.chosen);
        let newState = cb(this.props.player.resources);
        console.log({newState});
        subtractResources(this.props.player, newState);
        this.setState({chosen:newState});
        ui.update();
    }
    
    onMove(ev) {
        if (!this.state.grabbed) return;
        if (ev.changedTouches) ev = ev.changedTouches[0];
        let dx = (ev.clientX - this.state.grabbed[0]) || 0;
        let dy = (ev.clientY - this.state.grabbed[1]) || 0;
        this.setState({x:this.state.x+dx, y:this.state.y+dy, grabbed:[ev.clientX,ev.clientY]});
    }
    
    okDisabled() {
        if (this.props.n) return Object.values(this.state.chosen).reduce((a,b)=>a+b,0) != this.props.n;
        if (this.props.req) return !this.full();
        return false;
    }

    full() {
        if (!this.props.req) return false;
        for (let k in this.props.req) {
            if (this.state.chosen[k] == this.props.req[k]) return true;
            if (countPile(this.state.chosen, k) >= this.props.req[k]) return true;
        }
        return false;
    }

    render(){
        let resourceElements=[];
        if (this.props.offers) {
            for (let i of this.props.offers) {
                resourceElements.push(<div className={'offer'+(this.state.chosen[i] ? ' chosen' : '')}
                                           onClick={this.toggleOffer.bind(this,i)}><ResourceTile type={i}/></div>);
            }
        } else {
            for (let i in this.state.chosen) {
                let v = this.state.chosen[i];
                if (v>0) resourceElements.push(
                    <div style={ {cursor:'pointer'} } onClick={this.decr.bind(this,i)}>
                      <ResourceStack type={i} number={v} key={i} holder={this.clickTargets} />
                    </div>
                );
            }
        }
        return (<div className={'pickResourcesDialog grabbed'+!!this.state.grabbed}
                     style={{top:this.state.y,left:this.state.x}}
                     onMouseDown={(ev)=>{this.setState({grabbed:[ev.clientX,ev.clientY]})}}
                     onTouchStart={(ev)=>{this.setState({grabbed:[ev.clientX,ev.clientY]})}}
                     onMouseUp={()=>{this.setState({grabbed:false})}}
                     onTouchEnd={()=>{this.setState({grabbed:false})}}
                     onMouseMove={this.onMove.bind(this)} 
                     onTouchMove={this.onMove.bind(this)} >
                  <h2>{this.props.msg}</h2>
                  <div className="prdstate">
                    { resourceElements }
                  </div>
                  { this.props.auto && <input type="button" value="Auto Select" onClick={this.auto.bind(this,this.props.auto)} /> }
                  { (!this.props.uncancelable) && <input type="button" value="Cancel" onClick={closeSelf} /> }
                  <input type="button" value="Done" onClick={closeSelf}
                         disabled={this.okDisabled()} />
                  <br/>{this.state.dbg}
                </div>);
    }
}

export async function pickResources(rl, n) {
    if (n < rl.length) {
        let dlobj=[];
        const msg = 'Pick '+n+' of the following resources';
        const dlelem = <PickResourcesDialog msg={msg} out={dlobj} offers={rl} n={n} />;
        const dl = showDialog(dlelem, dlobj);
        var resources = (await dl).chosen;
    } else {
        showMessage("No need to choose, you get all of them");
        var resources = Object.fromEntries( rl.map((i)=>[i,1]) );
    }
    annotate_log(resources);
    return resources;
}

let pickPlayerResourcesWaiting = [];
let pickPlayerResourcesLocked = false;

export async function pickPlayerResources(player, filter, opt_args) {
    if (!opt_args) opt_args={};
    let {msg, uncancelable, auto, req} = opt_args;
    
    if (pickPlayerResourcesLocked) {
        let p = new Promise((resolve) => { pickPlayerResourcesWaiting.push(resolve); });
        await p;
    }
    pickPlayerResourcesLocked = true;
    
    if (ui.setTab) ui.setTab(player);

    if (!msg) msg="Choose resources to send";
    if (auto=='all') {
        auto = (res) => Object.fromEntries(Object.entries(res).filter((x)=>filter(x[0])));
    }
    
    let dlobj=[];
    const dlelem = <PickResourcesDialog msg={msg} out={dlobj} player={player} uncancelable={uncancelable} auto={auto} req={req} />;
    const dl = showDialog(dlelem, dlobj);
    
    for (let r in player.resources) {
        if (player.resources[r]>0 && filter(r)) {
            holders.playerResources[player.number][r].show();
        }
    }
    ui.resolve = (res) => {
        if (dlobj[0].full()) return;
        subtractResources(player, {[res]:1} );
        dlobj[0].incr(res);
        ui.update();
    };
    

    try  {
        
        const picked = (await dl).chosen;
        clearAllClickTargets();
        annotate_log(picked);

        return picked;
        
    } finally {
        clearAllClickTargets();
        pickPlayerResourcesLocked = false;
        if (pickPlayerResourcesWaiting.length) {
            pickPlayerResourcesWaiting.shift()();
        }
    }
}

class PickSpecialBuildingDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state={choice:props.bs[0]};
        this.clickTargets={};
        props.out.push(this);
    }

    toggleOffer(b) {
        this.setState({choice:b});
    }

    render(){
        return (<div className="pickResourcesDialog">
                  <h2>Which Special Building Should Come Up Next?</h2>
                  <div className="prdstate">
                    {this.props.bs.map((bn)=>{
                        return <div className={bn==this.state.choice?'chosen':''} onClick={this.toggleOffer.bind(this,bn)} >
                                 <Building bn={bn}/>
                               </div>;
                    })
                    }
                  </div>
                  <input type="button" value="Cancel" onClick={closeSelf} />
                  <input type="button" value="Done" onClick={closeSelf} />
                </div>);
    }
}

export async function pickNextSpecialBuilding() {
    let dlobj=[];
    const dlelem = <PickSpecialBuildingDialog bs={gameState.specialBuildings.slice(0,2)} out={dlobj} />;
    const ans = await showDialog(dlelem, dlobj);
    annotate_log(ans.choice);
    return ans.choice;
}


export async function pickBuilding() {
    allInstructions[0].set('Choose an existing building');
    for (let b of gameState.townBuildings) {
        holders.buildings[b].setState({active:true});
    }
    for (let p of gameState.players) {
        for (let b of p.buildings) {
            holders.buildings[b].show();
        }
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return buildings_by_number[bn];
}

function res_gte(a,b) {
    if ((b.clay && b.brick) || (b.iron && b.steel)) throw "TODO: handle this case";
    for (let r in b) {
        if (a[r]>=b[r]) continue;
        if (r=='clay' && (a.clay||0)+(a.brick||0) >= b.clay) continue;
        if (r=='iron' && (a.iron||0)+(a.steel||0) >= b.iron) continue;
        return false;
    }
    return true;
}

export async function pickBuildingPlan(msg, {resources, for_buy, pausable}) {
    if (ui.setTab) ui.setTab('bps');
    allInstructions[0].set(msg, pausable);
    let shown = false;
    for (let deck of gameState.buildingPlans) {
        if (deck.length) {
            let b = buildings_by_number[deck[0]];
            if ( !resources ||
                 (for_buy && resources.money>=(b.price||b.value)) ||
                 (!for_buy && res_gte(resources, b.buildcost))) {
                holders.buildings[deck[0]].show(for_buy && b.price);
                shown = true;
            }
        }
    }
    if (for_buy) {
        for (let bi of gameState.townBuildings) {
            let b = buildings_by_number[bi];
            if (resources.money>=(b.price||b.value)) {
                holders.buildings[bi].show(for_buy && b.price);
                shown = true;
            }
        }
        for (let m in gameState.ships) {
            if (gameState.ships[m].length && resources.money>=ship_prices[m]) {
                holders.miniships[m].show(ship_prices[m]);
                shown = true;
            }
        }
    }
    if (!shown && !pausable) {
        clearAllClickTargets();
        throw "Nothing you can afford";
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return bn;
}

export async function pickPlayerBuilding(msg, player) {
    allInstructions[0].set(msg);
    if (ui.setTab) ui.setTab(player);
    for (let b of player.buildings) {
        holders.buildings[b].show();
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return buildings_by_number[bn];
}    

export async function pickShip(player, modernized) {
    let out;
    let p = showDialog(
        <div className="pickShipDialog">
          <h2>Which Ship Would You Like to Build?</h2>
          {Object.entries(gameState.ships).filter((x)=>x[1].length).map(
              (st)=> (
                  <a className="dlgShipHolder" onClick={(ev)=>{out=st[0];closeSelf(ev);}}>
                    <Ship ship={[st[0],st[1][0]]} />
                      { ({wood:5,iron:4,steel:2,luxury:3})[st[0]]}
                      {st[0]=='luxury' ? 'steel' : st[0]}
                    +3ϟ
                    {st[0]!='wood' && !modernized && <span>+1brick</span>}
                  {st[0]=='iron' && !(player.resources.iron>=4) && player.resources.steel>0 && <p><i>Would use<br/> steel as iron</i></p>}
                  </a> 
              ))}
          <hr/>
          <input type="button" value="Cancel" onClick={closeSelf} />
        </div>,
        [{state:0}]);
    await p;
    annotate_log(out);
    return out;
}

export function showScore() {
    const syms = ['🔨','🎣','🏠','🏢','🏭','🏛'];
    showDialog(
        <div className="score">
          <table>
            <tr>
              <th rowspan="2">Player</th>
              <th colspan="5" className="upper">Points</th>
              <th rowspan="2">Total<br/>Score</th>
              <th colspan="2" className="upper usr">Unshipped</th>
              <th colspan={syms.length} className="upper syms">Symbols</th>
              <th colspan="2" className="upper shipping">Ships</th>
            </tr>
            <tr>
              <th title="Money">€</th>
              <th title="Buildings">🏠</th>
              <th title="Ships">⛴</th>
              <th title="Bonuses">B</th>
              <th title="Loans">L</th>
              <th className="usr" title="Shipping value of resources">Res</th>
              <th className="usr" title="Added to score">Sum</th>
              {syms.map((s)=>{
                  return <th className="syms">{s}</th>;
              })}
              <th className="shipping" title="Feed per turn">🍪</th>
              <th className="shipping" title="Goods shippable">⛴</th>
            </tr>
            {gameState.players.map((p)=>{
                let score = calcScore(p);
                let usr = countPile(p.resources,'value');
                return (<tr>
                          <th>{p.name}</th>
                          <td>{score.money}</td>
                          <td>{score.buildings}</td>
                          <td>{score.ships}</td>
                          <td>{score.bonus}</td>
                          <td>{score.loans}</td>
                          <td>{score.total}</td>
                          <td className="usr">{usr}</td>
                          <td className="usr">{usr+score.total}</td>
                          {syms.map((s)=>{ return (<td className="syms">{countSymbol(p,s)}</td>);})}
                          <td className="shipping">
                            { p.ships. map((x)=>ship_feeds[x[0]][gameState.players.length]). reduce((a,b)=>a+b,0) }
                          </td>
                          <td className="shipping">
                            { p.ships. map((x)=>ship_capacities[x[0]]). reduce((a,b)=>a+b,0) }
                          </td>
                        </tr>);
            })}
          </table>
          <input type="button" value="OK" onClick={closeSelf} />
        </div>
    );
}

function ScrollToBottom(){
    let ref = React.createRef();
    let out = <span ref={ref}/>;
    useEffect( () => { ref.current.parentNode.scroll(0,999999); } );
    return out;
}

export function showLog() {
    showDialog(
        <div className="helpDlg">
          <h2>Game Log</h2>
          <div className="content">
            {
                gameState.log.map((e) => ((typeof(e)=='string') ? (<li>{e}</li>) : (<h6 className={'l'+e[0]}>{e[1]}</h6>)))
            }
            <ScrollToBottom/>
          </div>
          <input type="button" value="OK" onClick={closeSelf} />
        </div>
    );
}


export function showHelp(){
    showDialog(
        <div className="helpDlg">
          <h2>Rules Reference</h2>
          <div className="content">

            <h3>Resources</h3>
            <table className="resources">
              {
                  [['money','wood','clay','iron','fish','wheat','cattle','coal','hides'],
                   ['loans','charcoal','brick','steel','lox','bread','meat','coke','leather']].map(
                       (row) => <tr> { row.map(
                           (res) => <td>
                                      <ResourceTile type={res} />
                                      {res=='money' && "Also counts as 1 food"}
                                      {res=='loans' && "Grant €4, Repay €5, Endgame -€7"}
                                      {res=='brick' && "Can be used as clay" }
                                      {res=='steel' && "Can be used as iron" }
                                      {res=='wheat' && "+1 at harvest if you have any" }
                                      {res=='cattle' && "+1 at harvest if you have at least two" }
                                    </td>
                       ) } </tr>
                   )
              }
            </table>
            The value in the lower right is the value when shipped at the Shipping line.  The lower left is either for when the good is
            used as either food or energy (fortunately no good can be used as both).  The multi-colored background indicates an advanced
            good.
            
            <h3>Ships</h3>
            <table className="ships">
              <tr>
                <td colspan="2">Type</td>
                <td>Build Cost</td>
                <td>Buy Cost</td>
                <td>Feeds</td>
                <td>Ships</td>
                <td>Requires Modernization</td>
              </tr>
              
              { ['wood','iron','steel','luxury'].map(
                  (t) => <tr>
                           <td><img src={'images/'+t+'.png'}/></td>
                           <td>{t}</td>
                           <td>
                             { ({wood:5,iron:4,steel:2,luxury:3})[t]} &nbsp;
                             {t=='luxury' ? 'steel' : t} &nbsp;
                             + 3 energy
                           </td>
                           <td>€{ship_prices[t]}</td>
                           <td>{ship_feeds[t][gameState.players.length]}</td>
                           <td>{ship_capacities[t]}</td>
                           <td>{t=='wood' ? 'no' : 'yes'}</td>
                         </tr>
              ) }
            </table>
            Summed shipping capacity for each player is in the score dialog.

            <h3>How to Read a Building</h3>
            <table>
              <tr><td>Number</td><td colspan="2">Name</td><td>Entry Cost</td></tr>
              <tr><td colspan="4">What it does</td></tr>
              <tr><td>Value</td><td>Name</td><td>Symbols</td><td>Construction Cost</td></tr>
            </table>
            <ul>
              <li>Number: When the town builds a building, it chooses the lowest number.  The current lowest is highlighted in purple.
                Not shown for buildings that have been built.</li>
              <li>Entry Cost: In food or money.  If both are shown, you may pay either.</li>
              <li>What it does: Either when you go on it or at endgame.  Hover for fully textual version.</li>
              <li>Value: Points at endgame.  Or can be sold for half.  Usually also the buy price.  When not, a * is present and you
                can hover for the buy price.</li>
              <li>Symbols: The owner of the building gains the benefit of the symbols.  Order doesn't matter.  Hover for textual version.</li>
              <li>Construction Costs: For building this building (e.g. with the Building Firm)</li>
            </ul>
            
            <h3>Special Buildings</h3>
            There's no way to know which are in this game beyond the two the marketplace reveals, but here's all the special buildings
            in the deck:
            <div className="sbholder">
              { special_buildings.map((b) => <Building bn={b.number} />) }
            </div>
            (Experienced Le Havre players may note there ought to be more of these.  They are welcome to send a pull request.  Entering
            these was <i>tedious</i>.)
            
            <h3>Symbols</h3>
            <ul>
              {Object.entries(sym_names).map(
                  (x) => <li><span style={{fontSize:'larger'}}>{x[0]}</span>: {x[1]}</li>
              )}
            </ul>

          </div>
          <input type="button" value="Close" onClick={closeSelf} />
        </div>
    );
}

export function initDialogs() {
    restore(ui, {
        pickTownResource,
        pickPlayerResources,
        pickResources,
        pickBuilding,
        pickPlayerBuilding,
        pickNextSpecialBuilding,
        pickBuildingPlan,
        pickShip,
        showError,
        clearMessages,
        showScore,
        showHelp,
        showLog,
        showMessage: (msg, personal) => { if ( ! ui.am_client_to_server || personal) showMessage(msg) },
        endGame: showScore
    });
}
