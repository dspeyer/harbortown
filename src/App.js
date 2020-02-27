import React from 'react';
import './App.css';
import { Town } from './town.js'
import { Player } from './player.js'
import { gameState, ui, newGame, safeCopy } from './gamestate.js'

class App extends React.Component {
    
    constructor(props) {
        super(props);
        ui.update = this.update.bind(this);
        this.state = safeCopy(gameState);
    }
    
    update() {
        this.setState(safeCopy(gameState));
    }

    render() {
        if (this.state.players.length==0) {
            this.inputRef = React.createRef();
            let self = this;
            let callback = () => {
                let n = self.inputRef.current.value;
                newGame(n);
                self.setState(safeCopy(gameState));
            };
            return (<form>
                      Number of Players:<input ref={this.inputRef}/>
                      <input type="button" value="start" onClick={callback}/>
                    </form>);
        }
        return (
            <div className="grid">
              <div className="townbox">
                <Town advancers={this.state.advancers}
                      current={this.state.currentAdvancer}
                      resources={this.state.townResources}
                      buildings={this.state.townBuildings}
                      plans={this.state.buildingPlans}/>
              </div>
              { this.state.players.map( (player,i) => { return (
                  <div className={'playerbox player_'+i+'_of_'+this.state.players.length} key={i}>
                    <Player player={player} idx={i}/>
                  </div>
              )})}
            </div>);
    }
}

export default App;
