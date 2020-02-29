import React from 'react';
import { ResourceStack } from './resources.js';
import { Building, BuildingStack } from './buildingui.js';
import { Instructions, CancelButton } from './interaction.js';
import { gameState, ui, safeCopy, nextTurn, takeResource, useBuilding, buy, cheat, sell, wrap } from './gamestate.js';
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
              <div className="townGrid">
                <div className="horiz advancers">
                  {advancerElements}
                  <div className="endOfTurn">
                    ? 🍪<br/>
                    <span className="miniship"><img src="images/wood.png"/> <span className="cost">4</span></span><br/>
                    🏠
                  </div>
                </div>
                <div className="horiz resource1">
                  <ResourceStack type="money" number={props.resources.money} holder={ui.townResources} />
                  <ResourceStack type="wood" number={props.resources.wood} holder={ui.townResources} />
                  <ResourceStack type="iron" number={props.resources.iron} holder={ui.townResources} />
                  <ResourceStack type="cattle" number={props.resources.cattle} holder={ui.townResources} />
                </div>
                <div className="horiz resource2">
                  <ResourceStack type="fish" number={props.resources.fish} holder={ui.townResources} />
                  <ResourceStack type="clay" number={props.resources.clay} holder={ui.townResources} />
                  <ResourceStack type="wheat" number={props.resources.wheat} holder={ui.townResources} />
                </div>
                <div className="shipStacks">
                  {['wood','iron','steel','luxury'].map((i)=>{
                      return <span className="miniship">
                               <img src={'images/'+i+'.png'}/>
                               <span className="cost">?</span>
                               <span className="cnt">(+?)</span>
                             </span>
                  })}
                </div>
                <div className="horiz buildings">{ props.buildings.map((bn)=>{  
                    return <Building bn={bn} bn={bn}/>;
                }) }</div>
                <div className="buttonbar">
                  <input type="button" value="Take Pile" onClick={wrap.bind(null,takeResource)} />
                  <input type="button" value="Use Building" onClick={wrap.bind(null,useBuilding)} />
                  <input type="button" value="Buy" onClick={wrap.bind(null,buy)} />
                  <input type="button" value="Sell" onClick={wrap.bind(null,sell)} />
                  <input type="button" value="Cheat" onClick={wrap.bind(null,cheat)} />
                  <CancelButton/>
                  <input type="button" value="Next Turn" onClick={wrap.bind(null,nextTurn)}/>
                </div>
                <div className="plans">
                  { props.plans.map((plan,i) => {
                      return <BuildingStack buildings={plan} key={i} />
                  } ) }
                </div>
              </div>
            </div>);
}
        
