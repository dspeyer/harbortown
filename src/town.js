import React from 'react';
import { ResourceStack } from './resources.js';
import { Building, BuildingStack } from './buildingui.js';
import { MiniShip } from './ships.js';
import { Instructions, CancelButton } from './interaction.js';
import { gameState, ui, safeCopy, nextTurn, takeResource, useBuilding, buy, cheat, sell, wrap } from './gamestate.js';
import { showDialog, closeSelf } from './interaction.js';
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

export function AllEots(props) {
    const n = gameState.events.length;
    let w = Math.ceil(Math.sqrt(n));
    while (w>Math.sqrt(n/2)) {
        if (n%w==0) break;
        w--;
    }
    return <div className="allEots" style={ {width:w*50+'px'} }>
             {gameState.events.map((ev,i)=>{
                 return <EndOfTurn eot={ev} inAll={true} hl={i==gameState.currentTurn} key={i}/>
             })}
             <input type="button" value="Close" onClick={closeSelf}/>
           </div>;
}

export function showAllEots() {
    showDialog(<AllEots/>);
}

export function OneEndOfTurn(props) {
    return <div className={"endOfTurn"+(props.dark?' dark':'')}>
             {props.eot.feed} 🍪<br/>
             <MiniShip ship={props.eot.ship} /><br/>
             {props.eot.building && '🏠'}
             {props.eot.special && '?'}
             {props.eot.noharvest && <strike>h</strike>}
           </div>;
}

// Pull out the percent sign because rjsx-mode gets confused
function mod(a,b){
    return a%b;
}

export class EndOfTurn extends React.Component {
    constructor(props) {
        super(props);
        this.state={mousedown:false};
        const n = gameState.events.length;
        this.w = Math.ceil(Math.sqrt(n));
        while (this.w > Math.sqrt(n/2)) {
            if (mod(n,this.w)==0) break;
            this.w--;
        }
    }
    render(){
        const cx = mod(this.props.turn, this.w), cy = Math.floor(this.props.turn / this.w);
        const self = this;
        return (<div style={ {position:'relative'} }
                     onMouseDown={()=>{self.setState({mousedown:true})}}
                     onMouseUp={()=>{self.setState({mousedown:false})}}>
                  { gameState.events.map((eot,i)=>{
                      const x = mod(i,self.w) - cx;
                      const y = Math.floor(i/self.w) - cy;
                      let opacity;
                      if (self.props.turn==i) return <OneEndOfTurn eot={gameState.events[self.props.turn]} />
                      return <div key={i} style={ {position: 'absolute',
                                                   top: (y*60)+'px',
                                                   left: (x*50)+'px',
                                                   display: self.state.mousedown ? 'block' : 'none',
                                                   zIndex:999} }>
                               <OneEndOfTurn eot={eot} dark={true}/>
                             </div>;
                  })}
                </div>);
    }
}



export function Town({advancers, current, resources, buildings, plans, ships, turn}) {
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
                  <EndOfTurn turn={turn} />
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
                      return ships[i].length>0 && <MiniShip key={i} ship={[i,ships[i][0]]} later={ships[i].slice(1)}/>;
                  })}
                </div>
                <div className="horiz buildings">{ buildings.map((bn)=>{  
                    return <Building bn={bn} key={bn}/>;
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
        
