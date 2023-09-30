import * as bge from "bge-core";

import { autoSortCompareCards, game } from "./game.js";

import { PlayerZone } from "./objects/playerzone.js";
import { PlayingCard } from "bge-playingcard";

export enum Team {
    NONE,
    LANDLORD,
    PEASANTS
}

/**
 * Custom player class for your game.
 */
export class Player extends bge.Player {
    @bge.display({
        label: "Score",
        position: { y: 5 }
    })
    score: number = 0;

    team = Team.NONE;

    bid: number;

    @bge.display({
        label: "Bid",
        position: { y: 5, x: 8 }
    })
    get bidStatus() {
        return this.bid === 0
            ? "Pass"
            : this.bid;
    }

    @bge.display({
        label: "Team",
        position: { y: 5, x: -8 },
        fontScale: 0.5
    })
    get teamName() {
        switch (this.team) {
            case Team.LANDLORD:
                return "Landlord";
            case Team.PEASANTS:
                return "Peasant";
        }
    }

    get color() {
        switch (this.team) {
            case Team.LANDLORD:
                return bge.Color.parse("#ff0000");
            case Team.PEASANTS:
                return bge.Color.parse("#0000ff");
            default:
                return bge.Color.parse("#ffffff");
        }
    }

    @bge.display(function (this: Player) { return {
        revealedFor: [this],
        position: { y: -3 }
    }})
    readonly hand = new bge.Hand(PlayingCard, 30, {
        autoSort: autoSortCompareCards
    });

    /**
     * Handles displaying objects owned by the player.
     */
    readonly zone = new PlayerZone(this);
}
