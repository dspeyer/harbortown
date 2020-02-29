import React, { useEffect } from 'react';
import './building.css';
import { resources } from './data.js';
import { ClickTarget } from './interaction.js';
import { gameState, ui } from './gamestate.js';
import { buildings_by_number } from './building.js';

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
    const bd = buildings_by_number[props.bn];
    let bref = React.createRef(), tref = React.createRef();
    useEffect(()=>{
        if (bd === undefined) return;
        for (let i=14;i>6;i-=.5) {
            tref.current.style.fontSize = i+'pt';
            if (tref.current.getBoundingClientRect().height < 40) {
                return;
            }
        }
    });
    if (bd === undefined) return <span>Failed bn {props.bn}</span>;
    return (<div className="building" onMouseDown={()=>bmd(bref)} onMouseUp={()=>bmu(bref)} ref={bref}>
              <ClickTarget holder={ui.buildings} data={bd.number} />
              <div className="entry">
                {bd.entry.food && <span>{bd.entry.food}🍪</span>}
                {bd.entry.money && <span>{bd.entry.money}€</span>}
                {bd.entry.unobtainium && <span>🔒</span>}
              </div>
              {props.showNumber && <div className="number">{bd.number}</div>}
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
                {bd.symbols.length>0 && <div className="symbols">{bd.symbols.join('')}</div>}
                {bd.buildcost!=undefined &&
                 <div className="build" title={JSON.stringify(bd.buildcost)}>
                   {Object.entries(bd.buildcost || {}).map( (e) => {
                       return <span>{e[1]}<img src={'images/'+e[0]+'.png'}/></span>
                   })}
                 </div>
                }
              </div>
            </div>);
}


export function BuildingStack(props) {
    const n = props.buildings.length;
    return (<div className="buildingStack">
            {props.buildings.map((building,i)=>{
                return ( <div className="buildingHolder" style={ {bottom:(n-i-1)*19+'px',zIndex:100-i} } key={building}>
                           <Building bn={building} showNumber={true}/>
                         </div> );
            })}
            </div>);
}
