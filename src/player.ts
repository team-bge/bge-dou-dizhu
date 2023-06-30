import * as bge from "bge-core";

import { autoSortCompareCards, game } from "./game.js";

import { PlayerZone } from "./objects/playerzone.js";
import { PlayingCard } from "bge-playingcard";

/**
 * Custom player class for your game.
 */
export class Player extends bge.Player {
    @bge.display({
        label: "Score",
        position: { y: 5 }
    })
    score: number = 0;

    bid: number;

    @bge.display({
        label: "Bid",
        position: { y: 5, x: 10 }
    })
    get bidStatus() {
        return this.bid === 0
            ? "Pass"
            : this.bid;
    }

    @bge.display(function () { return {
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
