# Rock Paper Scissors (Mostly) On-Chain

**TODO - transaction diagrams & single player submit move**

We’re building an on-chain Rock Paper Scissors game as a proof of concept exploration into the world of blockchain gaming powered by Cadence on Flow.

## Overview

As gaming makes its way into Web 3.0, bringing with it the next swath of mainstream users, we created this repo as a playground to develop proof of concept implementations that showcase the power of on-chain games built with the Cadence resource-oriented programming language. It's our hope that the work and exploration here uncovers unique design patterns that are useful towards composable game designs, helping to pave the way for a thriving community of game developers on Flow.

For our first proof of concept game, we've created the `RockPaperScissorsGame` and supporting contracts `DynamicNFT`, `GamePieceNFT` and `GamingMetadataViews`. Taken together, these contracts define an entirely on-chain game with a dynamic NFT that accesses an ongoing record of its win/loss data via attachments added to the NFT upon escrow.

As this proof of concept is iteratively improved, we hope to create a host of reference examples demonstrating how game developers could build games on Flow - some entirely on-chain while others blend on and off-chain architectures along with considerations for each design.

We believe that smart contract-powered gaming is not only possible, but that it will add to the gaming experience and unlock totally new mechanisms of gameplay. Imagine a world where games don't require a backend - just a player interfacing with an open-sourced local client making calls to a smart contract. Player's get maximum transparency, trustlessness, verifiability, and total ownership of their game assets.

With a community of open-source developers building on a shared blockchain, creativity could be poured into in-game experiences via community supported game clients while all players rest assured that their game assets are secured and core game logic remains unchanged. Game leaderboards emerge as inherent to the architecture of a publicly queryable blockchain. Game assets and logic designed for use in one game can be used as building blocks in another, while matches and tournaments could be defined to have real stakes and rewards.

The entirety of that composable gaming future is possible on Flow, and starts with the simple proof of concept defined in this repo. We hope you dive in and are inspired to build more fun and complex games using the learnings, patterns, and maybe even resources in these contracts!

## Components

### **Summary**

As mentioned above, the supporting contracts for this game have been compartmentalized to four primary contracts. At a high level, those are:

* **DynamicNFT** - Containing interfaces outlining attachments and the interfaces to which they are intended to attached (`Dynamic`). Several view functions are contained in both the AttachmentViewResolver and Dynamic interfaces as default implementations. An `AttachmentsView` is included so that resources implementing `Dynamic` can resolve metadata about their attached types.

* **GamingMetadataViews** - Defining the metadata structs relevant to an NFT's win/loss data and assigned moves as well as interfaces designed to be implemented in conjunction with `DynamicNFT.Attachments`.

* **GamePieceNFT** - This contract contains definitions for the gaming NFT and its collection. You'll note that the types of resources that can be attached to an NFT are generic, but must at minimum must be a composite of `DynamicNFT.Attachment` and `MetadataViews.Resolver`.

* **RockPaperScissorsGame** - As you might imagine, this contract contains the game's moves, logic as well as resource and interfaces defining the rules of engagement in the course of a match. Additionally, receivers for Capabilities to matches are defined in `GamePlayer` resource and interfaces that allow players to create matches, be added and add others to matches, and engage with the matches they're in. The `Match` resource is defined as a single round of Rock, Paper, Scissors that can be played in either single or two player modes, with single-player modes randomizing the second player's move on a contract function call.

### **DynamicNFT**

To accomplish a contruction of generic NFT with mutable data and resource that can be defined in external contracts, attachments felt like a natural pattern. 

In this contract, we've specified a set of interfaces that enable the implementing types to define the resources to which they can be attached & receive resources as `Attachment`s. An `Attachment` is simply a resource that can be attached to another via the `Dynamic` interface. `Dynamic` implies that attributes on the NFT can be altered by entities outside of the NFT's defining contract, and perhaps even with limitations defined by access control that allows another party to alter information that the NFT's owner cannot.

Why would one want to alter NFT attributes? This sort of behavior is desirable when NFTs are used in games where you want a contract's game logic to govern the data held on an NFT and don't necessarily trust the owner of the resource to not tamper with it in their favor.
 
