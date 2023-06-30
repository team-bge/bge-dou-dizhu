import * as bge from "bge-core";

import { game } from "../game.js";

/**
 * This zone displays all the shared objects in the middle of the table.
 * This would be the place to `@bge.display` a board, if your game has one.
 */
export class TableCenter extends bge.Zone {
    static readonly WIDTH = 24;
    static readonly HEIGHT = 26;

    @bge.display({
        label: "Draw Pile",
        position: { x: -5, y: 5 }
    })
    get drawPile() {
        return game.drawPile;
    }
    
    @bge.display({
        label: "Discard Pile",
        position: { x: 5, y: 5 }
    })
    get discardPile() {
        return game.discardPile;
    }

    @bge.display({
        label: "Last Played Hand",
        position: { y: -7 }
    })
    get lastPlayedHand() {
        return game.lastPlayedHand;
    }

    constructor() {
        super();
        
        this.width = TableCenter.WIDTH;
        this.height = TableCenter.HEIGHT;
    }
}
