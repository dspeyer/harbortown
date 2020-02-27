import React from 'react';
import ReactDOM from 'react-dom';
import './interaction.css';
import { subtractResources, gameState, ui } from './gamestate.js';
import { ResourceStack, ResourceTile } from './resources.js';
import { buildings_by_number } from './building.js';

let allClickTargets = [];

export class ClickTarget extends React.Component {
    constructor(props) {
        super(props);
        props.holder[props.data] = this;
        this.state = {active: false};
        allClickTargets.push(this);
    }
    render() {
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
    const wfu = new Promise((resolve,reject) => { ui.resolve = resolve; } );
    const choice = await wfu; // invoked by the onClick of a ClickTarget
    clearAllClickTargets();
    ui.resolve = undefined;
    console.log('returning',choice);
    return choice;
}

export function showDialog(elem, elemobjwrap) {
    const dialogs = document.getElementById('nonroot');
    const holder = document.createElement('div');
    holder.className = 'dialogholder';
    holder.className = 'dialogholder';
    dialogs.append(holder);
    ReactDOM.render(elem, holder);
    const promise = new Promise((resolve) => { holder.resolve = ()=>{resolve(elemobjwrap[0].state);}; });
    return promise;
}

export function closeSelf(ev) {
    let holder;
    console.log(ev);
    for (holder=ev.target; holder.className!='dialogholder'; holder=holder.parentNode);
    holder.resolve();
    ReactDOM.unmountComponentAtNode(holder);
    holder.parentNode.removeChild(holder);
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
    return await dl;
}

export async function pickPlayerResources(player, filter, msg) {
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
    let p = new Promise((resolve)=>{ ui.resolve=resolve; });
    let bn = await p;
    clearAllClickTargets();
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
    let p = new Promise((resolve)=>{ ui.resolve=resolve; });
    let bn = await p;
    clearAllClickTargets();
    return buildings_by_number[bn];
}

export async function pickPlayerBuilding(msg, player) {
    allInstructions[0].setState({msg});
    for (let b of player.buildings) {
        ui.buildings[b].setState({active:true});
    }
    let p = new Promise((resolve)=>{ ui.resolve=resolve; });
    let bn = await p;
    clearAllClickTargets();
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
        