Why would you want attachments? They can be very useful for a variety of use cases. Recall CryptoKitties & KittyItems! Attachments on NFTs introduce a world of composability not available otherwise. Any NFT that implements `Dynamic` can be used in the `RockPaperScissorsGame.Match` which attaches `Moves` & the ability to recall win/loss records (`BasicWinLossRetriever`).

#### `AttachmentsView` & `AttachmentViewResolver`
Because the pattern of metadata views & view resolvers is established in the standard Cadence contracts, we wanted to maintain that expectation by allowing for views on an NFT's attachments & a way to resolve those views. As the name suggests, `AttachmentsView` defines a metadataview relating to the associated NFT, the types attached, and the views supported by each attachment. `AttachmentViewResolver` provides an interface with default implementations to allow a resource to retrieve the views supported by their attachments as well as resolve those views. 

#### ***Considerations***
Note that `Attachment`s will soon be native to Cadence, but this is our best attempt to emulate the specifications in the [Attachments FLIP](https://github.com/onflow/flips/pull/11) with the current language features while also remaining backwards compatible. If you're reading this when Attachments are live, we recommend leveraging the native feature.

### **GamingMetadataViews**

This contract proposes a new set of [NFT metadata views](https://github.com/onflow/flow-nft/blob/master/contracts/MetadataViews.cdc) for Gaming.
Gaming is a subdomain of `NFT`s, and it's' possible to imagine many different ways
that gaming-specific metadata can be generalized into shared metadata views.
There are countless types of gaming-related metadata that could be shared this way,
allowing third party apps or even other games to create unique experiences or metrics
using these interoperable pieces of data. This is possible because they are all
accessible via the `NFT` itself, and in many cases via the contract also!

#### `GameContractMetadata`
For game-related contracts and resources, `GameContractMetadata` defines information identifying the originating contract and allows a developer to attach external URLs and media that would be helpful on the frontend.

#### `BasicWinLoss` & `BasicWinLossRetriever`
As a proof of concept, we have defined a basic metadata struct to show the win/loss record (`BasicWinLoss`) for an `NFT` for any game it participates in. It tracks wins, losses, and ties and exposes the ability to retrieve those values (stored in the game contract in our construction) directly from the `NFT` resource. While the implementation defined in this repo is very simple, you can imagine a more complex set of gaming metadata containing an `NFT`'s health and defense attributes, evolution characteristics, etc., making this pattern useful for any sort of game you might be designing.

In our construction, the game contract stored win/loss data, maintaining their own histories of NFT's `BasicWinLoss` so that they can create interesting metrics and records based on the data, allow anyone to retrieve any of the data easily from a central place, and also enable anyone with the NFT object itself or a reference to it to easily retrieve the data stored on it without directly relying on a central contract.

The `BasicWinLossRetriever` interface defines an interface for a resource that can retrieve this centrally stored data and return a `BasicWinLoss` record. This retriever is implemented as an `DynamicNFT.Attachment` and `GameResource` in the NFT which is added within a `Match` when the NFT is escrowed.

#### `AssignedMovesView` & `AssignedMoves`
The `AssignedMovesView` is defined to provide a metadata struct containing info relating to the associated game, NFT and the moves assiged to that NFT.

In order to maintain, add and remove moves, the `AssignedMoves` interface defines a generic resource with an array of moves represented as `AnyStruct`. Addition and removal of moves is limited by `access(contract)` so that only the contract in which the resource is implemented can add and remove moves - even the owner of the resource cannot alter the assigned moves.

While everyone gets the same moves in Rock, Paper, Scissors, this setup can be helpful in a game where players have to earn moves or moves are single use (e.g. power-up move, etc.).

#### `GameResource`
This is a very simple interface allowing for the addition of `GameContractMetadata` to an implementing resource.

#### ***Considerations***
A consideration to note here on the side of the game developer is that the storage costs for this game data will be incurred on the account to which the game contract is deployed. For this, you get a public and central location which is very useful for building a leaderboard of `NFT`'s win/loss performance. 

Alternatively, you could construct an `NFT` so that the metadata would be stored on the NFT itself, but you would lose that in-built on-chain leaderboard and will need to consider if and how you'll want to enable that functionality. Some solutions involve maintaining off-chain (but verifiable) stats based on indexed events or simply requiring a user to pay for the storage themselves while maintaining a Capability to the `NFT`s that allows you to query their stats on a time interval.

### **GamePieceNFT**

As mentioned above, there can be many implementations of an `NFT` that would make it relevant for use in a game. Our `GamePieceNFT` is as minimal as possible so that it could be used in a number of simple games. Fundamentally, the `NFT` defined here serves to maintain a mechanism to retrieve the win/loss record for games in which it's been played. For a simple game like Rock, Paper, Scissors, something like the metadata defined in `GamingMetadataViews.BasicWinLoss` is sufficient. 

In order for all players to trust the validity of win/loss metadata, the metadata should only be mutable by the relevant game. Given this requirement, our `NFT` was implemented as a simple example demonstrating how an `NFT` could expose certain data to be mutated by authorized parties, but not it's owners. The `WinLossViews` metadata effectively serves as a pointer to the game which the metadata refers to, allowing the game to define the access and conditions under which the metadata could be altered.

Games can add their respective retrievers with `addWinLossRetriever()`, and the `NFT`'s `WinLossView` can be resolved using `resolveView()`. The simplest way to explain the storage patern of an `NFT`'s win/loss data is that the `NFT`'s `BasicWinLoss` is stored on the relevant game contract while the `NFT` stores a retriever that can access and return its `BasicWinLoss` record within that game.

The usual components of a standard `NFT` contract such as `Collection` and associated interface implementations are present as well.

In a departure from the centrally stored win/loss data, these NFTs expose the ability to store generic game moves (`gameMoves`) as a local attribute. An NFT's game moves, defined by the game contract, can be edited via an `NFTEscrow` implementing resource which allows games to add and remove moves to those NFTs it has in its escrow custody. 

Because these NFTs are generic enough to be used in a variety of games, the namespace to which a game has edit access is restricted to the name the game has registered for in the `GamePieceNFT` contract. Why do we require registration? Imagine if the game contract allowed any `NFTEscrow` implementing resource to edit NFT game moves simply by providing their game name - we don't want to simply trust that those resources would be honest and provide their associated name. So, we expose the edit functionality in a resource interface, additionally requiring proof of registration with the NFT contract. This proof of registration is what we call a `GameRegistrationTicket` which is returned to those who register with the game. On that ticket resource, we write down the name provided at the time of registration. Then, whenever an `NFTEscrow` resource edits moves we require a reference to that ticket so we can get the name from a resource we can trust, relying on the uniqueness guarantees inherent to Cadence resources instead of the honesty of actors.

Through this registration construction we not only get restricted access on registered namespace, but also a novel monetization mechanism for NFT creators. Registration can also be thought of a licensing as registering games must pay a fee. This fee limits spam vectors on the namespace while also serving as a potential income stream for the NFT contract.

Due to the financial nature of fee based registration, a `Administrator` resource was implemented along with interfaces relevant to distinct functions. `FundsAdmin` exposes financial related methods, `MintingAdmin` minting related functionality, and `RegistryAdmin` game name registration functions.

#### ***Considerations***

For this proof of concept, we did not find a `Minter` resource necessary, but anyone referring to this design should consider if they find such a resource necessary for things like rate-limiting, allowing/disallowing minting, accepting tokens to authorize minting of a new token, etc.

Additionally, the assignment of move related attributes on this version of the NFT could serve as a model for how one might store win/loss data in a distributed manner. One could replace or add methods to `NFTEscrow` enabling implementing resources to increment win/loss values on the NFT directly, and forego a retriever altogether. This is a per use case design decision worth considering, as distributed storage of win/loss data compromises easily queriable on-chain historic gameplay data among all players for the benefit of less costly game contract storage.

### **RockPaperScissorsGame**

All the of above components are pulled together in this smart contract implementation of single-round match Rock, Paper, Scissors. Again, this is a simple proof of concept that will hopefully illuminate the power of Cadence and Flow for the purpose of game development on-chain.

Before getting into the contract level details, let's first cover the basic gameplay setup defined here. The idea is that two players engage in a single round of Rock, Paper, Scissors where Rock > Scissors > Paper > Rock > ... and so on. A match is mediated by a central game client that coordinates the match and submits moves on behalf of both players. Once the match has been created, the players submit their `NFT`s so that the game can record the match win/loss history of that `NFT`. After the moves are submitted by the match administrator, a winner is decided, win/loss results are recorded, and the `NFT`s are returned to their owners.

Now let's go over what that looks like in the contract. In broad strokes, each `GamePlayer` maintains a mapping of `Match.id` to `MatchLobbyActions` and another of `Match.id` to `MatchPlayerActions`. Their `MatchLobbyActions` allows the player to `escrowNFTToMatch()` (which must occur by both players before a match can be played) and `returnPlayerNFTs()`, which simply returns the escrowed NFTs to the `NonFungibleToken.Receiver` passed upon escrow deposit (assuming the match is over or has timed out).

The pattern outlined above allows a `GamePlayer` to create a `Match` via `GamePlayer.createMatch()`, saving the new `Match` to the contract's account storage, and linking `MatchLobbyActions` and `MatchPlayerActions` to the contracts account's private storage. When creating a `Match`; however, a player must also escrow their NFT providing also their `NonFungibleToken.Receiver`. Requiring "skin in the game", so to speak, helps to minimize the spam vector where an attacker can simply create an arbitrary number of Matches to take up account storage. Once the player's NFT has been escrowed to the `Match`, a `MatchPlayerActions` Capability is returned and is added to the `GamePlayer`'s `matchPlayerCapabilities`. 

To add a `GamePlayer` to a match, the player could call `signUpForMatch()` with the desired `matchID` which would add the `MatchLobbyActions` to the `GamePlayer`'s `matchLobbyCapabilities`. Alternatively, the `GamePlayerPublic` interface exposes the ability for a `GamePlayer` to be added to a `Match` by anyone. 

Once a match has been set up, two NFTs must be escrowed. Then each player can submit moves via `MatchPlayerActions.submitMoves()`, requiring both the move and a reference to the player's `GamePlayerID` Capability. We require this reference since both players have access to the same Capability, exposing a cheating vector whereby one player could submit the other player's move if the contract lacked a mechanism for identity verification. Since access control is a matter of what you have (not who you are) in Cadence, we take a reference to this `GamePlayerID` Capability and pull the submitting player's id from the reference (which should be kept private by the player).

Upon second player's asynchronous move submission, the `Match`:

1. determines the winner
2. alters the `BasicWinLoss` metadata of the `NFT` in `winLossRecords` based on the outcome
3. returns the escrowed `NFT`s to the respective `Receiver`s

>Note that a `Match` can only be utilized once.

Taking a look at the contract, you'll see that the core logic of Rock, Paper, Scissors is exposed in the contract function `determineRockPaperScissorsWinner()`. This was done intentionally in hopes that the core logic could be used in other variations. You could imagine another contract that defines a `Match` resource using other `NFT`s or that combines logic of a hypothetical tic-tac-toe game or that runs for multiple rounds and requires a buy-in from players which goes to the winner. Again, this is designed to be built on by the Flow community, so have fun with it and make building the game part of the fun!

#### ***Considerations***

A primary concern for us in the construction of this game is improving the UX such that a player wouldn't have to submit transactions for each move. This is a core problem for smart contract powered gaming, and likely something that requires changes to the protocol's on-chain account representation and/or higher levels of abstraction around account associations and identity.

A potential workaround in Cadence at present is a Capabilities-based approach, where I create a Capability that exposes restricted access to my `GamePlayer` resource and give that to some trusted agent - say a game client. Then, I tell that game client what transaction to submit for me using that Capability. For a number of reasons, we've decided against this approach, but primarily due to Capabilities' present lack of auditability.

That's all to say that we recognize this problem, many minds are working on it, and the UX will vastly improve in coming months. For the purpose of this proof of concept, we've chosen to move forward with the base contract components upon which we can soon build that seamless UX.

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
    1. In a separate transaction, player calls `submitAutomatedPlayerMove()`
        1. `MoveSubmitted` event is emitted with relevant `matchID` and `submittingGamePlayerID`
    1. A winner is determined
        1. The win/loss record is recorded for the player's NFT
        1. The win/loss record is recorded for the designated `dummyNFTID`
        1. The escrowed NFT is returned to the escrowing player
        1. `MatchOver` is emitted along with the `matchID`, `winningGamePlayerID`, `winningNFTID` and `returnedNFTIDs`
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
        1. A winner is determined
        1. The win/loss records are recorded for each NFT
        1. Each NFT is returned to their respective owners
        1. `MatchOver` is emitted along with the `matchID`, `winningGamePlayerID`, `winningNFTID` and `returnedNFTIDs`

## TODO - Transaction Diagrams

Below you'll find diagrams that visualize the flow between all components for each major game-related transaction.

### `onboard_player`
![Onboard player with GamePieceNFT Collection & NFT](/images/rps_onboard_player.png)

### `setup_new_singleplayer_match`
![GameAdmin setup new Match](/images/rps_setup_new_singleplayer_match.png)

### `setup_new_multiplayer_match`
![GameAdmin setup new Match](/images/rps_setup_new_singleplayer_match.png)

### `game_player_escrow_nft`
![GamePlayer escrow GamePieceNFT](/images/rps_game_player_escrow_nft.png)

### `game_admin_submit_moves`
![GameAdmin submit player Moves](/images/rps_game_admin_submit_moves.png)

___

## Edge Case Resolution

#### **NFTs are escrowed, but the moves are never submitted**

Since a match timeout is specified upon `Match` creation and retrieval of `NFT`s is contingent on either the timeout being reached or the `Match` no longer being in play, a player can easily retrieve their `NFT` after timeout by calling `returnPlayerNFTs()` on their `MatchPlayerActions` Capability.

Since this Capability is linked on the game contract account which shouldn’t not have active keys, the user can be assured that the Capability will not be unlinked. Additionally, since the method deposits the `NFT` to the `Receiver` provided upon escrow, they can be assured that it will not be accessible to anyone else calling `returnPlayerNFTs()`.

#### **NFTs are escrowed, but player unlinks their `Receiver` Capability before the NFT could be returned**

In this edge case, the `Receiver` Capability provided upon escrowing would no longer be linked to the depositing player’s `Collection`. Such an edge case is not handled in this version of the game, but should be considered to avoid permanent loss of their `NFT` should this situation occur.
___

## Demo Using Flow CLI

To demo the functionality of this repo, clone it and follow the steps below by entering each command using [Flow CLI](https://github.com/onflow/flow-cli) from the package root:

### Single-player

Let's start with demonstrating single-player gameplay:

1. Create account - account name: p1
```
flow accounts create
```

1. Onboard user
```
flow transactions send ./transactions/onboarding/onboard_player.cdc --signer p1
```

1. Init gameplay...

    1. Create new Match
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/setup_new_singleplayer_match.cdc 28 10 --signer p1
    ```
    1. Submit moves
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/submit_moves.cdc 30 0 --signer p1
    ```
    1. Submit automated player moves
    ```
    flow transactions send transactions/rock_paper_scissors_game/submit_automated_player_move.cdc 30
    ```
    1. Check Win/Loss record
    ```
    flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc 0x01cf0e2f2f715450 28
    ```

### Multi-player

Now that we've seen single-player gameplay, let's see what multi-player looks like:

1. Create two accounts - account name: p2
```
flow accounts create
```
1. Onboard user
```
flow transactions send ./transactions/onboarding/onboard_player.cdc --signer p2
```
1. Init gameplay...

    1. Create new Match
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/setup_new_multiplayer_match.cdc 28 0x179b6b1cb6755e31 10 --signer p1
    ```
    1. Escrow second player's NFT
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/escrow_nft.cdc 39 37 --signer p2
    ```
    1. Submit moves
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/submit_moves.cdc 39 0 --signer p1
    ```
    ```
    flow transactions send ./transactions/rock_paper_scissors_game/game_player/submit_moves.cdc 39 1 --signer p2
    ```
1. Check Win/Loss record
    ```
    flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc 0x01cf0e2f2f715450 28
    ```
    1. Check Win/Loss record
    ```
    flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc 179b6b1cb6755e31 37
    ```