import { expect } from "@jest/globals";
import { executeScript } from "@onflow/flow-js-testing";

// Executes get_collection_ids script with passed params,
// returning array of NFT IDs contained in the address's collection
export async function getCollectionIDs(address) {
    const [result, err] = await executeScript(
        "game_piece_nft/get_collection_ids",
        [address]
    );
    expect(err).toBeNull();
    return result;
};

export async function getGamePlayerID(address) {
    const [result, err] = await executeScript(
        "rock_paper_scissors_game/get_game_player_id",
        [address]
    );
    expect(err).toBeNull();
    return result;
};

export async function getMatchesInPlay(address) {
    const [result, err] = await executeScript(
        "rock_paper_scissors_game/get_matches_in_play",
        [address]
    );
    expect(err).toBeNull();
    return result;
};


