import React from 'react';
import ReactDOM from 'react-dom';
import './interaction.css';
import { safeCopy, restore, resumeConstruction, addResources, subtractResources, ui, countPile, countSymbol } from '../common/gamestate.js';
import { gameState } from './state.js';
import { ResourceStack, ResourceTile } from './resources.js';
import { buildings_by_number } from '../common/building.js';
import { annotate_log } from './net.js';
import { Building } from './buildingui.js';
import { ship_feeds, ship_capacities, ship_prices } from '../common/data.js';
import { prepare_log, abort_log, send_log, clear_log } from './net.js';

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
            ui.townResources[res].show();
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
        this.timeout = window.setTimeout(this.tick.bind(this), 5000);
    }
    render() {
        return (<div className="msgDialog" ref={this.dom} style={ {opacity: this.state.opacity,
                                                                   background: this.props.color || '#ddd' } }>
                  <div className="close" onClick={this.close.bind(this)}>×</div>
                  {this.props.msg}
                </div>);
    }
    tick(){
        this.setState({opacity: this.state.opacity-0.05});
        this.timeout = window.setTimeout(this.tick.bind(this), 100);        
        if (this.state.opacity<=0) this.close();
    }
    close(){
        window.clearTimeout(this.timeout);
        closeSelf({target:this.dom.current});
    }
}

export function showError(msg) {
    showDialog(<MessageDialog msg={msg} color="#fa0" />);
}

export function showMessage(msg) {
    showDialog(<MessageDialog msg={msg} color="#ff7" />);
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
            ui.playerResources[player.number][r].show();
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
        ui.buildings[b].setState({active:true});
    }
    for (let p of gameState.players) {
        for (let b of p.buildings) {
            ui.buildings[b].show();
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
            ui.buildings[deck[0]].show(for_buy && buildings_by_number[deck[0]].price);
        }
    }
    if (for_buy) {
        for (let b of gameState.townBuildings) {
            ui.buildings[b].show(for_buy && buildings_by_number[b].price);
        }
        for (let m in gameState.ships) {
            if (gameState.ships[m].length) {
                ui.miniships[m].show(ship_prices[m]);
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
        ui.buildings[b].show();
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return buildings_by_number[bn];
}    

export function initUi(nplayers) {
    ui.buildings = {};
    ui.townResources = {};
    ui.playerResources = [];
    for (let i=0; i<nplayers; i++){
        ui.playerResources.push({});
    }
}
        
export class CancelButton extends React.Component {
    constructor(props) {
        super(props);
        ui.cancelButton = this;
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


let turnBackup = null;

export async function wrap(callback) {
    const backup = safeCopy(gameState);
    if ( ! turnBackup ) turnBackup = safeCopy(gameState);
    try {
        const player = gameState.players[gameState.currentPlayer];
        prepare_log(callback.name);
        if (ui.cancelButton) ui.cancelButton.setState({active:true});
        await callback(player, gameState);
        if (callback.name == 'nextTurn') {
            turnBackup = null
            send_log()
        }
    } catch (e) {
        abort_log();
        console.log(['error',e]);
        showError(e+' *st:'+e.stack);
        restore(gameState, backup);
        throw e;
    } finally {
        if (ui.cancelButton) ui.cancelButton.setState({active:false});
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

