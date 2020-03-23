import React from 'react';
import ReactDOM from 'react-dom';
import './interaction.css';
import { subtractResources, gameState, ui } from '../common/gamestate.js';
import { ResourceStack, ResourceTile } from './resources.js';
import { buildings_by_number } from '../common/building.js';
import { annotate_log } from './net.js';

let allClickTargets = [];

export class ClickTarget extends React.Component {
    constructor(props) {
        super(props);
        props.holder[props.data] = this;
        this.state = {active: false};
        allClickTargets.push(this);
    }
    render() {
        this.props.holder[this.props.data] = this;
        if ( ! this.state.active ) {
            return <span/>;
        }
        return <div className="clickTarget" onClick={ ()=>{ui.resolve(this.props.data);} } />
    }
}

let allInstructions = [];
export class Instructions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {msg: ''};
        allInstructions.push(this);
    }
    render() {
        if (this.state.msg) {
            return <div className="instructions">{this.state.msg}</div>;
        } else {
            return <span/>
        }
    }
}

function clearAllClickTargets() {
    for (let ct of allClickTargets) ct.setState({active:false});
    for (let i of allInstructions) i.setState({msg:''});
}


export async function pickTownResource() {
    console.log('res',gameState.townResources,'ui',gameState.townResourceUi);
    allInstructions[0].setState({msg:'Take one pile of resources from the town'});
    for (let res in gameState.townResources) {
        if (gameState.townResources[res] > 0) {
            ui.townResources[res].setState({active: true});
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
    console.log(ev);
    for (holder=ev.target; holder.className!='dialogholder'; holder=holder.parentNode);
    if (ev.target.value=='Cancel') {
        holder.reject('Cancelled');
    } else {
        console.log('ev.target.value="'+ev.value+'"');
        holder.resolve();
    }
    ReactDOM.unmountComponentAtNode(holder);
    holder.parentNode.removeChild(holder);
}

class ErrorDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state={opacity:1};
        this.dom = React.createRef();
        this.timeout = window.setTimeout(this.tick.bind(this), 2000);
    }
    render() {
        return (<div className="errorMsg" ref={this.dom} style={ {opacity:this.state.opacity} }>
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
    showDialog(<ErrorDialog msg={msg}/>);
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
                console.log(['offering ',i]);
                resourceElements.push(<div className={'offer'+(i in this.state ? ' chosen' : '')}
                                           onClick={this.toggleOffer.bind(this,i)}><ResourceTile type={i}/></div>);
            }
        } else {
            for (let i in this.state) {
                let v = this.state[i];
                if (v>0) resourceElements.push(<ResourceStack type={i} number={v} key={i} holder={this.clickTargets} />);
            }
        }
        return (<div className="pickResourcesDialog">
                  <h2>{this.props.msg}</h2>
                  <div className="prdstate">
                    { resourceElements }
                  </div>
                  <input type="button" value="Cancel" onClick={closeSelf} />
                  <input type="button" value="Done" onClick={closeSelf}
                         disabled={this.props.n && Object.keys(this.state).length!=this.props.n} />
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
    const dlelem = <PickResourcesDialog msg={msg} out={dlobj} />;
    const dl = showDialog(dlelem, dlobj);
    
    console.log(player);
    for (let r in player.resources) {
        console.log(r);
        if (player.resources[r]>0 && filter(r)) {
            ui.playerResources[player.number][r].setState({active:true});
        }
    }
    ui.resolve = (res) => {
        subtractResources(player, {[res]:1} );
        console.log(dl);
        dlobj[0].incr(res);
        ui.update();
    };
    
    const picked = await dl;
    clearAllClickTargets();
    annotate_log(picked);

    pickPlayerResourcesLocked = false;
    if (pickPlayerResourcesWaiting.length) {
        pickPlayerResourcesWaiting.shift()();
    }

    return picked;
}

export async function pickBuilding() {
    allInstructions[0].setState({msg:'Choose an existing building'});
    for (let b of gameState.townBuildings) {
        console.log(b);
        ui.buildings[b].setState({active:true});
    }
    for (let p of gameState.players) {
        for (let b of p.buildings) {
            ui.buildings[b].setState({active:true});
        }
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return buildings_by_number[bn];
}

export async function pickBuildingPlan(msg, resource, includingTown) {
    allInstructions[0].setState({msg});
    for (let deck of gameState.buildingPlans) {
        if (deck) {
            ui.buildings[deck[0]].setState({active:true});
        }
    }
    if (includingTown) {
        for (let b of gameState.townBuildings) {
            ui.buildings[b].setState({active:true});
        }
    }
    let p = new Promise((resolve, reject)=>{ ui.resolve=resolve; ui.reject = reject; });
    let bn = await p;
    clearAllClickTargets();
    annotate_log(bn);
    return buildings_by_number[bn];
}

export async function pickPlayerBuilding(msg, player) {
    allInstructions[0].setState({msg});
    for (let b of player.buildings) {
        ui.buildings[b].setState({active:true});
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
        return <input type="button" value="Cancel" disabled={!this.state.active} onClick={this.clicked.bind(this)} />;
    }
    clicked() {
        ui.reject("canceled");
        clearAllClickTargets();
        this.setState({active:false});
    }
}
