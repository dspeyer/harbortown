import React from 'react';
import { ResourceStack } from './resources.js';
import { Building } from './buildingui.js';
import { safeCopy, gameState } from './gamestate.js';
import './player.css';

export function Player(props) {
    const player = props.player;
    const canonPlayer = gameState.players[props.idx];
    if (canonPlayer.resourceUi == undefined) {
        canonPlayer.resourceUi = {};
    }
    let resourceElements = [];
    for (let i in player.resources) {
        let v = player.resources[i];
        if (v>0) resourceElements.push(<ResourceStack type={i} number={v} key={i} holder={canonPlayer.resourceUi} />);
    }
    return <div className={'player' + (player.color!='khaki' ? ' darkbkg' : '') } style={ {background:player.color} }>
             <h1>{player.name}</h1>
             <div className="stuff">
               { resourceElements }
               { props.player.buildings.map( (bd)=>{
                   return <Building data={bd} key={bd.number} />
               } ) }
             </div>
           </div>;
}

