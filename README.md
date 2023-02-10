# Rock Paper Scissors (Mostly) On-Chain

> We’re building an on-chain Rock Paper Scissors game as a proof of concept exploration into the world of blockchain gaming powered by Cadence on Flow.

## Overview

As gaming makes its way into Web 3.0, bringing with it the next swath of mainstream users, we created this repo as a playground to develop proof of concept implementations that showcase the power of on-chain games built with the Cadence resource-oriented programming language. It's our hope that the work and exploration here uncovers unique design patterns that are useful towards composable game designs, helping to pave the way for a thriving community of game developers on Flow.

For our first proof of concept game, we've created the `RockPaperScissorsGame` and supporting contract `GamingMetadataViews`. Taken together with any NFT (`MonsterMaker` as an example), these contracts define an entirely on-chain game with a dynamic NFT that accesses an ongoing record of its win/loss data via native Cadence attachments added to the NFT upon escrow.

As this proof of concept has been iteratively improved, we've created a host of reference examples demonstrating how game developers could build games on Flow - some entirely on-chain while others blend on and off-chain architectures along with considerations for each design.

We believe that smart contract-powered gaming is not only possible, but that it will add to the gaming experience and unlock totally new mechanisms of gameplay. Imagine a world where games require minimal, if any, backend support - just a player interfacing with an open-sourced local client making calls to a smart contract. Player's get maximum transparency, trustlessness, verifiability, and total ownership of their game assets. By leveraging the new [hybrid custody model](https://flow.com/post/flow-blockchain-mainstream-adoption-easy-onboarding-wallets) enabled in this repo and implemented in [@onflow/flow-games-retro](https://github.com/onflow/flow-games-retro), the UX and custodial challenges inherent to building on-chain games are alleviated, empowering developers to push the boundaries of in-game asset ownership, platform interoperability, and data & resource composability.

With a community of open-source developers building on a shared blockchain, creativity could be poured into in-game experiences via community supported game clients while all players rest assured that their game assets are secured and core game logic remains unchanged. Game leaderboards emerge as inherent to the architecture of a publicly queryable blockchain. Game assets and logic designed for use in one game can be used as building blocks in another, while matches and tournaments could be defined to have real stakes and rewards.

The entirety of that composable gaming future is possible on Flow, and starts with the simple proof of concept defined in this repo. We hope you dive in and are inspired to build more fun and complex games using the learnings, patterns, and maybe even resources in these contracts!

### Gameplay Overview

To showcase this promised composability, we constructed a multi-dApp experience starting with a game of Rock, Paper, Scissors (RPS). Straightforward enough, players can engage in single or two-player single round matches of RPS. After configuring their `GamePlayer` resource, they can start a match by escrowing any NFT. The match is playable once both players have escrowed their NFTs, or after the first player to escrow if in single player mode. The escrowed NFT gets an attachment that retrieves its win/loss record and another that maintains the playable moves for the game - rock, paper, and scissors, as expected.

Once playable, the match proceeds in stages - commit and resolve. Players first must commit their moves. After both players have submitted moves, the match can be resolved. On resolution, a winner is determined and the associated NFT's win/loss record is amended with the match results. Of course, once the match is over (or if a timeout is reached without resolution) the escrowed NFTs can then be returned to their respective escrowing players.

