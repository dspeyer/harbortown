import React from 'react';
import { ResourceStack } from './resources.js';
import { Building } from './buildingui.js';
import { Ship } from './ships.js';
import { safeCopy, gameState, ui } from '../common/gamestate.js';
import './player.css';

export function Player(props) {
    const player = props.player;
    const isme = (player.name == gameState.whoami);
    let resourceElements = [];
    for (let i in player.resources) {
        let v = player.resources[i];
        if (v>0) resourceElements.push(<ResourceStack type={i} number={v} key={i} holder={ui.playerResources[player.number]} />);
    }
    return <div className={'player' +
                           (player.color!='khaki' ? ' darkbkg' : '') +
                           (player.number==gameState.currentPlayer ? ' current' : '')}
                style={ {backgroundColor:player.color} } >
             <h1 class={'isme'+isme}>{player.name}</h1>
             <div className="stuff">
               { resourceElements }
               { props.player.buildings.map( (bn)=>{
                   return <Building bn={bn} key={bn} />
               } ) }
               { props.player.ships.map( (s,i)=>{
                   return <Ship ship={s} key={i} />
               } ) }
             </div>
           </div>;
}

