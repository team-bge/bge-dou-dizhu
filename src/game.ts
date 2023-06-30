import * as bge from "bge-core";

import { Player } from "./player.js";
import { TableCenter } from "./objects/table.js";
import { PlayingCard, CardColor, CardValue } from "bge-playingcard";
import auction from "./auction.js";
import { getPossibleHands } from "./categories.js";

function getCardScore(card: PlayingCard): number {
    switch (card.value) {
        case CardValue.Ace:
            return CardValue.King + 1;

        case CardValue.Two:
            return CardValue.King + 2;

        case CardValue.Joker:
            return CardValue.King + (card.color === CardColor.Red ? 4 : 3);

        default:
            return card.value;
    }
}

export function compareCards(a: PlayingCard, b: PlayingCard): number {
    return getCardScore(a) - getCardScore(b);
}

export function autoSortCompareCards(a: PlayingCard, b: PlayingCard): number {
    const valueCompare = compareCards(a, b);

    if (valueCompare === 0) {
        return a.suit - b.suit;
    }

    return valueCompare;
}

/**
 * Handles the main logic of your game.
 */
export class Game extends bge.Game<Player> {
    /**
     * Minimum number of players this game supports.
     */
    static readonly MIN_PLAYERS = 3;

    /**
     * Maximum number of players this game supports.
     */
    static readonly MAX_PLAYERS = 3;

    /**
     * Displays all the shared objects in the middle of the table.
     */
    @bge.display()
    readonly tableCenter = new TableCenter();

    readonly drawPile = new bge.Deck(PlayingCard, {
        orientation: bge.CardOrientation.FACE_DOWN
    });
    
    readonly discardPile = new bge.Deck(PlayingCard, {
        orientation: bge.CardOrientation.FACE_UP
    });

    readonly lastPlayedHand = new bge.Hand(PlayingCard, 20);

    /**
     * Players, sorted by turn order.
     */
    readonly turnOrder: Player[] = [];

    /**
     * Displays a zone for each player, arranged in a rectangle around the table.
     */
    @bge.display({
        position: { y: -2 },
        rotation: bge.Rotation.z(180),
        arrangement: new bge.RadialArrangement({
            innerRadius: 18
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

        game = this;
    }

    override getNextPlayer(player: Player): Player {
        const index = this.turnOrder.indexOf(player);
        return this.turnOrder[(index + 1) % this.turnOrder.length];
    }

    protected override async onRun(): Promise<bge.IGameResult> {
        await this.startGame();

        while (true) {
            const fullRound = await this.playRound();
        }

        return await this.endGame();
    }

    async startGame(): Promise<void> {
        // Pick turn order

        this.turnOrder.length = 0;
        this.turnOrder.push(...this.players);

        bge.random.shuffle(this.turnOrder);

        // Create deck

        this.drawPile.addRange(PlayingCard.generateDeck());
        this.drawPile.add(PlayingCard.createJoker(CardColor.Black));
        this.drawPile.add(PlayingCard.createJoker(CardColor.Red));
    }

    async playRound(): Promise<boolean> {
        bge.message.set("Round start!");

        await this.cleanUp();
        const firstBidder = await this.dealHands();

        bge.message.set("{0} bids first!", firstBidder);

        await bge.delay.short();

        const landlord = await auction(firstBidder);

        for (let player of this.turnOrder) {
            if (player !== landlord) {
                player.bid = undefined;
            }
        }

        if (landlord == null) {
            return false;
        }

        bge.message.set("{0} becomes the landlord!", landlord);

        await bge.delay.short();

        landlord.hand.addRange(this.drawPile.removeAll());

        let startingPlayer = landlord;

        while (startingPlayer.hand.count > 0) {
            const hands = getPossibleHands(startingPlayer.hand);

            for (let hand of hands) {
                console.log(`${hand.category.name}: ${hand.chain.map(x => `([${x.primal.map(y => y.name).join(", ")}] + [${x.kicker.map(y => y.name).join(", ")}])`).join(", ")}`);
            }

            await bge.delay.seconds(10);
            break;
        }

        return true;
    }

    async cleanUp(): Promise<void> {
        this.discardPile.addRange(this.lastPlayedHand.removeAll());

        for (let player of this.turnOrder) {
            player.bid = undefined;
            this.discardPile.addRange(player.hand.removeAll());
        }

        await bge.delay.beat();
    }

    async dealHands(): Promise<Player> {
        this.drawPile.addRange(this.discardPile.removeAll());
        this.drawPile.shuffle();

        await bge.delay.beat();

        const faceUpCard = this.drawPile.top;

        bge.message.add("The player that receives the {0} will bid first", faceUpCard);

        this.drawPile.setOrientation(this.drawPile.top, bge.CardOrientation.FACE_UP);

        await bge.delay.short();

        this.drawPile.shuffle();
        this.drawPile.deal(this.turnOrder.map(x => x.hand), 17);

        let firstBidder: Player;

        for (let player of this.turnOrder) {
            if (player.hand.has(faceUpCard)) {
                player.hand.setOrientation(faceUpCard, bge.CardOrientation.FACE_UP);
                firstBidder = player;
            }
        }

        await bge.delay.beat();

        return firstBidder;
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

export let game: Game;