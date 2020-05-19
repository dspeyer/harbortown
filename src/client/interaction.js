import React from 'react';
import ReactDOM from 'react-dom';
import './interaction.css';
import { safeCopy, restore } from '../common/utils.js';
import { gameState, ui } from './state.js';
import { prepare_log, abort_log, send_log, clear_log, keep_alive } from './net.js';

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

export let allInstructions = [];
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

export function clearAllClickTargets() {
    for (let ct of allClickTargets) ct.hide();
    for (let i of allInstructions) i.set('');
}

let hlOpacity = 0;

export class Hilite extends React.Component {
    constructor(props) {
        super(props);
        this.state = { opacity: hlOpacity };
        holders.hilites.push(this);
    }
    render() {
        let dup = (x) => x+','+x;
        let bkg = 'linear-gradient(45deg,'+this.props.vals.map((i)=>dup(gameState.players[i].color)).join(',')+')';
        return <div className="hlwrap"> <div className="hilite" style={{background:bkg, opacity:this.state.opacity}} /> </div>;
    }
}

function showHilites() {
    hlOpacity = 1;
    for (let hl of holders.hilites) hl.setState({opacity: hlOpacity});
    try { document.removeEventListener('mousemove', hlStartFade); } catch {}
    document.addEventListener('mousemove', hlStartFade);
}
ui.showHilites = showHilites;

function hlTick() {
    if (hlOpacity <= 0) return;
    hlOpacity -= 0.01;
    for (let hl of holders.hilites) hl.setState({opacity: hlOpacity});
    window.setTimeout(hlTick, 16);
}

function hlStartFade() {
    console.log('hlStartFade',hlOpacity);
    if (hlOpacity == 1) hlTick();
}
ui.hlStartFade = hlStartFade;    

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


export function initUi(nplayers) {
    holders.buildings = {};
    holders.townResources = {};
    holders.hilites = [];
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

let turnBackup = null;

export async function wrap(callback) {
    hlStartFade();
    const backup = safeCopy(gameState);
    if ( ! turnBackup ) turnBackup = safeCopy(gameState);
    if (ui.prepnet) {
        let res;
        let p = new Promise((resolve)=>{res=resolve;});
        window.setTimeout(res, 1000);
        ui.prepnet(res);
        await p;
    }
    resetKeepaliveTimer();
    const player = gameState.players[gameState.currentPlayer];
    try {
        prepare_log(callback.name);
        gameState.log.push([2,callback.name]);
        if (holders.cancelButton) holders.cancelButton.setState({active:true});
        await callback(player, gameState, ui);
        if (callback.name == 'nextTurn') {
            turnBackup = null
            send_log()
        }
    } catch (e) {
        abort_log();
        console.log(['error',e]);
        ui.showError(e+ (e.stack ? ' *st:'+e.stack : ''), !!e.stack);
        restore(gameState, backup);
        throw e;
    } finally {
        if (holders.cancelButton) holders.cancelButton.setState({active:false});
        if (ui.setTab) ui.setTab(player);
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

let lastAct;
let tickTimeout;

function resetKeepaliveTimer() {
    if ( ! ui.am_client_to_server ) return;
    lastAct = Date.now();
    window.clearTimeout(tickTimeout);
    tick();
}

function tick() {
    keep_alive();
    if (Date.now() - lastAct < 15*60*1000) {
        tickTimeout = window.setTimeout(tick, 5000);
    }
}
