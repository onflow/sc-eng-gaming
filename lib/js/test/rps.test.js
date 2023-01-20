import path from "path";
import { 
  emulator, 
  init, 
  getAccountAddress, 
  deployContractByName, 
  sendTransaction, 
  shallPass,
  shallRevert,
  executeScript 
} from "@onflow/flow-js-testing";
import fs from "fs";
import {
  assertCollectionLength,
  assertNFTInCollection
} from "./templates/assertion_templates";
import {
  setupAccountNFTCollection,
  mintNFT,
  accessProviderPasses,
  accessProviderReverts,
  setupGamePlayer,
  accessGamePlayerIDFromPrivatePasses,
  accessGamePlayerIDFromPrivateReverts,
  onboardPlayer,
  setupNewSinglePlayerMatch
} from "./templates/transaction_templates";
import {
  getCollectionIDs, getGamePlayerID
} from "./templates/script_templates";

// Auxiliary function for deploying the cadence contracts
async function deployContract(param) {
  const [result, error] = await deployContractByName(param);
  if (error != null) {
    console.log(`Error in deployment - ${error}`);
    emulator.stop();
    process.exit(1);
  }
}

const MATCH_TIME_LIMIT = 10
const get_collection_ids = fs.readFileSync(path.resolve(__dirname, "./../../../scripts/game_piece_nft/get_collection_ids.cdc"), {encoding:'utf8', flag:'r'});
const get_matches_in_play = fs.readFileSync(path.resolve(__dirname, "./../../../scripts/rock_paper_scissors_game/get_matches_in_play.cdc"), {encoding:'utf8', flag:'r'});
const get_match_move_history = fs.readFileSync(path.resolve(__dirname, "./../../../scripts/rock_paper_scissors_game/get_match_move_history.cdc"), {encoding:'utf8', flag:'r'});
const get_rps_win_loss = fs.readFileSync(path.resolve(__dirname, "./../../../scripts/game_piece_nft/get_rps_win_loss.cdc"), {encoding:'utf8', flag:'r'});

