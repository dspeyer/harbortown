import React from 'react';
import { ResourceStack } from './resources.js';
import { Building } from './buildingui.js';
import { Ship } from './ships.js';
import { gameState } from './state.js';
import { holders } from './interaction.js';
import './player.css';

export function Player(props) {
    const player = props.player;
    const isme = (player.name == gameState.whoami);
    let resourceElements = [];
    let order = ['money','loans',
                 'fish','lox','bread','meat',
                 'wood','clay','iron','brick','steel',
                 'charcoal','coal','coke',
                 'wheat','cattle'];
    for (let i in player.resources) {
        if (order.indexOf(i) == -1) { // I don't *think* this will ever happen, but I want to be safe
            order.push(i);
        }
    }
    for (let i of order) {
        let v = player.resources[i];
        if (v>0) resourceElements.push(<ResourceStack type={i} number={v} key={i} holder={holders.playerResources[player.number]} />);
    }
    return <div className={'player' +
                           (player.color!='khaki' ? ' darkbkg' : '') +
                           (player.number==gameState.currentPlayer ? ' current' : '')}
                style={ {backgroundColor:player.color} } >
             <h1 class={'isme'+isme}>{player.name}</h1>
             { player.hunger>0 && <h1 class="hunger">Awaiting {player.hunger} food</h1> }
             <div className="stuff">
               { resourceElements }
               { props.player.buildings.map( (bn)=>{
                   return <Building bn={bn} key={bn} player={props.dbb[bn]} />
               } ) }
               { props.player.ships.map( (s,i)=>{
                   return <Ship ship={s} key={i} />
               } ) }
             </div>
           </div>;
}

