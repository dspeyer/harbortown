import React from 'react';
import ReactDOM from 'react-dom';
import './interaction.css';
import { safeCopy, restore, addResources, subtractResources, countPile, countSymbol, buildings_by_number } from '../common/utils.js';
import { gameState } from './state.js';
import { ResourceStack, ResourceTile } from './resources.js';
import { annotate_log } from './net.js';
import { Building } from './buildingui.js';
import { ship_feeds, ship_capacities, ship_prices, sym_names } from '../common/data.js';
import { special_buildings } from '../common/buildings.js';
import { prepare_log, abort_log, send_log, clear_log } from './net.js';

export let holders = {};

let allClickTargets = [];

export class ClickTarget extends React.Component {
    constructor(props) {
        super(props);
        props.holder[props.data] = this;
        this.state = { active: false, msg: false };
        allClickTargets.push(this);
    }
    render() {
        this.props.holder[this.props.data] = this;
        if ( ! this.state.active ) {
            return <span/>;
        }
        return <div className="clickTarget" onClick={ ()=>{ui.resolve(this.props.data);} }>
                 { this.state.msg && <div className="ctMsg">{this.state.msg}</div> }
               </div>;
    }
    show(msg) {
        this.setState({active:true, msg});
    }
    hide() {
        this.setState({active:false, msg:false});
    }
}

let allInstructions = [];
export class Instructions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {msg: '', pausable: false};
        allInstructions.push(this);
    }
    set(msg,pausable) {
        this.setState({msg,pausable});
    }
    render() {
        if (this.state.msg) {
            return <div className="instructions">
                     {this.state.msg}
                     { this.state.pausable &&
                       <input type="button" value="pause" onClick={() => {ui.resolve('pause');}} /> }
                   </div>;
        } else {
            return <span/>
        }
    }
}

function clearAllClickTargets() {
    for (let ct of allClickTargets) ct.hide();
    for (let i of allInstructions) i.set('');
}

export async function pickTownResource() {
    allInstructions[0].set('Take one pile of resources from the town');
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

export function showDialog(elem, elemobjwrap) {
    const dialogs = document.getElementById('nonroot');
    const holder = document.createElement('div');
    holder.className = 'dialogholder';
    holder.className = 'dialogholder';
    dialogs.append(holder);
    ReactDOM.render(elem, holder);
    if (elemobjwrap) {
        const promise = new Promise((resolve,reject) => { holder.resolve = ()=>{resolve(elemobjwrap[0].state);};
                                                          holder.reject = reject;});
        return promise;
    } else {
        holder.resolve = ()=>{};
    }
}

export function closeSelf(ev) {
    let holder;
    for (holder=ev.target; holder.className!='dialogholder'; holder=holder.parentNode);
    if (ev.target.value=='Cancel') {
        holder.reject('Cancelled');
    } else {
        holder.resolve();
    }
    ReactDOM.unmountComponentAtNode(holder);
    holder.parentNode.removeChild(holder);
}

class MessageDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state={opacity:1};
        this.dom = React.createRef();
        if ( ! props.lasting ) {
            this.timeout = window.setTimeout(this.tick.bind(this), 5000);
        }
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
        window.clearTimeout(this.timeout);
        closeSelf({target:this.dom.current});
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
        this.state={};
        this.clickTargets={};
        props.out.push(this);
    }

    incr(res) {
        this.setState({ [res]: (this.state[res] || 0) + 1 });
    }

    decr(res) {
        if (this.props.player && this.state[res] > 0) {
            this.setState({ [res]: this.state[res] - 1 });
            addResources(this.props.player, { [res]: 1 });
            ui.update();
        }
    }
            
    
    toggleOffer(res) {
        if (this.state[res] > 0) {
            this.setState({ [res]: 0 });
        } else {
            this.incr(res);
        }
    }

    render(){
        let resourceElements=[];
        if (this.props.offers) {
            for (let i of this.props.offers) {
                resourceElements.push(<div className={'offer'+(this.state[i] ? ' chosen' : '')}
                                           onClick={this.toggleOffer.bind(this,i)}><ResourceTile type={i}/></div>);
            }
        } else {
            for (let i in this.state) {
                let v = this.state[i];
                if (v>0) resourceElements.push(
                    <div style={ {cursor:'pointer'} } onClick={this.decr.bind(this,i)}>
                      <ResourceStack type={i} number={v} key={i} holder={this.clickTargets} />
                    </div>
                );
            }
        }
        return (<div className="pickResourcesDialog">
                  <h2>{this.props.msg}</h2>
                  <div className="prdstate">
                    { resourceElements }
                  </div>
                  <input type="button" value="Cancel" onClick={closeSelf} />
                  <input type="button" value="Done" onClick={closeSelf}
                         disabled={this.props.n && Object.values(this.state).reduce((a,b)=>a+b,0)!=this.props.n} />
                </div>);
    }
}

