import React, { useEffect } from 'react';
import './building.css';
import { resources } from './data.js';
import { ClickTarget } from './interaction.js';
import { gameState } from './gamestate.js';

function bmd(ref){
    if (ref.current.parentNode.style.zIndex < 300) {
        ref.current.parentNode.savedZindex = ref.current.parentNode.style.zIndex;
        ref.current.parentNode.style.zIndex = 300;
    }
}


function bmu(ref){
    if (ref.current.parentNode.style.zIndex) {
        ref.current.parentNode.style.zIndex = ref.current.parentNode.savedZindex;
    }
}

function gt(a,b) {
    return a>b;
}

export function Building(props) {
    const bd = props.data;
    let bref = React.createRef(), tref = React.createRef();
    useEffect(()=>{
        for (let i=14;i>6;i-=.5) {
            tref.current.style.fontSize = i+'pt';
            if (tref.current.getBoundingClientRect().height < 40) {
                return;
            }
        }
    });
    return (<div className="building" onMouseDown={()=>bmd(bref)} onMouseUp={()=>bmu(bref)} ref={bref}>
              <ClickTarget holder={gameState.buildingsByNumber[bd.number]} data='ui' />
              <div className="entry">
                {bd.entry.food && <span>{bd.entry.food}🍪</span>}
                {bd.entry.money && <span>{bd.entry.money}€</span>}
                {bd.entry.unobtainium && <span>🔒</span>}
              </div>
              <div className="name" style={ {textAlign:(gt(bd.name.length,8)?'left':'center')} }>{bd.name}</div>
              <div className="text" title={bd.text} ref={tref}>{
                  bd.text.split(' ').map((w) => {
                      if (resources[w]) {
                          return <img src={'images/'+w+'.png'}/>;
                      } else {
                          return <span>{w} </span>;
                      }
                  })
              }</div>
              <div className="footer">
                <div className="cost">{bd.cost}</div>
                <div className="smallname">{bd.name}</div>
                <div className="symbols">{bd.symbols.join('')}</div>
                <div className="build" title={JSON.stringify(bd.buildcost)}>
                  {Object.entries(bd.buildcost || {}).map( (e) => {
                      return <span>{e[1]}<img src={'images/'+e[0]+'.png'}/></span>
                  })}
                </div>
              </div>
            </div>);
}


export function BuildingStack(props) {
    const n = props.buildings.length;
    return (<div className="buildingStack">
            {props.buildings.map((building,i)=>{
                return ( <div className="buildingHolder" style={ {bottom:(n-i-1)*16+'px',zIndex:100-i} }>
                           <Building data={building} key={building.number}/>
                         </div> );
            })}
            </div>);
}
