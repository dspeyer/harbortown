import React from 'react';
import { ResourceStack } from './resources.js';

export class Player extends React.Component {
    constructor(props) {
        super(props);
        this.state = JSON.parse(JSON.stringify(props.player));
    }
    render() {
        let resourceElements = [];
        for (let i in this.state.resources) {
            let v = this.state.resources[i];
            if (v>0) resourceElements.push(<ResourceStack type={i} number={v} />);
        }
        return <div className=player style={background:this.state.color,color:(this.state.color=='khaki'?'black':'white')}>
                 <h1>{this.state.name}</h1>
                 <div className=stuff>
                   { resourceElements }
                 </div>
               </div>;
    }
}
