import * as bge from "bge-core";

import { game } from "./game.js";
import { Player } from "./player.js";

export default async function auction(firstBidder: Player): Promise<Player> {
    let bidder = firstBidder;

    let highestBidder: Player = null;
    let highestBid: number = 0;

    for (let player of game.turnOrder) {
        player.bid = undefined;
    }

    const passed = new Set<Player>();

    function getNextBidder(): Player {
        let next = bidder;

        do {
            next = game.getNextPlayer(next);
        } while (passed.has(next));

        return next;
    }

    while (true) {
        const bid = await bge.anyExclusive(() => [1, 2, 3, 0]
            .filter(x => x > highestBid || x === 0)
            .map(x => bidder.prompt.click(x === 0 ? "Pass" : `Bid ${x}`, {
                return: x
            })));

        bidder.bid = bid;

        if (bid === 0) {
            bge.message.add("{0} drops out", bidder);

            passed.add(bidder);

            await bge.delay.beat();

            if (passed.size === game.turnOrder.length) {
                return null;
            }

            if (passed.size === game.turnOrder.length - 1 && highestBid !== 0) {
                return highestBidder;
            }

            bidder = getNextBidder();
            continue;
        }

        bge.message.set("{0} bids {1}", bidder, bid);

        if (bid >= 3) {
            return bidder;
        }

        highestBidder = bidder;
        highestBid = bid;

        await bge.delay.beat();

        bidder = getNextBidder();
        continue;
    }
}