// Defining the test suite for the fungible token switchboard
describe("rockpaperscissorsgame", ()=>{

  // Variables for holding the account address
  let serviceAccount;
  let gameAdmin;
  let playerOne;
  let playerTwo;

  // Before each test...
  beforeEach(async () => {
    // We do some scafolding...

    // Getting the base path of the project
    const basePath = path.resolve(__dirname, "./../../../"); 
		// You can specify different port to parallelize execution of describe blocks
    const port = 8080; 
		// Setting logging flag to true will pipe emulator output to console
    const logging = false;

    await init(basePath);
    await emulator.start({ logging });

    // ...then we deploy the ft and example token contracts using the getAccountAddress function
    // from the flow-js-testing library...

    // Create a service account and deploy contracts to it
    serviceAccount = await getAccountAddress("ServiceAccount")
    gameAdmin = await getAccountAddress("GameAdmin");
    
    await deployContract({ to: serviceAccount, name: "utility/FungibleToken"});
    await deployContract({ to: serviceAccount, name: "utility/NonFungibleToken"});
    await deployContract({ to: serviceAccount, name: "utility/MetadataViews"});
    await deployContract({ to: serviceAccount, name: "GamingMetadataViews"});
    await deployContract({ to: serviceAccount, name: "GamePieceNFT"});
    await deployContract({ to: gameAdmin, name: "RockPaperScissorsGame"});

    playerOne = await getAccountAddress("PlayerOne");
    playerTwo = await getAccountAddress("PlayerTwo");

  });

  // After each test we stop the emulator, so it could be restarted
  afterEach(async () => {
    return emulator.stop();
  });

  // First test checks if a user can get a GamePieceNFT
  test("player should be able to mint GamePieceNFT", async () => {
    // First step: create a collection
    await setupAccountNFTCollection(playerOne)
    // Second step: mint NFT
    await mintNFT(playerOne, serviceAccount)
    // Third step: assert collection length
    await assertCollectionLength(playerOne, 1)
  });

  // Second test checks if a player is able to create a GameMatch
  test("player should be able to create a GamePlayer", async () => {
    // First step: create, save & link a GamePlayer resource
    await setupGamePlayer(playerOne);
    // Second step: ensure GamePlayerPublic capability is accessible to all
    const gamePlayerID = await getGamePlayerID(playerOne)
    expect(gamePlayerID).not.toBe(null)
    // Third step: ensure GamePlayerID private capability is accessible to signer
    await accessGamePlayerIDFromPrivatePasses(playerOne);
    // Fourth step: ensure GamePlayerID private capabilitiy is not accessible to public
    await accessGamePlayerIDFromPrivateReverts(serviceAccount);
  });

  // Second test checks if a player is able to create a GameMatch
  test("player should have all resources configured with single onboarding transaction", async () => {
    // First step: create, save & link GamePlayer & Collection resources & mint NFT
    await onboardPlayer(playerOne, serviceAccount);
    // Second step: ensure GamePlayerPublic capability is accessible
    const gamePlayerID = await getGamePlayerID(playerOne)
    expect(gamePlayerID).not.toBe(null)
    // Third step: ensure GamePlayerID private capability is accessible to signer
    await accessGamePlayerIDFromPrivatePasses(playerOne);
    // Fourth step: ensure GamePlayerID private capabilitiy is not accessible to public
    await accessGamePlayerIDFromPrivateReverts(serviceAccount);
    // Fifth step: ensure CollectionPublic capability is accessible to all by checking Collection length
    await assertCollectionLength(playerOne, 1);
    // Sixth step: ensure Provider capability is accessible to signer
    await accessProviderPasses(playerOne)
    // Seventh step: ensure Provider capability is not accessible to all
    await accessProviderReverts(serviceAccount)
  });

  // Third test checks if a player is able to create a single player Match, escrowing its GamePieceNFT
  test("player should be able to create a single player Match", async () => {
    // First step: create, save & link GamePlayer & Collection resources & mint NFT
    await onboardPlayer(playerOne, serviceAccount);
    // Second step: get the GamePieceNFT id
    const collectionIDs = await getCollectionIDs(playerOne);
    // Third step: create a Match resource for a single player
    await setupNewSinglePlayerMatch(playerOne, parseInt(collectionIDs[0]), MATCH_TIME_LIMIT)
  });

  // Forth test checks if a player is able to submit moves to a  single player match
  test("player should be able to submit Move to a single player Match", async () => {
    // First step: create a collection
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/setup_collection",
        args: [],
        signers: [playerOne]
      })
    );
    // Second step: mint an NFT
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/mint_nft",
        args: [serviceAccount],
        signers: [playerOne]
      })
    );
    // Third step: create a GamePlayer resource
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_game_player",
        args: [],
        signers: [playerOne]
      })
    );
    // Fourth step: get the GamePieceNFT id
    const [nftIDs, e1] = await executeScript({
      code: get_collection_ids,
      args: [playerOne]
    });
    // Fifth step: create a Match resource for a single player
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_new_singleplayer_match",
        args: [parseInt(nftIDs[0]), 10],
        signers: [playerOne]
      })
    );
    // Sixth step: get the Match id
    const [matchesID, e2] = await executeScript({
      code: get_matches_in_play,
      args: [playerOne]
    });
    // Seventh step: submit move to match 
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/submit_moves",
        args: [parseInt(matchesID[0]), 0], // Any decent RPS player will always play rock on the first round
        signers: [playerOne]
      })
    );
  });

  // Fifth test checks if a player is able to submit autoplayer move to a single player Match
  test("player should be able to submit autoplayer Move to a single player Match", async () => {
    // First step: create a collection
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/setup_collection",
        args: [],
        signers: [playerOne]
      })
    );
    // Second step: mint an NFT
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/mint_nft",
        args: [serviceAccount],
        signers: [playerOne]
      })
    );
    // Third step: create a GamePlayer resource
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_game_player",
        args: [],
        signers: [playerOne]
      })
    );
    // Fourth step: get the GamePieceNFT id
    const [nftIDs, e1] = await executeScript({
      code: get_collection_ids,
      args: [playerOne]
    });
    // Fifth step: create a Match resource for a single player
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_new_singleplayer_match",
        args: [parseInt(nftIDs[0]), 10],
        signers: [playerOne]
      })
    );
    // Sixth step: get the Match id
    const [matchesID, e2] = await executeScript({
      code: get_matches_in_play,
      args: [playerOne]
    });
    // Seventh step: submit player and autoplayer moves to match 
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/submit_both_singleplayer_moves",
        args: [parseInt(matchesID[0]), 0], // Any decent RPS player will always play rock on the first round
        signers: [playerOne]
      })
    );
  });

  // Sixth test checks if a player is able to join an already existing match
  test("player should be able to join an existing Match", async () => {
    // First step: create a collection for player one and two
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/setup_collection",
        args: [],
        signers: [playerOne]
      })
    );
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/setup_collection",
        args: [],
        signers: [playerTwo]
      })
    );
    // Second step: mint an NFT for player one and two
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/mint_nft",
        args: [serviceAccount],
        signers: [playerOne]
      })
    );
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/mint_nft",
        args: [serviceAccount],
        signers: [playerTwo]
      })
    );
    // Third step: create a GamePlayer resource for player one and two
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_game_player",
        args: [],
        signers: [playerOne]
      })
    );
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_game_player",
        args: [],
        signers: [playerTwo]
      })
    );
    // Fourth step: get the GamePieceNFT ids
    const [nftIDs, e1] = await executeScript({
      code: get_collection_ids,
      args: [playerOne]
    });
    const [nftIDs2, e3] = await executeScript({
      code: get_collection_ids,
      args: [playerTwo]
    });
    // Fifth step: create a Match resource for a multi player match
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_new_multiplayer_match",
        args: [parseInt(nftIDs[0]), playerTwo, 10],
        signers: [playerOne]
      })
    );
    // Sixth step: get the Match id
    const [matchesID, e2] = await executeScript({
      code: get_matches_in_play,
      args: [playerOne]
    });
    // Seventh step: signup player 2 to match
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/escrow_nft_to_existing_match",
        args: [parseInt(matchesID[0]), parseInt(nftIDs2[0])],
        signers: [playerTwo]
      })
    )
  });
  // Sixth test checks if a player is able to submit auto player moves to the match it is playing
  test("player should be able to complete SinglePlayer match", async () => {
    // First step: create a collection
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/setup_collection",
        args: [],
        signers: [playerOne]
      })
    );
    // Second step: mint an NFT
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/mint_nft",
        args: [serviceAccount],
        signers: [playerOne]
      })
    );
    // Third step: create a GamePlayer resource
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_game_player",
        args: [],
        signers: [playerOne]
      })
    );
    // Fourth step: get the GamePieceNFT id
    const [nftIDs, e1] = await executeScript({
      code: get_collection_ids,
      args: [playerOne]
    });
    // Fifth step: create a Match resource for a single player
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_new_singleplayer_match",
        args: [parseInt(nftIDs[0]), 10],
        signers: [playerOne]
      })
    );
    // Sixth step: get the Match id
    const [matchesID, e2] = await executeScript({
      code: get_matches_in_play,
      args: [playerOne]
    });
    // Seventh step: submit move to match 
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/submit_moves",
        args: [parseInt(matchesID[0]), 0], // Any decent RPS player will always play rock on the first round
        signers: [playerOne]
      })
    );
    // Eight step: submit autoplayer move
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/submit_automated_player_move",
        args: [parseInt(matchesID[0])],
        signers: []       
      })
    );
    // Ninth step: resolve match
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/resolve_match",
        args: [parseInt(matchesID[0])],
        signers: [playerOne]       
      })
    );
  });
  // Sixth test checks if a player is able to join an already existing match
  test("Two players should be able to complete a Match", async () => {
    // First step: create a collection for player one and two
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/setup_collection",
        args: [],
        signers: [playerOne]
      })
    );
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/setup_collection",
        args: [],
        signers: [playerTwo]
      })
    );
    // Second step: mint an NFT for player one and two
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/mint_nft",
        args: [serviceAccount],
        signers: [playerOne]
      })
    );
    await shallPass(
      sendTransaction({
        name: "game_piece_nft/mint_nft",
        args: [serviceAccount],
        signers: [playerTwo]
      })
    );
    // Third step: create a GamePlayer resource for player one and two
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_game_player",
        args: [],
        signers: [playerOne]
      })
    );
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_game_player",
        args: [],
        signers: [playerTwo]
      })
    );
    // Fourth step: get the GamePieceNFT ids
    const [nftIDs1, e1] = await executeScript({
      code: get_collection_ids,
      args: [playerOne]
    });
    const [nftIDs2, e2] = await executeScript({
      code: get_collection_ids,
      args: [playerTwo]
    });
    // Fifth step: create a Match resource for a multi player match
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/setup_new_multiplayer_match",
        args: [parseInt(nftIDs1[0]), playerTwo, 10],
        signers: [playerOne]
      })
    );
    // Sixth step: get the Match id
    const [matchesID, e3] = await executeScript({
      code: get_matches_in_play,
      args: [playerOne]
    });
    // Seventh step: signup player 2 to match
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/escrow_nft_to_existing_match",
        args: [parseInt(matchesID[0]), parseInt(nftIDs2[0])],
        signers: [playerTwo]
      })
    )
    // Eight step: submit both players moves
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/submit_moves",
        args: [parseInt(matchesID[0]), 0], // Any decent RPS player will always play rock on the first round
        signers: [playerOne]
      })
    );
    // Player one tries to cheat auto move and fails
    await shallRevert(
      sendTransaction({
        name: "rock_paper_scissors_game/submit_automated_player_move",
        args: [parseInt(matchesID[0])],
        signers: []       
      })
    ); 
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/submit_moves",
        args: [parseInt(matchesID[0]), 0], // Any decent RPS player will always play rock on the first round
        signers: [playerTwo]
      })
    );
    // Ninth step: resolve match
    await shallPass(
      sendTransaction({
        name: "rock_paper_scissors_game/game_player/resolve_match_and_return_nfts",
        args: [parseInt(matchesID[0])],
        signers: [playerOne]       
      })
    );
    // Tenth step: check match outcome
    const [history, e4] = await executeScript({
      code: get_match_move_history,
      args: [parseInt(matchesID[0])]
    });
    expect(history).not.toBe(null);
    const [wl1, e5] = await executeScript({
      code: get_rps_win_loss,
      args: [playerOne, parseInt(nftIDs1[0])]
    });
    expect(wl1).not.toBe(null);
    const [wl2, e6] = await executeScript({
      code: get_rps_win_loss,
      args: [playerTwo, parseInt(nftIDs2[0])]
    });
    expect(wl2).not.toBe(null);
  });
});