The [game dApp demo](https://github.com/onflow/flow-games-retro) showcases how developers can build on these contracts to create novel in-game experiences using the hybrid custody model. To facilitate a more full game experience, `TicketToken` was introduced to be awarded on wins, just like an arcade. After onboarding a user with the hybrid custody model implementation, a dApp can perform all of these actions without requiring a single user signature all while the user maintains full access to the app account.

The accompanying `TicketToken` and `ArcadePrize` contracts aren't special in and of themselves - simple FT and NFT contracts. However, once a user links their wallet with the app account used to play `RockPaperScissorsGame` - the account issued `TicketToken` on match wins - the authenticated account is issued an AuthAccount Capability on the app account. This on-chain linking between accounts establishes what we'll call a "parent-child" hierarchy between user accounts where the user's wallet mediated account is the "parent" to the partitioned "child" account.

After linking, the user can authenticate in a dApp using their parent account, and any dApp leveraging the resources in the `ChildAccount` contract can identify all associated child accounts, their contents, and facilitate transactions interacting with child-account custodied assets with a transaction signed by the parent account alone.

To demonstrate this, `ArcadePrize` accepts `TicketToken` redemption for minting NFTs. Redeeming FTs for NFTs isn't new, but the ability to sign a transaction with one account and, using delegated AuthAccount Capabilities, acquire funds from another to mint an NFT to the signing account is new.

This small use case unlocks a whole world of possibilities, merging walled garden custodial dApps with self-custodial wallets enabling ecosystem-wide composability and unified asset management. Users can engage with hybrid custody apps seamlessly, then leave their assets in app accounts, sign into a marketplace and redeem in-app currencies and NFTs without the need to first transfer to the account they plan on spending or listing from.

## Components

### **Summary**

As mentioned above, the supporting contracts for this game have been compartmentalized to four primary contracts. At a high level, those are:

#### **Gaming**
* **GamingMetadataViews** - Defining the metadata structs relevant to an NFT's win/loss data and assigned moves as well as interfaces designed to be implemented as attachments for NFTs.

* **RockPaperScissorsGame** - As you might imagine, this contract contains the game's moves, logic as well as resources and interfaces defining the rules of engagement in the course of a match. Additionally, receivers for Capabilities to matches are defined in `GamePlayer` resource and interfaces that allow players to create matches, be added and add others to matches, and engage with the matches they're in. The `Match` resource is defined as a single round of Rock, Paper, Scissors that can be played in either single or two player modes, with single-player modes randomizing the second player's move on a contract function call.

#### **Linked Accounts**
* **ChildAccount** - The resources enabling the "parent-child" account hierarchical model are defined within this contract. `ChildAccountCreator` can be used to create app accounts, funding creation by the signer and tagging accounts with pertinent metadata (`ChildAccountInfo`) in a `ChildAccountTag`. A parent account maintains a `ChildAccountManager` which captures any linked child accounts' `AuthAccount` and `ChildAccountTag` Capabilities in a `ChildAccountController`, indexing the nested resource on the child account's address.

#### **Supporting**
* **MonsterMaker** - An example NFT implementation, [seen elsewhere](https://monster-maker-web-client.vercel.app/) in Flow demos, used to demonstrate NFT escrow in `RockPaperScissorsGame` gameplay.
* **TicketToken** - A simple FungibleToken implementation intended for use as redemption tokens in exchange for `ArcadePrize` NFTs
* **ArcadePrize** - Another example implementation, this time of a NonFungibleToken. Minting requires `TicketToken` redemption. An interesting note, you can redeem

### **GamingMetadataViews**

This contract proposes a new set of [NFT metadata views](https://github.com/onflow/flow-nft/blob/master/contracts/MetadataViews.cdc) for Gaming. Gaming is an increasing use case for `NFT`s, and it's' possible to imagine many different ways that gaming-specific metadata can be generalized into shared metadata views. There are countless types of gaming-related metadata that could be shared this way, allowing third party apps or even other games to create unique experiences or metrics using these interoperable pieces of data. This is possible because they are all accessible via the `NFT` itself, and in many cases via the contract also!

#### **`GameContractMetadata`**
For game-related contracts and resources, `GameContractMetadata` defines information identifying the originating contract and allows a developer to attach external URLs and media that would be helpful on the frontend.

#### **`BasicWinLoss` & `BasicWinLossRetriever`**
As a proof of concept, we have defined a basic metadata struct to show the win/loss record (`BasicWinLoss`) for an `NFT` for any game it participates in. It tracks wins, losses, and ties and exposes the ability to retrieve those values (stored in the game contract in our construction) directly from the `NFT` resource. While the implementation defined in this repo is very simple, you can imagine a more complex set of gaming metadata containing an `NFT`'s health and defense attributes, evolution characteristics, etc., making this pattern useful for any sort of game you might be designing.

In our construction, the game contract stores win/loss data, maintaining its own histories of NFT's `BasicWinLoss`. This allows others to query all win/loss histories., create interesting metrics and records based on the data, allow anyone to retrieve any of the data easily from a central place, and also enable anyone with the NFT object itself or a reference to it to easily retrieve the data stored on it without directly relying on a central contract.

The `BasicWinLossRetriever` interface defines an interface for a resource that can retrieve this `BasicWinLoss` record. This retriever is implemented along with `GameResource` and `MetadataViews.Resolver` as an Attachment for any `NonFungibleToken.INFT`. It is then added within a `Match` when an NFT is escrowed so the win/loss record of that NFT can be retrieved..

#### **`AssignedMovesView` & `AssignedMoves`**
The `AssignedMovesView` is defined to provide a metadata struct containing info relating to the associated game, NFT and the moves assiged to that NFT.

In order to maintain, add and remove moves, the `AssignedMoves` interface defines a generic resource with an array of moves represented as `AnyStruct`. Addition and removal of moves is limited by `access(contract)` so that only the contract in which the resource is implemented can add and remove moves - even the owner of the base resource cannot alter the assigned moves.

While everyone gets the same moves in Rock, Paper, Scissors, this setup can be helpful in a game where players have to earn moves, moves are single use (e.g. power-up move, etc.), deck-based games where moves are expended, etc.

#### **`GameResource`**
This is a very simple interface allowing for the addition of `GameContractMetadata` to an implementing resource.

#### ***Considerations***
A consideration to note here on the side of the game developer is that the storage costs for this game data will be incurred on the account to which the game contract is deployed. For this, you get a public and central location which is very useful for building a leaderboard of `NFT`'s win/loss performance. 

Alternatively, you could construct an `NFT` so that the metadata would be stored on the NFT itself, but you would lose that in-built on-chain leaderboard and will need to consider if and how you'll want to enable that functionality. Some solutions involve maintaining off-chain (but verifiable) stats based on indexed events or simply requiring a user to pay for the storage themselves while maintaining a Capability to the `NFT`s that allows you to query their stats on a time interval.

### **MonsterMaker**

As mentioned above, there can be many implementations of an NFT that would make it relevant for use in a game. To showcase how Cadence's native attachments bolster the composability of on-chain game logic, we decided to use an existing NFT implementation. Other games can implement their own [Attachments](https://github.com/onflow/cadence/blob/feature/attachments/docs/language/attachments.md) and add them to these or other NFTs.

There was much discussion about whether an NFT's win/loss records should be stored directly on the NFT as an attachment, or on that game contract and attach a retriever for the NFT to recall its record. This is ultimately a design decision, with each approach having its pros/cons. Because we wanted an emergent on-chain leaderboard, we decided to store all records on the game contract. However, had we found an acceptable event indexing service or wanted to build one ourselves, we could have relied on off-chain indexers to maintain win/loss history for a leaderboard & stored the data directly on the NFT.

The usual components of a standard `NFT` contract such as `Collection`, `Minter`, and associated interface implementations are present as well.

### **RockPaperScissorsGame**

All the of above components are put together in this smart contract implementation of single-round match Rock, Paper, Scissors. Again, this is a simple proof of concept that will hopefully illuminate the power of Cadence and Flow for the purpose of game development on-chain.

Before getting into the contract level details, let's first cover the basic gameplay setup defined here. The idea is that two players engage in a single round of Rock, Paper, Scissors where Rock > Scissors > Paper > Rock > ... and so on.

A `Match` is mediated only by the contract logic, Capabilities, and conditions. While Match resources & win/loss records are stored in the contract account, the game is otherwise peer-to-peer. Once a `Match` has been created, the players escrow their `NFT`s so that the game can record the match win/loss history of that `NFT`. After both moves have been submitted, a winner is decided, win/loss results are recorded, and the `NFT`s are returned to their owners.

Now let's go over what that looks like in the contract. In broad strokes for a two-player `Match`, each `GamePlayer` maintains a mapping of `Match.id` to `MatchLobbyActions` and another of `Match.id` to `MatchPlayerActions`.

`MatchLobbyActions` allow the player to `escrowNFTToMatch()` (which must occur by both players before a match can be played) along with getters for Match winner information.

The pattern outlined above allows a `GamePlayer` to create a `Match` via `GamePlayer.createMatch()`, saving the new `Match` to the contract's account storage, and linking `MatchLobbyActions` and `MatchPlayerActions` to the contracts account's private storage. When creating a `Match`; however, a player must also escrow their NFT providing their `NonFungibleToken.Receiver` along with it so the NFT can be returned. Requiring "skin in the game", so to speak, helps to minimize the spam vector where an attacker can simply create an arbitrary number of Matches to take up account storage. Once the player's NFT has been escrowed to the `Match`, a `MatchPlayerActions` Capability is returned and is added to the `GamePlayer`'s `matchPlayerCapabilities`. 

To add a `GamePlayer` to a match, the player could call `signUpForMatch()` with the desired `matchID` which would add the `MatchLobbyActions` to the `GamePlayer`'s `matchLobbyCapabilities`. Alternatively, the `GamePlayerPublic` interface exposes the ability for a `GamePlayer` to be added to a `Match` by anyone, which you can see in the `setup_new_multiplayer_match.cdc` transaction. The latter method is the on-chain version of inviting your friend to a `Match` as there is no obligation for them to participate.

Once a match has been set up, two NFTs must be escrowed. Then each player can submit moves via `MatchPlayerActions.submitMoves()`, requiring both the move and a reference to the player's `GamePlayerID` Capability. We require this reference since both players have access to the same Capability, exposing a cheating vector whereby one player could submit the other player's move if the contract lacked a mechanism for identity verification. Since access control is a matter of *what you have* (not *who you are*) in Cadence, we take a reference to this `GamePlayerID` Capability and pull the submitting player's id from the reference (which should be kept private by the player).

Once both players' moves have been submitted completing the "commit" phase, `resolveMatch()` can be called on the `Match` which does the following:

1. determines the winner
2. alters the `BasicWinLoss` metadata of the `NFT` in `winLossRecords` based on the outcome

To return escrowed NFTs, `returnPlayerNFTs()` can be called by either player after resolution (or timeout is reached), with the backup method `retrieveUnclaimedNFT()` allowing players to retrieve their individual NFTs should a problem with the one of the players' Receivers prevent return of both NFTs.

Also know that a `Match` can be played in single-player mode. In this case, a player escrows their NFT and submits their move as usual. Once they submit their move, they must then call the `submitAutomatedPlayerMove()` contract method which generates & submits a move as the second automated player. In all cases, `resolveMatch()` is called after moves have been submitted to determine the outcome, but must be called in a separate transaction than move submission. This is enforced by block height difference between move submissions - not an ideal solution.

These calls require separate transactions to prevent cheating on second move submission. For example, I could submit my move as rock and set a post-condition that that the outcome from the match results in a win for me, allowing me to game the system.

Note that the automated player's move is generated using `unsafeRandom()` which can be gamed. An oracle or a safer randomness API implemented into Flow and Cadence can and will at some point solve this problem, removing the need for these workarounds. Until then, we compartmentalized the `Match` into these commit-resolve stages.

>Note that a `Match` can only be utilized once.

Taking a look at the contract, you'll see that the core logic of Rock, Paper, Scissors is exposed in the contract function `determineRockPaperScissorsWinner()`. This was done in hopes that the core logic could be used in other variations. You could imagine another contract that defines a `Match` resource using other `NFT`s or that combines logic of a hypothetical tic-tac-toe game or that runs for multiple rounds and requires a buy-in from players which goes to the winner. Again, this is designed to be built on by the Flow community, so have fun with it and make building the game part of the fun!

#### **`RPSBasicWinLossRetriever`** 
The `BasicWinLossRetriever` attachment effectively serves as a pointer to the game's `BasicWinLoss` data, allowing the game to define the access to and conditions under which the metadata could be altered while still retrieving the data from the NFT it refers to.

The simplest way to explain the storage patern of an `NFT`'s win/loss data is that the `NFT`'s `BasicWinLoss` is stored on the relevant game contract while the `NFT` stores an attached getter (the retriever) that can access and return its `BasicWinLoss` record within that game.

#### `RPSAssignedMoves`
To model how a game might provide moves for gameplay, we've created the `RPSAssignedMoves` resource. This resource is attached to escrowed NFTs and seeded with your standard moves for Rock, Paper, Scissors. Other games might add and remove available moves throughout gameplay and validate whether a submitted move is valid given the player's escrowed NFT. For example, maybe my `AssignedMoves` resource represents a deck of single use cards from which a card is removed when it's played. Alternatively, I might have a fighter that loses the ability to play moves as their health declines. Again, the focus here is demonstrating the definition of a resource that is given to a player, but containing attributes that only contract game logic can alter.

#### ***Considerations***

A primary concern for us in the construction of this game is improving the UX such that a player wouldn't have to submit transactions for each move. This is a core problem for smart contract powered gaming, and likely something that requires changes to the protocol's on-chain account representation and/or higher levels of abstraction around account associations and identity.

A potential workaround in Cadence at present is a Capabilities-based approach, where I create a Capability that exposes restricted access to my `GamePlayer` resource and give that to some trusted agent - say a game client. Then, I tell that game client what transaction to submit for me using that Capability. For a number of reasons, we've decided against this approach, but primarily due to Capabilities' present lack of auditability.

That's all to say that we recognize this problem, many minds are working on it, and the UX will vastly improve in coming months. For the purpose of this proof of concept, we've chosen to move forward with the base contract components upon which we can soon build that seamless UX (which is soon to come).

One more consideration comes from the contract's acceptance of any NFT. While this maximizes openness, it also means that NFTs with the same ID cause collisions in the win/loss record mapping indexed on escrowed NFT IDs. This shouldn't be an issue for NFTs that assign ids on UUIDs, but users could experience a case where they effectively share a win/loss record with another NFT of the same ID. This could be handled by indexing on the hash of an NFT's ID along with its Type which should yield a unique value or alternatively, the NFTs UUID. The latter would be a harder ask as it's unlikely a requestor would have the NFT's UUID on hand if it's not already the equivalent to its ID.

A bit of a note on best practices...it's evident that defining on-chain game logic must involve some degree of adversarial thinking. For example, we could have (and did at one point) include `returnPlayerNFTs()` in `resolveMatch()` to remove the need for an additional call. However, we discovered that a malicious `Receiver` could `panic` on `deposit()` which would prevent `Match` resolution. This along with the revelation that I could assure game outcomes with the afforementioned post-condition on results led us to the commit-resolve pattern you see in the contracts & transactions.

___

### Happy Path Walkthrough

With the context and components explained, we can more closely examine how they interact in a full user interaction. For simplicity, we'll assume everything goes as it's designed and walk the happy path.

1. User onboarding in a single transaction - `onboard_player.cdc`
    1. Setup `GamePieceNFT.Collection` & link Capabilities
    1. Mint `GamePieceNFT.NFT` to player's Collection
        1. `MintedNFT` and `Deposit` events emitted
    1. Setup `RockPlayerScissorsGame.GamePlayer` & link Capabilities
1. Single-Player Gameplay
    1. Player creates a new match, escrowing their NFT along with their NFT `Receiver`, emitting `NewMatchCreated` and `PlayerEscrowedNFTToMatch`
        1. `RPSAssignedMoves` are attached to their escrowed NFT if they are not already attached
        1. `RPSWinLossRetriever` is attached to the escrowed NFT if they are not already attached
    1. Player submits their move
        1. `MoveSubmitted` event is emitted with relevant `matchID` and `submittingGamePlayerID`
    1. Player calls for automated player's move to be submitted
        1. `MoveSubmitted` event is emitted with relevant `matchID` and `submittingGamePlayerID` (the contract's designated `GamePlayer.id` in this case)
    1. In a separate transaction (enforced by block height), player calls `resolveMatch()` to determine the outcome of the `Match`
        1. The win/loss record is recorded for the player's NFT
        1. The win/loss record is recorded for the designated `dummyNFTID`
        1. The escrowed NFT is returned to the escrowing player
        1. `MatchOver` is emitted along with the `matchID`, `winningGamePlayerID`, and `winningNFTID`.
    1. Player calls for escrowed NFT to be returned via `returnPlayersNFTs()`. Since the `Match` returns the escrowed NFTs directly via the given `Receiver` Capability, we made this a separate call to prevent malicious Capabilities from disallowing resolution. In this case, the worst a malicious Capability could do would be 
1. Multi-Player Gameplay
    1. Player one creates a new match, escrowing their NFT
        1. `RPSAssignedMoves` are attached to their escrowed NFT if they are not already attached
        1. `RPSWinLossRetriever` is attached to the escrowed NFT if they are not already attached
    1. Player one adds `MatchLobbyActions` Capability to Player two's `GamePlayerPublic`
        1. Player one gets `GamePlayerPublic` Capability from Player two
        1. Player one calls `addPlayerToMatch()` on their `GamePlayer`, passing the `matchID` and the reference to Player two's `GamePlayerPublic`
        1. `PlayerAddedToMatch` emitted along with matchID and the `id` of the `GamePlayer` added to the Match
    1. Player two escrows their NFT into the match
        1. `RPSAssignedMoves` are attached to their escrowed NFT if they are not already attached
        1. `RPSWinLossRetriever` is attached to the escrowed NFT if they are not already attached
    1. Each player submits their move
    1. After both moves have been submitted, any player can then call for match resolution
        1. A winner is determined
        1. The win/loss records are recorded for each NFT
        1. Each NFT is returned to their respective owners
        1. `MatchOver` is emitted along with the `matchID`, `winningGamePlayerID`, `winningNFTID` and `returnedNFTIDs`
    1. Any player calls for escrowed NFT to be returned via `returnPlayersNFTs()`. Since the `Match` returns the escrowed NFTs directly via the given `Receiver` Capability, we made this a separate call to prevent malicious Capabilities from disallowing resolution. In this case, the worst a malicious Capability could do would be to require that the other player call `retrieveUnclaimedNFT()` in a separate transaction to retrieve their singular NFT from escrow.

## TODO - Transaction Diagrams

Below you'll find diagrams that visualize the flow between all components for each major game-related transaction.

### `onboard_player`
![Onboard player with GamePieceNFT Collection & NFT](/images/rps_onboard_player.png)

### `setup_new_singleplayer_match`
![GamePlayer sets up new Match](/images/rps_setup_new_singleplayer_match.png)

### `setup_new_multiplayer_match`
![TODO](/todo)

### `escrow_nft_to_existing_match`
![TODO](/todo)

### `submit_both_singleplayer_moves`
![TODO](/todo)

### `resolve_match`
![TODO](/todo)

___

## Edge Case Resolution

#### **NFTs are escrowed, but the moves are never submitted**

Since a match timeout is specified upon `Match` creation and retrieval of `NFT`s is contingent on either the timeout being reached or the `Match` no longer being in play, a player can easily retrieve their `NFT` after timeout by calling `returnPlayerNFTs()` on their `MatchPlayerActions` Capability.

Since this Capability is linked on the game contract account which shouldn’t not have active keys, the user can be assured that the Capability will not be unlinked. Additionally, since the method deposits the `NFT` to the `Receiver` provided upon escrow, they can be assured that it will not be accessible to anyone else calling `returnPlayerNFTs()`.

#### **NFTs are escrowed, but player unlinks their `Receiver` Capability before the NFT could be returned**

In this edge case, the `Receiver` Capability provided upon escrowing would no longer be linked to the depositing player’s `Collection`. In this case, as long as the escrowing player still has their `GamePlayer`, they could call `retrieveUnclaimedNFT()`, providing a reference to their `GamePlayerID` and the `Receiver` they want their NFT returned to.

#### **Player provides a Receiver Capability that panics in its deposit() method**

This wouldn't be encounterd by the `Match` until `returnPlayerNFTs()` is called after match resolution. Depending on the order of the `Receiver` Capabilities in the `nftReceivers` mapping, this could prevent the other player from retrieving their NFT via that function. At that point, however, the winner & loser have been decided and the game is over (`inPlay == false`). The other player could then call `retrieveUnclaimedNFT()` to retrieve the NFT that the trolling Receiver was preventing from being returned.
___

## Demo on Emulator Using Flow CLI

To demo the functionality of this repo, clone it and follow the steps below by entering each command using [Flow CLI](https://github.com/onflow/flow-cli) from the package root:

### TODO - consolidate onboarding transaction to include child account creation & on-chain association

1. Single player

    1. Create account - account name: parent-main
    ```
    flow accounts create
    ```

    1. Mint Flow to the new account
    ```
    flow transactions send ./transactions/flowToken/mint_tokens.cdc 01cf0e2f2f715450 100.0
    ```

    1. Generate a public, private key pair - you'll want to copy the generated public key
    ```
    flow keys generate
    ```

    1. Onboard the new user with a `GamePieceNFT.Collection`, `RockPaperScissorsGame.GamePlayer` & `ChildAccount.ChildAccountManager` with a child account, passing the generated public key & initial funding amount we'll pass from the parent to the child account. This transaction also configures necessary game resources in the created child account, namely `GamePieceNFT.Collection` & `NFT` as well as access to the parent account's `RockPaperScissorsGame.GamePlayer` via their `RockPaperScissorsGame.DelegatedGamePlayer` Capability
    ```
    flow transactions send ./transactions/onboarding/onboard_new_user_and_player.cdc <PUBLIC_KEY> 10.0 RPSClient "Child account used for RockPaperScissors web app" "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2KvcOwctyase2_P7lQxbxIutmLKFPch6rNw&usqp=CAU" "https://www.cheezewizards.com/" --signer parent-main
    ```

    1. Get the child account's address giving the script the public key used to create the new account.
    ```
    flow scripts execute ./scripts/child_account/get_child_address_from_public_key.cdc 01cf0e2f2f715450 <PUBLIC_KEY>
    ```

    1. Get the NFT IDs in the child's Collection
    ```
    flow scripts execute ./scripts/game_piece_nft/get_collection_ids.cdc 0x179b6b1cb6755e31
    ```

    1. The child account will then be created. You will want to add this account to your `flow.json` in [advanced format](https://developers.flow.com/tools/flow-cli/configuration#advanced-format-1). Be sure to find the child address (likely `0x179b6b1cb6755e31`) in the emitted events and input the previously generated private key under the account's `privateKey` attribute in the `flow.json`. You will also want to add an alias for the `parent-main` account's private key since that account also has key access to the newly created `child` account. The `accounts` attribute in your `flow.json` should look like this:
    ```
    "accounts": {
		"emulator-account": {
			"address": "f8d6e0586b0a20c7",
			"key": "<EMULATOR_ACCOUNT_PRIVATE_KEY>"
		},
		"parent-main": {
			"address": "01cf0e2f2f715450",
			"key": "<PARENT_MAIN_PRIVATE_KEY>"
		},
		"child": {
			"address": "0x179b6b1cb6755e31",
			"key": {
				"type": "hex",
				"index": 0,
				"signatureAlgorithm": "ECDSA_P256",
				"hashAlgorithm": "SHA3_256",
				"privateKey": "<CHILD_PRIVATE_KEY>"
			}
		},
		"parent-child": {
			"address": "0x179b6b1cb6755e31",
			"key": {
				"type": "hex",
				"index": 1,
				"signatureAlgorithm": "ECDSA_P256",
				"hashAlgorithm": "SHA3_256",
				"privateKey": "<PARENT_MAIN_PRIVATE_KEY>"
			}
		}
	}
    ```

    1. Now that both the parent and child accounts have been configured, let's play a single-player match, using the child account as a game client would...

        1. Create new Match
        ```
        flow transactions send ./transactions/rock_paper_scissors_game/delegated_game_player/setup_new_singleplayer_match.cdc 38 10 --signer child
        ```
        1. Submit moves
        ```
        flow transactions send ./transactions/rock_paper_scissors_game/delegated_game_player/submit_both_singleplayer_moves.cdc 39 0 --signer child
        ```
        1. Resolve the Match & return NFTs
        ```
        flow transactions send ./transactions/rock_paper_scissors_game/game_player/resolve_match_and_return_nfts.cdc 39 --signer child
        ```
        1. Get the moves submitted for the Match
        ```
        flow scripts execute scripts/rock_paper_scissors_game/get_match_move_history.cdc 39
        ```
            
            1. Alternatively, you can get the move history in a simplified format
            ```
            flow scripts execute scripts/rock_paper_scissors_game/get_match_move_history_as_raw_values.cdc 39
            ```
        
        1. Check Win/Loss record
        ```
        flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc 0x179b6b1cb6755e31 38
        ```

    1. Next we'll transfer assets from child account to parent account, signing with parent account
        
        1. To do this, we'll need to construct a [complex transaction](https://developers.flow.com/tools/flow-cli/complex-transactions). Let's start by building our transaction & saving the payload.
        ```
        flow transactions build ./transactions/child_account/parent_claims_player_and_all_nfts.cdc --proposer parent-main --payer parent-main --authorizer parent-main --authorizer parent-child --filter payload --save parent_claims_player_and_all_nfts
        ```

        1. Then, we'll sign the transaction. Even though the `parent-main` account's single private key gives it access to both its account and the `child` account, we'll need to sign twice. That's because the chain doesn't care about accounts, it just wants to know that it got the right signature for the address to access the account. We do this by signing first with our `parent-main` and secondly with our `parent-child`. Looking back at the `flow.json` you'll see that both aliases have the same address, but the addresses they map to and their relative indexes tell `flow-cli` where to get the necessary signatures. This is not relevant to the demo, but helpful to know for these sorts of key setups. Let's finally sign that transaction...
        ```
        flow transactions sign parent_claims_player_and_all_nfts --signer parent-main --signer parent-child --filter payload --save parent_claims_player_and_all_nfts
        ```

        1. Now we can finally send the built & signed transaction
        ```
        flow transactions send-signed parent_claims_player_and_all_nfts
        ```

    1. And lastly, we'll get the win/loss record from the transferred NFT to show that the record stays with the NFT
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/submit_move.cdc 38 1 --signer p2
    ```
    1. Resolve the Match & return NFTs
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/resolve_match_and_return_nfts.cdc 38 --signer p1
    ```
1. Check Win/Loss record
    ```
    flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc 0x01cf0e2f2f715450 29
    ```
    1. Check Win/Loss record
    ```
    flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc 179b6b1cb6755e31 36
    ```
 