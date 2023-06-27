import * as bge from "bge-core";
import { Game } from "./game.js";
import { PlayerZone } from "./objects/playerzone.js";

/**
 * Custom player class for your game.
 */
export class Player extends bge.Player {
    /**
     * Handles displaying objects owned by the player.
     */
    readonly zone = new PlayerZone(this);
}
