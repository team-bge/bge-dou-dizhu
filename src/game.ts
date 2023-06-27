import * as bge from "bge-core";

import { Player } from "./player.js";
import { TableCenter } from "./objects/table.js";

/**
 * Handles the main logic of your game.
 */
export class Game extends bge.Game<Player> {
    /**
     * Minimum number of players this game supports.
     */
    static readonly MIN_PLAYERS = 4;

    /**
     * Maximum number of players this game supports.
     */
    static readonly MAX_PLAYERS = 8;

    /**
     * Displays all the shared objects in the middle of the table.
     */
    @bge.display()
    readonly tableCenter = new TableCenter(this);

    /**
     * Players, sorted by turn order.
     */
    readonly turnOrder: Player[] = [];
    
    /**
     * Who's turn is it?
     */
    currentPlayer: Player;

    /**
     * Displays a zone for each player, arranged in a rectangle around the table.
     */
    @bge.display({
        arrangement: new bge.RectangularArrangement({
            size: new bge.Vector3(
                TableCenter.WIDTH + 5,
                TableCenter.HEIGHT + 5)
        })
    })
    get playerZones() {
        return this.turnOrder.map(x => x.zone);
    }

    /**
     * Game runners expect games to have a public parameterless constructor, like this.
     */
    constructor() {

        // We need to tell bge.Game<TPlayer> how to construct a player here.
        super(Player);

    }

    override getNextPlayer(player: Player): Player {
        const index = this.turnOrder.indexOf(player);
        return this.turnOrder[(index + 1) % this.turnOrder.length];
    }

    protected override async onRun(): Promise<bge.IGameResult> {
        await this.startGame();

        // Main game logic here...

        return await this.endGame();
    }

    async startGame(): Promise<void> {
        
        // Pick turn order

        this.turnOrder.length = 0;
        this.turnOrder.push(...this.players);

        bge.random.shuffle(this.turnOrder);

        this.currentPlayer = this.turnOrder[0];
    }

    async endGame(): Promise<bge.IGameResult> {

        bge.message.set("Game over!");

        await bge.delay.long();

        // Return final scores to end the game

        return {
            scores: this.players.map(x => 0)
        };
    }
}
