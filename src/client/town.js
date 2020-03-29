import React from 'react';
import { ResourceStack } from './resources.js';
import { Building, BuildingStack } from './buildingui.js';
import { MiniShip } from './ships.js';
import { Instructions, CancelButton, score } from './interaction.js';
import { gameState, ui, safeCopy, restore,
         nextTurn, takeResource, utilizeBuilding, buy, cheat, sell, repayLoan, resumeConstruction } from '../common/gamestate.js';
import { showDialog, closeSelf, showError, wrap, revert, canRevert } from './interaction.js';
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
               {props.i && <div className="interest">interest</div>}
             </div> );
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
        this.w = Math.floor(Math.sqrt(n));
        while (this.w > 3) {
            if (mod(n,this.w)==0) break;
            this.w--;
        }
    }
    render(){
        if (this.props.turn >= gameState.events.length) {
            return <div className="endOfTurn">Final<br/>Actions</div>;
        }
        const cx = mod(this.props.turn, this.w), cy = Math.floor(this.props.turn / this.w);
        const self = this;
        return (<div style={ {position:'relative'} }
                     onMouseDown={()=>{self.setState({mousedown:true})}}
                     onMouseUp={()=>{self.setState({mousedown:false})}} >
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

export function Town({advancers, current, resources, buildings, plans, ships, turn, dbb, curp}) {
    let resourceElements = [];
    for (let i in resources) {
        let v = resources[i];
        resourceElements.push(<span><ResourceStack type={i} number={v} key={i} holder={ui.townResources} /></span>);
    }
    let advancerElements = advancers.map(
        (av,i) => {return <AdvancerToken a={av[0]} b={av[1]} i={av[2]} active={i==current} key={i} />;}
    );
    let myturn = ( ( ! gameState.whoami ) || (gameState.whoami == curp) );
    let bat = gameState.bigActionTaken;
    return (<div>
              <Instructions/>
              <h1>The Town</h1>

              <div className="townGrid">
                <div className="horiz advancers">
                  {advancerElements}
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
                  <EndOfTurn turn={turn} />
                  {['wood','iron','steel','luxury'].map((i)=>{
                      return ships[i].length>0 && <MiniShip key={i} ship={[i,ships[i][0]]} later={ships[i].slice(1)}/>;
                  })}
                </div>
                <div className="horiz buildings">{ buildings.map((bn)=>{  
                    return <Building bn={bn} key={bn} player={dbb[bn]} />;
                }) }</div>
                <div className="buttonbar">
                  <CancelButton/>
                  🌊
                  { bat==0.5 ?
                    <input type="button" value="Resume Construction" onClick={wrap.bind(null,resumeConstruction)} />
                    : <span>
                        <input type="button" value="Take Pile" onClick={wrap.bind(null,takeResource)} disabled={!myturn || bat} />
                        <input type="button" value="Use Building" onClick={wrap.bind(null,utilizeBuilding)} disabled={!myturn || bat} />
                    </span>
                  }
                  🌊
                  <input type="button" value="Buy" onClick={wrap.bind(null,buy)} disabled={!myturn || current==-1} />
                  <input type="button" value="Sell" onClick={wrap.bind(null,sell)} disabled={!myturn || current==-1} />
                  <input type="button" value="Repay" onClick={wrap.bind(null,repayLoan)} disabled={!myturn || current==-1} />
                  <input type="button" value="C" onClick={wrap.bind(null,cheat)} />
                  🌊
                  <input type="button" value="Score" onClick={score} />
                  🌊
                  <input type="button" value="Revert" onClick={revert} disabled={!myturn || !canRevert()} />
                  <input type="button" value="Done" onClick={wrap.bind(null,nextTurn)} disabled={!myturn || !bat} />
                  🌊
                </div>
                <div className="plans">
                  { plans.map((plan,i) => {
                      return <BuildingStack buildings={plan} key={i} />
                  } ) }
                </div>
              </div>
            </div>);
}
        
