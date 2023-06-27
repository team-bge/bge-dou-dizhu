import * as bge from "bge-core";

import { Game } from "../game.js";

/**
 * This zone displays all the shared objects in the middle of the table.
 * This would be the place to `@bge.display` a board, if your game has one.
 */
export class TableCenter extends bge.Zone {
    private readonly game: Game;

    static readonly WIDTH = 24;
    static readonly HEIGHT = 26;

    constructor(game: Game) {
        super();

        this.game = game;

        this.width = TableCenter.WIDTH;
        this.height = TableCenter.HEIGHT;
    }
}
