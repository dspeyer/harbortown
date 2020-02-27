import React from 'react';
import { ResourceStack } from './resources.js';
import { Building } from './buildingui.js';
import { safeCopy, gameState, ui } from './gamestate.js';
import './player.css';

export function Player(props) {
    const player = props.player;
    let resourceElements = [];
    for (let i in player.resources) {
        let v = player.resources[i];
        if (v>0) resourceElements.push(<ResourceStack type={i} number={v} key={i} holder={ui.playerResources[player.number]} />);
    }
    return <div className={'player' + (player.color!='khaki' ? ' darkbkg' : '') } style={ {background:player.color} }>
             <h1>{player.name} #{player.number}</h1>
             <div className="stuff">
               { resourceElements }
               { props.player.buildings.map( (bn)=>{
                   return <Building bn={bn} key={bn} />
               } ) }
               {(player.number==3) && <div className="dbg">{JSON.stringify(gameState,null,2)}</div>}
             </div>
           </div>;
}

