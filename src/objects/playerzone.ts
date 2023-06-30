import * as bge from "bge-core";
import { Player } from "../player.js";

/**
 * This zone displays all the objects owned by a specific player.
 * This would be the place to `@bge.display` things like a personal
 * hand of cards, if your game has one.
 */
export class PlayerZone extends bge.Zone {
    /**
     * Width of each player zone in centimeters.
     */
    static readonly WIDTH = 32;
    
    /**
     * Height of each player zone in centimeters.
     */
    static readonly HEIGHT = 18;

    /**
     * The player that owns this zone.
     */
    readonly player: Player;

    constructor(player: Player) {
        super(PlayerZone.WIDTH, PlayerZone.HEIGHT);

        this.player = player;

        this.label = player.name;
        this.outlineColor = player.color;

        this.children.addProperties(player);
    }

    override render(ctx: bge.RenderContext): bge.views.IView {
        this.outlineColor = this.player.color;
        return super.render(ctx);
    }
}
