import * as bge from "bge-core";

import { Player, Team } from "./player.js";
import { TableCenter } from "./objects/table.js";
import { PlayingCard, CardColor, CardValue } from "bge-playingcard";
import auction from "./auction.js";
import { BOMB, IHand, ROCKET, getPossibleHands } from "./categories.js";

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

        while (await this.playRound()) { }

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
                player.team = Team.PEASANTS;
            } else {
                player.team = Team.LANDLORD;
            }
        }

        if (landlord == null) {
            return false;
        }

        bge.message.set("{0} becomes the landlord!", landlord);

        await bge.delay.short();

        landlord.hand.addRange(this.drawPile.removeAll());

        let player = landlord;
        const peasants = this.turnOrder.filter(x => x != landlord);

        while (player.hand.count > 0) {
            let bestHand: IHand = null;
            let passCount = 0;

            while (passCount < 2) {
                const playedHand = await this.playHand(player, bestHand);

                if (playedHand == null) {
                    player = this.getNextPlayer(player);
                    ++passCount;
                    continue;
                }

                if (playedHand.category === ROCKET || playedHand.category === BOMB) {
                    bge.message.add("The wager {0}!", "doubles");
                    landlord.bid *= 2;

                    await bge.delay.short();
                }

                bestHand = playedHand;
                passCount = 0;

                if (player.hand.count === 0) {
                    break;
                }

                player = this.getNextPlayer(player);
            }

            if (player.hand.count === 0) {
                break;
            }

            bge.message.set("{0} wins the hand!", player);

            this.discardPile.addRange(this.lastPlayedHand.removeAll());

            await bge.delay.short();
        }

        await bge.delay.beat();

        if (player === landlord) {
            bge.message.set("The {0} wins!", "Landlord");
            landlord.score += landlord.bid * 2;
            peasants.forEach(x => x.score -= landlord.bid);
        } else {
            bge.message.set("The {0} win!", "Peasants");
            landlord.score -= landlord.bid * 2;
            peasants.forEach(x => x.score += landlord.bid);
        }

        await bge.delay.beat();

        const losingPlayers = this.players.filter(x => x.score < 0);
        const votes = await bge.all(() => losingPlayers.map(x => this.continueVote(x)));

        if (votes.every(x => x)) {
            return true;
        }

        bge.message.set("Someone voted to resign!");

        await bge.delay.short();
        await this.cleanUp();

        return false;
    }

    continueVote(player: Player): Promise<boolean> {
        return bge.anyExclusive(() => [
            player.prompt.click("Resign", { return: false }),
            player.prompt.click("Continue", { return: true })
        ]);
    }

    static isBetterHand(hand: IHand, toBeat: IHand): boolean {
        if (hand.category === ROCKET) {
            return true;
        }

        if (hand.category === BOMB && toBeat.category !== BOMB) {
            return toBeat.category !== ROCKET;
        }

        return hand.category === toBeat.category
            && hand.chain.length === toBeat.chain.length
            && compareCards(hand.chain[0].primal[0], toBeat.chain[0].primal[0]) > 0;
    }

    static getAllCards(hand: IHand): readonly PlayingCard[] {
        const cards = [];

        for (let element of hand.chain) {
            cards.push(...element.primal);
            cards.push(...element.kicker);
        }

        return cards;
    }

    static containsCard(hand: IHand, card: PlayingCard): boolean {
        for (let element of hand.chain) {
            if (element.primal.includes(card)) return true;
            if (element.kicker.includes(card)) return true;
        }

        return false;
    }

    static isHandComplete(hand: IHand, selected: readonly PlayingCard[]): boolean {
        const required = this.getAllCards(hand);
        return required.length === selected.length && selected.every(x => required.includes(x));
    }

    noPossibleHands(player: Player, toBeat: IHand): boolean {
        const discarded = [...this.discardPile, ...this.lastPlayedHand];

        const rocketPossible = player.hand.count >= 2 && !discarded.some(x => x.value === CardValue.Joker);
        const bombPossible = player.hand.count >= 4;
        const followPossible = player.hand.count >= Game.getAllCards(toBeat).length;

        return !rocketPossible && !bombPossible && !followPossible;
    }

    async playHand(player: Player, toBeat?: IHand): Promise<IHand> {
        let hands = getPossibleHands(player.hand);

        if (toBeat != null) {
            hands = hands.filter(x => Game.isBetterHand(x, toBeat));
        }

        if (hands.length === 0 && toBeat != null && this.noPossibleHands(player, toBeat)) {
            bge.message.set("{0} passes", player);
            
            player.hand.setSelected(false);

            return null;
        }

        let canAutoSelect = false;
        let prevPartialHands: readonly IHand[] = [];

        while (true) {
            const selected = player.hand.selected;
            const partialHands = selected.length === 0 ? hands : hands
                .filter(x => selected.every(y => Game.containsCard(x, y)));

            const selectable = player.hand.unselected
                .filter(x => partialHands.some(y => Game.containsCard(y, x)));

            const completeHand = selected.length > 0
                ? partialHands.find(x => Game.isHandComplete(x, selected))
                : null;
                
            const mustSelectValues = new Set<CardValue>();

            if (partialHands.length > 0) {
                for (let card of Game.getAllCards(partialHands[0])) {
                    if (!selectable.includes(card)) {
                        continue;
                    }

                    mustSelectValues.add(card.value);
                }

                for (let hand of partialHands.slice(1)) {               
                    const values = [...mustSelectValues];
                    const inHand = new Set(Game.getAllCards(hand).map(x => x.value));

                    for (let value of values) {
                        if (!inHand.has(value)) {
                            mustSelectValues.delete(value);
                        }
                    }
                }
            }

            const autoSelectable = selectable
                .filter(x => partialHands.every(y => mustSelectValues.has(x.value)));
            const autoDeselectable = selected
                .filter(x => hands.filter(y => Game.containsCard(y, x)).length
                    === prevPartialHands.filter(y => Game.containsCard(y, x)).length);

            let handName = completeHand?.category.name;

            if (completeHand?.chain.length > 1) {
                handName += " Chain";
            }

            let result: PlayingCard | boolean | null;

            if (toBeat?.category === ROCKET) {
                result = false;
            } else if (canAutoSelect && autoSelectable.length > 0) {
                result = autoSelectable[0];
            } else if (!canAutoSelect && autoDeselectable.length > 0) {
                result = autoDeselectable[0];
            } else {
                result = await bge.anyExclusive(() => [
                    player.prompt.clickAny(selectable, {
                        message: "Select a card"
                    }),
                    player.prompt.clickAny(selected, {
                        message: "Deselect a card"
                    }),
                    player.prompt.click("Deselect All", {
                        if: selected.length > 1,
                        return: null
                    }),
                    player.prompt.click(`Play ${handName}`, {
                        if: completeHand != null,
                        return: true
                    }),
                    player.prompt.click("Pass", {
                        if: toBeat != null && selected.length === 0,
                        return: false
                    })
                ]);
            }

            prevPartialHands = partialHands;

            if (result instanceof PlayingCard) {
                canAutoSelect = !player.hand.getSelected(result);
                player.hand.toggleSelected(result);
                continue;
            }

            if (result == null) {
                canAutoSelect = false;
                player.hand.setSelected(false);
                continue;
            }

            if (result) {
                this.discardPile.addRange(this.lastPlayedHand.removeAll());

                bge.message.set("{0} plays {1}", player, selected);

                player.hand.removeAll(selected);
                this.lastPlayedHand.addRange(selected);

                await bge.delay.beat();

                return completeHand;
            }

            player.hand.setSelected(false);

            bge.message.set("{0} passes", player);

            return null;
        }
    }

    async cleanUp(): Promise<void> {
        this.discardPile.addRange(this.lastPlayedHand.removeAll());

        for (let player of this.turnOrder) {
            player.bid = undefined;
            player.team = Team.NONE;
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

        this.drawPile.shuffle(3, this.drawPile.count);
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

        bge.message.add("Game over!");

        await bge.delay.long();

        // Return final scores to end the game

        return {
            scores: this.players.map(x => x.score)
        };
    }
}

export let game: Game;