export async function pickResources(rl, n) {
    let dlobj=[];
    const msg = 'Pick '+n+' of the following resources';
    const dlelem = <PickResourcesDialog msg={msg} out={dlobj} offers={rl} n={n} />;
    const dl = showDialog(dlelem, dlobj);
    const resources = await dl;
    annotate_log(resources);
    return resources;
}

let pickPlayerResourcesWaiting = [];
let pickPlayerResourcesLocked = false;

export async function pickPlayerResources(player, filter, msg) {
    if (pickPlayerResourcesLocked) {
        let p = new Promise((resolve) => { pickPlayerResourcesWaiting.push(resolve); });
        await p;
    }
    pickPlayerResourcesLocked = true;
    
    if (!msg) msg="Choose resources to send";
    let dlobj=[];
    const dlelem = <PickResourcesDialog msg={msg} out={dlobj} player={player} />;
    const dl = showDialog(dlelem, dlobj);
    
    for (let r in player.resources) {
        if (player.resources[r]>0 && filter(r)) {
            holders.playerResources[player.number][r].show();
        }
    }
    ui.resolve = (res) => {
        subtractResources(player, {[res]:1} );
        dlobj[0].incr(res);
        ui.update();
    };
    

    try  {
        
        const picked = await dl;
        clearAllClickTargets();
        annotate_log(picked);

        return picked;
        
    } finally {
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

export async function pickBuildingPlan(msg, {resource, for_buy, pausable}) {
    allInstructions[0].set(msg, pausable);
    for (let deck of gameState.buildingPlans) {
        if (deck.length) {
            holders.buildings[deck[0]].show(for_buy && buildings_by_number[deck[0]].price);
        }
    }
    if (for_buy) {
        for (let b of gameState.townBuildings) {
            holders.buildings[b].show(for_buy && buildings_by_number[b].price);
        }
        for (let m in gameState.ships) {
            if (gameState.ships[m].length) {
                holders.miniships[m].show(ship_prices[m]);
            }
        }
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return bn;
}

export async function pickPlayerBuilding(msg, player) {
    allInstructions[0].set(msg);
    for (let b of player.buildings) {
        holders.buildings[b].show();
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return buildings_by_number[bn];
}    

export function initUi(nplayers) {
    holders.buildings = {};
    holders.townResources = {};
    holders.playerResources = [];
    for (let i=0; i<nplayers; i++){
        holders.playerResources.push({});
    }
}
        
export class CancelButton extends React.Component {
    constructor(props) {
        super(props);
        holders.cancelButton = this;
        this.state = {active: false};
    }
    render() {
        if (this.state.active) {
            return <input type="button" value="Cancel" onClick={this.clicked.bind(this)} className="entireBar" />;
        } else {
            return <span/>;
        }
    }
    clicked() {
        ui.reject("canceled");
        clearAllClickTargets();
        this.setState({active:false});
    }
}

export function score() {
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
                let buildings = p.buildings.map((x)=>buildings_by_number[x]);
                let scoreCols = [
                    p.resources.money || 0,
                    buildings.map((x)=>x.value).reduce((a,b)=>a+b,0),
                    p.ships.map((x)=>x[1]).reduce((a,b)=>a+b,0),
                    buildings.map((x)=>x.endgameBonus?x.endgameBonus(p):0).reduce((a,b)=>a+b,0),
                    -7 * (p.resources.loans||0)
                ];
                let ts = scoreCols.reduce((a,b)=>a+b, 0);
                let usr = countPile(p.resources,'value');
                return (<tr>
                          <td>{p.name}</td>
                          { scoreCols.map((v) => <td>{v}</td>) }
                          <td>{ts}</td>
                          <td className="usr">{usr}</td>
                          <td className="usr">{usr+ts}</td>
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

export function help(){
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



let turnBackup = null;

export async function wrap(callback) {
    const backup = safeCopy(gameState);
    if ( ! turnBackup ) turnBackup = safeCopy(gameState);
    try {
        const player = gameState.players[gameState.currentPlayer];
        prepare_log(callback.name);
        if (holders.cancelButton) holders.cancelButton.setState({active:true});
        await callback(player, gameState, ui);
        if (callback.name == 'nextTurn') {
            turnBackup = null
            send_log()
        }
    } catch (e) {
        abort_log();
        console.log(['error',e]);
        showError(e+ (e.stack ? ' *st:'+e.stack : ''), !!e.stack);
        restore(gameState, backup);
        throw e;
    } finally {
        if (holders.cancelButton) holders.cancelButton.setState({active:false});
        ui.update();
    }
}

export async function revert() {
    if (turnBackup) {
        restore(gameState, turnBackup);
        turnBackup = null;
        clear_log();
    }
    ui.update();
}

export function canRevert() {
    return !! turnBackup;
}

export let ui = {
    pickTownResource,
    pickPlayerResources,
    pickResources,
    pickBuilding,
    pickPlayerBuilding,
    pickNextSpecialBuilding,
    pickBuildingPlan,
    initUi,
    showMessage: (msg, personal) => { if ( ! ui.am_client_to_server || personal) showMessage(msg) },
    endGame: score
}
