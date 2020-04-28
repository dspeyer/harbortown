import React, { useEffect } from 'react';
import './buildingui.css';
import { resources } from '../common/data.js';
import { ClickTarget, Hilite, holders } from './interaction.js';
import { buildings_by_number } from '../common/utils.js';
import { gameState } from './state.js';
import { sym_names } from '../common/data.js';

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

function nameSymbols(txt) {
    for (let s in sym_names) {
        txt = txt.replace(s, s+' ('+sym_names[s]+') ');
    }
    return txt;
}

export function Building({bn, player, showNumber, accentNumber, hilite}) {
    const bd = buildings_by_number[bn];
    player = (player!==undefined && gameState.players[player]);
    let bref = React.createRef(), tref = React.createRef();
    useEffect(()=>{
        if (bd === undefined) return;
        let maxDescHeight = window.innerHeight > 520 ? 40 : 30; // Small windows transform the css, but this is in post-transform pixels
        for (let i=14;i>6;i-=.5) {
            tref.current.style.fontSize = i+'pt';
            if (tref.current.getBoundingClientRect().height < maxDescHeight) {
                return;
            }
        }
    });
    if (bd === undefined) return <span>Failed bn {bn}</span>;
    return (<div className="building" onMouseDown={()=>bmd(bref)} onMouseUp={()=>bmu(bref)} ref={bref}>
              <ClickTarget holder={holders.buildings} data={bd.number} />
              { hilite && <Hilite vals={hilite}/> }
              <div className="buildingCard">
                { player!==false && <div>
                                    <div className="disk" style={ {background: player.color} }></div>
                                    <div className="diskname">{player.name}</div>
                                  </div> }
                <div className="entry">
                  {bd.entry.food && <span>{bd.entry.food}🍪</span>}
                  {bd.entry.money && <span>{bd.entry.money}€</span>}
                  {bd.entry.unobtainium && <span>🔒</span>}
                </div>
                {showNumber && <div className={'number accentNumber'+accentNumber}>{bd.number}</div>}
                <div className="name" style={ {textAlign:(gt(bd.name.length,8)?'left':'center')} }>{bd.name}</div>
                <div className="text" title={nameSymbols(bd.text)} ref={tref}>{
                    bd.text.split(' ').map((w) => {
                        if (resources[w]) {
                            return <img src={'images/'+w+'.png'}/>;
                        } else {
                            return <span>{w} </span>;
                        }
                    })
                }</div>
                <div className="footer">
                  <div className="cost" title={bd.price && bd.price+' to buy'}>
                    {bd.value}{bd.price && '*'}
                  </div>
                  <div className="smallname">{bd.name}</div>
                  { bd.symbols.length>0 &&
                    <div className="symbols" title={bd.symbols.map((x)=>sym_names[x]).join(' / ')}>{bd.symbols.join('')}</div> }
                  {bd.buildcost!=undefined &&
                   <div className="build" title={JSON.stringify(bd.buildcost)}>
                     {Object.entries(bd.buildcost || {}).map( (e) => {
                         return <span>{e[1]}<img src={'images/'+e[0]+'.png'}/></span>
                     })}
                   </div>
                  }
                </div>
              </div>
            </div>);
}


export function BuildingStack(props) {
    const n = props.buildings.length;
    return (<div className="buildingStack">
            {props.buildings.map((building,i)=>{
                return ( <div className="buildingHolder" key={building} style={ {bottom: (n-i-1)*19+'px',
                                                                                 zIndex: 100-i,
                                                                                 cursor: (i?'zoom-in':'unset') } } >
                           <Building bn={building} showNumber={true} accentNumber={props.minplan==building} />
                         </div> );
            })}
            </div>);
}
