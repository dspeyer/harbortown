import React from 'react';
import './App.css';
import { Town } from './town.js'
import { Player } from './player.js'
import { safeCopy, restore } from '../common/utils.js'
import { gameState, ui } from './state.js';

class App extends React.Component {
    
    constructor(props) {
        super(props);
        ui.update = this.update.bind(this);
        this.state = safeCopy(gameState);
    }
    
    update() {
        const whoami = gameState.players.filter((x)=>x.isMe).map((x)=>x.name).join('/');
        document.title = gameState.desc + ' [' + whoami + '] -- HarborTown';
        this.setState(safeCopy(gameState));
    }

    render() {
        if (this.state.players.length==0) {
            return <div>Loading...</div>;
        }
        return (
            <div className="grid">
              <div className="townbox">
                <Town advancers={this.state.advancers}
                      current={this.state.currentAdvancer}
                      resources={this.state.townResources}
                      buildings={this.state.townBuildings}
                      plans={this.state.buildingPlans}
                      ships={this.state.ships}
                      turn={this.state.currentTurn}
                      dbb={this.state.disks_by_building}
                      myturn={this.state.players[this.state.currentPlayer].isMe} />
              </div>
              { this.state.players.map( (player,i) => { return (
                  <div className={'playerbox player_'+i+'_of_'+this.state.players.length} key={i}>
                    <Player player={player} dbb={this.state.disks_by_building} idx={i}/>
                  </div>
              )})}
              <div className="dbg">
                <div className="scrolling">
                  {JSON.stringify(gameState,null,2)}
                </div>
                <textarea id="loadable" rows="20" cols="80" /><br/>
                <input type="button" value="Restore"
                       onClick={()=>{restore(gameState,JSON.parse(document.getElementById('loadable').value));
                                     ui.update();}} />
              </div>
            </div>);
    }
}

export default App;
