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

export function Town({advancers, current, resources, buildings, plans, ships, eot}) {
    console.log(gameState);
    let resourceElements = [];
    for (let i in resources) {
        let v = resources[i];
        resourceElements.push(<span><ResourceStack type={i} number={v} key={i} holder={ui.townResources} /></span>);
    }
    let advancerElements = advancers.map(
        (av,i) => {return <AdvancerToken a={av[0]} b={av[1]} active={i==current} key={i} />;}
    );
    return (<div>
              <Instructions/>
              <h1>The Town</h1>
              <div className="townGrid">
                <div className="horiz advancers">
                  {advancerElements}
                  <div className="endOfTurn">
                    {eot.feed} 🍪<br/>
                    <div className="miniship">
                      <img src={"images/"+eot.ship[0]+".png"}/>
                      <span className="cost">{eot.ship[1]}</span>
                    </div>
                    {eot.building && '🏠'}
                    {eot.special && '?'}
                    {eot.noharvest && <strike>h</strike>}
                  </div>
                </div>
                <div className="horiz resource1">
                  <ResourceStack type="money" number={resources.money} holder={ui.townResources} />
                  <ResourceStack type="wood" number={resources.wood} holder={ui.townResources} />
                  <ResourceStack type="iron" number={resources.iron} holder={ui.townResources} />
                  <ResourceStack type="cattle" number={resources.cattle} holder={ui.townResources} />
                </div>
                <div className="horiz resource2">
                  <ResourceStack type="fish" number={resources.fish} holder={ui.townResources} />
                  <ResourceStack type="clay" number={resources.clay} holder={ui.townResources} />
                  <ResourceStack type="wheat" number={resources.wheat} holder={ui.townResources} />
                </div>
                <div className="shipStacks">
                  {['wood','iron','steel','luxury'].map((i)=>{
                      if (ships[i].length) {
                          return <span className="miniship" title={i+' ships available: '+ships[i].join(', ')}>
                                   <img src={'images/'+i+'.png'}/>
                                   <span className="cost">{ships[i][0]}</span>
                                   <span className="cnt">(+{ships[i].length-1})</span>
                                 </span>;
                      } else {
                          return false;
                      }   
                  })}
                </div>
                <div className="horiz buildings">{ buildings.map((bn)=>{  
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
                  { plans.map((plan,i) => {
                      return <BuildingStack buildings={plan} key={i} />
                  } ) }
                </div>
              </div>
            </div>);
}
        
