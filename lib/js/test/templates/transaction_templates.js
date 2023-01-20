import {
    sendTransaction,
    shallPass,
    shallRevert
} from "@onflow/flow-js-testing";

// Sets up each account in passed array with an NFT Collection resource,
// reading the transaction code relative to the passed base path
export async function setupAccountNFTCollection(account) {
    const [txn, e] = await shallPass(
        sendTransaction("game_piece_nft/setup_collection", [account], [])
    );
};

// Mints an NFT to nftRecipient, signed by signer,
// reading the transaction code relative to the passed base path
export async function mintNFT(signer, minterAddress) {
    // Mint a token to nftRecipient's collection
    const [mintTxn, e] = await shallPass(
        sendTransaction(
            "game_piece_nft/mint_nft",
            [signer],
            [minterAddress]
        )
    );
};

export async function accessProviderPasses(signer) {
    await shallPass(
        sendTransaction(
            "test/access_provider_or_panic",
            [signer],
            []
        )
    );
};

export async function accessProviderReverts(signer) {
    await shallRevert(
        sendTransaction(
            "test/access_provider_or_panic",
            [signer],
            []
        )
    );
};

// Sets up a GamePlayer resource in the signer's account
export async function setupGamePlayer(signer) {
    const [onboardingTxn, e] = await shallPass(
        sendTransaction(
            "rock_paper_scissors_game/game_player/setup_game_player",
            [signer],
            []
        )
    );
};

export async function accessGamePlayerIDFromPrivatePasses(signer) {
    await shallPass(
        sendTransaction(
            "test/access_game_player_id_or_panic",
            [signer],
            []
        )
    );
};

export async function accessGamePlayerIDFromPrivateReverts(signer) {
    await shallRevert(
        sendTransaction(
            "test/access_game_player_id_or_panic",
            [signer],
            []
        )
    );
};

// Configures an account with everything they need to play RockPaperScissorsGame
// Matches
export async function onboardPlayer(signer, minterAddress) {
    const [onboardingTxn, e] = await shallPass(
        sendTransaction(
            "onboarding/onboard_player",
            [signer],
            [minterAddress]
        )
    );
};

// Sets up a new RPSGame Match, escrowing the desired NFT & setting the time limit
// as given
export async function setupNewSinglePlayerMatch(account, nftID, matchTimeLimit) {
    await shallPass(
        sendTransaction(
            "rock_paper_scissors_game/game_player/setup_new_singleplayer_match",
            [account],
            [nftID, matchTimeLimit]
        )
    );
};

export async function submitMovePasses(account, matchID, move) {
    await shallPass(
        sendTransaction(
            "rock_paper_scissors_game/game_player/submit_move",
            [account],
            [matchID, move]
        )
    );
};

export async function submitMoveReverts(account, matchID, move) {
    await shallRevert(
        sendTransaction(
            "rock_paper_scissors_game/game_player/submit_move",
            [account],
            [matchID, move]
        )
    );
};