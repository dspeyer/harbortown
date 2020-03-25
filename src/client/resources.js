import React from 'react';
import './resources.css';
import {resources} from '../common/data.js';
import { ClickTarget } from './interaction.js';

export function ResourceTile(props) {
    const attrs = resources[props.type];
    if (props.type == 'money') {
        return (<div className="tile money">
                  €
                </div>);
    } else if (props.type == 'loans') {
        return (<div className="tile loan">
                  LOAN<br/>
                  -€5/7
                </div>);
    } else {
        return (<div>
                  <div className={"tile adv"+attrs.advanced}>
                    <div className={'name'+(props.type.length>=7?' small':'')}>{props.type}</div>
                    <img src={'images/'+props.type+'.png'} />
                    { attrs.food && <div className="use">{attrs.food}🍪</div> }
                    { attrs.energy && <div className="use">{attrs.energy}ϟ</div> }
                    <div className="value">€{attrs.value}</div>
                  </div>
                </div>);
    }
}

export function  ResourceStack(props) {
    let {number, type, holder} = props;
    let offsets = [];
    for (let i=0; i<number; i++) {
        offsets.push(Math.floor( i * 38 / (number-.99999) ))
    }
    let tilt = (number<3 ? 0 : Math.floor( 17 / Math.sqrt(number) ));
    return (
        <div className="stack">
          <ClickTarget holder={holder} data={type} />
          <div className="count">{number}</div>
          <div className="tiles">
            {offsets.map( (offset) => {
                return <div className="os" style={ {'left':offset+'px',
                                                'zIndex':offset,
                                                'transform':'rotate('+tilt+'deg)' } } >
                         <ResourceTile type={type} key={offset} />
                </div>
            } ) }
            { (number==0) && (
                <div className="faded">
                  <ResourceTile type={type}/>
                </div>
            )}
          </div>
        </div>
    );
}
