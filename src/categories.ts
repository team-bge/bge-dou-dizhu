import * as bge from "bge-core";
import { CardValue, PlayingCard } from "bge-playingcard";

export enum KickerType {
    NONE,
    SOLO,
    PAIR,
    DUAL_SOLO,
    DUAL_PAIR
}

export interface IHandCategory {
    name: string;
    primalCount: number;
    kicker: KickerType;
    minChainCount?: number;
}

export const HAND_CATEGORIES: IHandCategory[] = [
    {
        name: "Solo",
        primalCount: 1,
        kicker: KickerType.NONE,
        minChainCount: 5
    },
    {
        name: "Pair",
        primalCount: 2,
        kicker: KickerType.NONE,
        minChainCount: 3
    },
    {
        name: "Trio",
        primalCount: 3,
        kicker: KickerType.NONE,
        minChainCount: 2
    },
    {
        name: "Trio + Kicker",
        primalCount: 3,
        kicker: KickerType.SOLO,
        minChainCount: 2
    },
    {
        name: "Full House",
        primalCount: 3,
        kicker: KickerType.PAIR,
        minChainCount: 2
    },
    {
        name: "Four of a Kind",
        primalCount: 4,
        kicker: KickerType.NONE
    },
    {
        name: "Four of a Kind + Two Kickers",
        primalCount: 4,
        kicker: KickerType.DUAL_SOLO
    },
    {
        name: "Four of a Kind + Two Pairs",
        primalCount: 4,
        kicker: KickerType.DUAL_PAIR
    }
];

export interface IChainElement {
    primal: readonly PlayingCard[];
    kicker: readonly PlayingCard[];
}

export interface IHand {
    category: IHandCategory;
    chain: readonly IChainElement[];
}

function listChoices<T>(items: readonly T[], count: number, firstIndex?: number): readonly(readonly T[])[] {
    firstIndex ??= 0;
    const itemCount = items.length - firstIndex;

    if (itemCount < count) {
        return [];
    }

    if (itemCount === count) {
        return [items.slice(firstIndex)];
    }

    if (count === 0) {
        return [[]];
    }

    if (count === 1) {
        return items.slice(firstIndex).map(x => [x]);
    }

    const choices: (readonly T[])[] = [];

    for (let i = firstIndex; i < items.length - count + 1; ++i) {
        const first = items[i];
        const tails = listChoices(items, count - 1, i + 1);

        for (let tail of tails) {
            choices.push([first, ...tail]);
        }
    }

    return choices;
}

export function getPossibleHands(cards: Iterable<PlayingCard>, category?: IHandCategory): readonly IHand[] {
    const map = new Map<CardValue, PlayingCard[]>();

    for (let card of cards) {
        let list = map.get(card.value);

        if (list == null) {
            list = [];
            map.set(card.value, list);
        }

        list.push(card);
    }

    const categories = category == null ? HAND_CATEGORIES : [category];
    const hands: IHand[] = [];

    for (let category of categories) {
        for (let primalValue of map.keys()) {
            const primalCards = map.get(primalValue);
            const primalChoices = listChoices(primalCards, category.primalCount);

            for (let primal of primalChoices) {
                const kickers: (readonly PlayingCard[])[] = [];

                switch (category.kicker) {
                    case KickerType.NONE:
                        kickers.push([]);
                        break;

                    case KickerType.SOLO:
                        kickers.push(...[...cards]
                            .filter(x => x.value !== primalValue)
                            .map(x => [x]));
                        break;

                    case KickerType.PAIR:
                        kickers.push(...[...map]
                            .filter(([value, cards]) => value !== primalValue && cards.length >= 2)
                            .flatMap(([_, cards]) => listChoices(cards, 2)));
                        break;

                    case KickerType.DUAL_SOLO:
                        const soloValues = listChoices([...map]
                            .filter(([value, _]) => value !== primalValue)
                            .map(([value, _]) => value), 2);
                        kickers.push(...soloValues
                            .flatMap(([a, b]) => map.get(a)
                                .flatMap(cardA => map.get(b)
                                    .map(cardB => [cardA, cardB]))));
                        break;

                    case KickerType.DUAL_PAIR:
                        const pairValues = listChoices([...map]
                            .filter(([value, cards]) => value !== primalValue && cards.length >= 2)
                            .map(([value, _]) => value), 2);
                        kickers.push(...pairValues
                            .flatMap(([a, b]) => listChoices(map.get(a), 2)
                                .flatMap(pairA => listChoices(map.get(b), 2)
                                    .map(pairB => [...pairA, ...pairB]))));
                        break;
                }

                for (let kicker of kickers) {
                    hands.push({
                        category: category,
                        chain: [{
                            primal: primal,
                            kicker: kicker
                        }]
                    });
                }
            }
        }
    }

    // TODO: Chains

    return hands;
}