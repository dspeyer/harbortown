import React from 'react';
import { gameState } from '../common/gamestate.js';
import './ship.css';

export function MiniShip({ship,later}) {
    const [mat, value] = ship;
    let title = mat+" ship (feeds "+gameState.shipStats[mat].feed+", ships "+gameState.shipStats[mat].ship+") €"+value;
    if (later) title += "; then "+later.map((x)=>{return "€"+x;}).join(", ");
    return <span className="miniship" title={title} >
             <img src={'images/'+mat+'.png'}/>
             <span className="cost">{value}</span>
             {later && <span className="cnt">(+{later.length})</span> }
           </span>;
}

export function Ship({ship}) {
    const [mat, value] = ship;
    return <div className="ship">
             <div className="name"><img src={'images/'+mat+'.png'}/>{mat} Ship</div>
             <div className="capacity">
               <div className="cost">{value}</div>
               <div>{gameState.shipStats[mat].feed}🍪</div>
               <div>ship {gameState.shipStats[mat].ship}</div>
             </div>
           </div>;
}
