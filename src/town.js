import React from 'react';
import { ResourceStack } from './resources.js';
import { Building, BuildingStack } from './buildingui.js';
import { Instructions } from './interaction.js';
import { gameState, ui, safeCopy, nextTurn, takeResource, useBuilding, buy, cheat, sell } from './gamestate.js';
import './town.css';

export function AdvancerToken(props) {
    return ( <div className={'advancer'+(props.active?' active':'')}>
               <div className="a">
                 {props.a}
                 <img src={'images/'+props.a+'.png'} />
               </div>
               <div className="b">
                 <img src={'images/'+props.b+'.png'} />
                 {props.b}
               </div>
             </div> );
}

export function Town(props) {
    console.log(gameState);
    let resourceElements = [];
    for (let i in props.resources) {
        let v = props.resources[i];
        resourceElements.push(<span><ResourceStack type={i} number={v} key={i} holder={ui.townResources} /></span>);
    }
    let advancerElements = props.advancers.map(
        (av,i) => {return <AdvancerToken a={av[0]} b={av[1]} active={i==props.current} key={i} />;}
    );
    return (<div>
              <Instructions/>
              <h1>The Town</h1>
              <div className="horiz">
                <div>
                  <div className="horiz">{advancerElements}</div>
                  <div className="horizw">{resourceElements}</div>
                  <div className="horiz">{ props.buildings.map((bn)=>{  
                      return <Building bn={bn} bn={bn}/>;
                  }) }</div>
                  <div className="buttonbar">
                    <input type="button" value="Take Pile" onClick={takeResource} />
                    <input type="button" value="Use Building" onClick={useBuilding} />
                    <input type="button" value="Buy" onClick={buy} />
                    <input type="button" value="Sell" onClick={sell} />
                    <input type="button" value="Cheat" onClick={cheat} />
                    <input type="button" value="Next Turn" onClick={nextTurn}/>
                  </div>
                </div>
                { props.plans.map((plan,i) => {
                    return <BuildingStack buildings={plan} key={i} />
                } ) }
              </div>
            </div>);
}
        
