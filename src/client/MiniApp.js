import React from 'react';
import './MiniApp.css';
import { Town, ButtonBar, BuildingPlans } from './town.js'
import { Player } from './player.js'
import { safeCopy } from '../common/utils.js'
import { gameState, ui } from './state.js';

class MiniApp extends React.Component {
    
    constructor(props) {
        super(props);
        ui.update = this.update.bind(this);
        this.state = {gs:safeCopy(gameState), tab:0}
        let self = this;
        ui.setTab = (tabFor) => {
            if (tabFor=='town') self.setState({tab:0});
            else if (tabFor=='bps') self.setState({tab:1});
            else self.setState({tab:tabFor.number+2});
        };
    }
    
    update() {
        const whoami = gameState.players.filter((x)=>x.isMe).map((x)=>x.name).join('/');
        document.title = gameState.desc + ' [' + whoami + '] -- HarborTown';
        this.setState({gs:safeCopy(gameState)});
    }

    render() {
        if (this.state.gs.players.length==0) {
            return <div>Loading...</div>;
        }
        let tabs = [{t:'Town',c:'white'},{t:'Building Plans',c:'cyan'}] .concat( this.state.gs.players.map((p)=>({t:p.name,c:p.color})) );
        tabs[this.state.gs.currentPlayer+2].t+='*';
        const self=this;
        return (
            <div className="mini">
              <div className="tabBar">
                { tabs.map((t,i) =>
                           <div class={'tab active'+(self.state.tab==i)}
                                style={{background:t.c,color:(t.c in {white:1,cyan:1,khaki:1} ? 'black' : 'white')}}
                                onClick={()=>{self.setState({tab:i})}}>
                             {t.t}
                           </div>) }
              </div>
              <div className="townbox" style={{display:(this.state.tab==0)?'block':'none'}}>
                <Town advancers={this.state.gs.advancers}
                      current={this.state.gs.currentAdvancer}
                      resources={this.state.gs.townResources}
                      buildings={this.state.gs.townBuildings}
                      plans={this.state.gs.buildingPlans}
                      ships={this.state.gs.ships}
                      turn={this.state.gs.currentTurn}
                      dbb={this.state.gs.disks_by_building}
                      myturn={this.state.gs.players[this.state.gs.currentPlayer].isMe}
                      miniified={true} />
              </div>
              <div style={{display:(this.state.tab==1)?'block':'none'}} className="bpHolder">
                <BuildingPlans plans={this.state.gs.buildingPlans} />
              </div>
              {
                  this.state.gs.players.map( (player,i) => 
                                             <div key={i} style={{display:(this.state.tab==(i+2))?'block':'none'}}>
                                               <Player player={player} dbb={this.state.gs.disks_by_building} idx={i}/>
                                             </div>
              )}
              <ButtonBar myturn={this.state.gs.players[this.state.gs.currentPlayer].isMe} feeding={this.state.gs.currentAdvancer==-1} />
            </div>);
    }
}

export default MiniApp;
