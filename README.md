# Rock Paper Scissors (Mostly) On-Chain

## TODO:
- Update README
    - In GameAdmin version
    - In disintermediated version
- Update comments in NFT contract
- Create txns and scripts to engage with contract
    - Incorporate TEA's proxy account work
    - Full start to finish user flow
        
        1. X - Create player & proxy accounts
        ```
        flow accounts create
        ```
        account names:
        
            * player-one
            * player-two
            * proxy-one
            * proxy-two
            
        1. X - Allow minting & game registration in GameNFT contract using GameNFT.Administrator
        ```
        flow transactions send ./transactions/game_piece_nft/administrator/enable_mint_and_registration.cdc 5.0
        ```
        1. X - Set up Vault in game contract account
        ```
        flow transactions send ./transactions/example_token/setup_example_token.cdc
        ```
        1. X - Mint tokens to game contract account's vault
        ```
        flow transactions send ./transactions/example_token/administrator/mint_tokens.cdc f8d6e0586b0a20c7 20.0
        ```
        1. X - Register with GamePieceNFT using game's ContractAdmin
        ```
        flow transactions send ./transactions/rock_paper_scissors_game/contract_admin/register_game_name.cdc 5.0
        ```
        1. Setup users' accounts - player-one & player-two
            
            1. X - Setup GamePiece NFT collection
            ```
            flow transactions send ./transactions/game_piece_nft/setup_collection.cdc --signer player-one
            ```
            ```
            flow transactions send ./transactions/game_piece_nft/setup_collection.cdc --signer player-two
            ```
            1. X - Mint NFT
            ```
            flow transactions send ./transactions/game_piece_nft/mint_nft.cdc --signer player-one
            ```
            ```
            flow transactions send ./transactions/game_piece_nft/mint_nft.cdc --signer player-two
            ```
            1. X - Get them both GamePlayers & link Caps
            ```
            flow transactions send ./transactions/rock_paper_scissors_game/game_player/setup_game_player.cdc --signer player-one
            ```
            ```
            flow transactions send ./transactions/rock_paper_scissors_game/game_player/setup_game_player.cdc --signer player-two
            ```
            1. X - Set up accounts for proxy

                1. X - Create ProxyManagerAdmin resources in each of the player accounts
                ```
                flow transactions send ./transactions/account_proxies/setup_proxy_admin.cdc --signer player-one
                ```
                ```
                flow transactions send ./transactions/account_proxies/setup_proxy_admin.cdc --signer player-two
                ```
                1. X - Authorize each respective proxy accounts for each player
                ```
                flow transactions send ./transactions/account_proxies/authorize_child.cdc <proxy_one_address> rock_paper_scissors_proxy --signer player-one
                ```
                ```
                flow transactions send ./transactions/account_proxies/authorize_child.cdc <proxy_two_address> rock_paper_scissors_proxy --signer player-two
                ```
                1. Grant each respective proxy account a GamePlayerProxy Capability
                ```
                flow transactions send ./transactions/account_proxies/grant_child_capability.cdc 
                ```

        1. Init gameplay...

            1. X - Create new Match
            ```
            flow transactions send ./transactions/rock_paper_scissors_game/game_player_proxy/setup_new_match.cdc 47 179b6b1cb6755e31 10 --signer proxy-one
            ```
            1. X - Escrow player-two NFT using Proxy
            ```
            flow transactions send ./transactions/rock_paper_scissors_game/game_player_proxy/escrow_nft.cdc 53 48 --signer proxy-two
            ```
            1. X - Submit moves using Proxy
            ```
            flow transactions send ./transactions/rock_paper_scissors_game/game_player_proxy/submit_moves.cdc 53 0 --signer proxy-one
            ```
            ```
            flow transactions send ./transactions/rock_paper_scissors_game/game_player_proxy/submit_moves.cdc 53 2 --signer proxy-two
            ```

We’re building an on-chain Rock Paper Scissors game as a proof of concept exploration into the world of blockchain gaming powered by Cadence on Flow.

## Overview

As gaming makes its way into Web 3.0, bringing with it the next swath of mainstream users, we created this repo as a playground to develop proof of concept implementations that showcase the power of on-chain games built with the Cadence resource-oriented programming language. It's our hope that the work and exploration here uncovers unique design patterns that are useful towards composable game designs, helping to pave the way for a thriving community of game developers on Flow.

For our first proof of concept game, we've created the `RockPaperScissorsGame` and supporting contracts `GamePieceNFT` and `GamingMetadataViews`. Taken together, these contracts define a mostly on-chain, centrally mediated game with a dynamic NFT that accesses an ongoing record of its win/loss data.

As this proof of concept is iteratively improved, we hope to create a host of reference examples demonstrating how game developers could build games on Flow - some entirely on-chain while others blend on and off-chain architectures along with considerations for each design.

We believe that smart contract-powered gaming is not only possible, but that it will add to the gaming experience and unlock totally new mechanisms of gameplay. Imagine a world where games don't require a backend - just a player interfacing with an open-sourced local client making calls to a smart contract. Player's get maximum transparency, trustlessness, verifiability, and total ownership of their game assets.

With a community of open-source developers building on a shared blockchain, creativity could be poured into in-game experiences via community supported game clients while all players rest assured that their game assets are secured and core game logic remains unchanged. Game leaderboards emerge as inherent to the architecture of a publicly queryable blockchain. Game assets and logic designed for use in one game can be used as building blocks in another, while matches and tournaments could be defined to have real stakes and rewards.

The entirety of that composable gaming future is possible on Flow, and starts with the simple proof of concept defined in this repo. We hope you dive in and are inspired to build more fun and complex games using the learnings, patterns, and maybe even resources in these contracts!

## Components

### **GamingMetadataViews**

This contract proposes a new set of [NFT metadata views](https://github.com/onflow/flow-nft/blob/master/contracts/MetadataViews.cdc) for Gaming.
Gaming is a subdomain of `NFT`s, and it's' possible to imagine many different ways
that gaming-specific metadata can be generalized into shared metadata views.
There are countless types of gaming-related metadata that could be shared this way,
allowing third party apps or even other games to create unique experiences or metrics
using these interoperable pieces of data. This is possible because they are all
accessible via the `NFT` itself, and in many cases via the contract also!

As a proof of concept, we have defined a basic metadata view (`WinLossView`) to show the win/loss record (`BasicWinLoss` ) for an `NFT` for any game it participates in. It tracks wins, losses, and ties and exposes the ability to retrieve those values (stored in the game contract) directly from the `NFT` resource. While the implementation defined in this repo is very simple, you can imagine a more complex set of gaming metadata containing an `NFT`'s health and defense attributes, evolution characteristics, etc., making this pattern useful for any sort of game you might be designing.

The `WinLossView` maintains a mapping of game names to the game's respective `BasicWinLossRetriever`. A `BasicWinLossRetriever` is an interface defining a Capability with a function that can access `BasicWinLoss` data elsewhere. In this case, game contracts can maintain their own histories of NFT's `BasicWinLoss` so that they can create interesting metrics and records based on the data, allow anyone to retrieve any of the data easily from a central place, and also enable anyone with the NFT object itself or a reference to it to easily retrieve the data stored on it without directly relying on a central contract. 

Another benefit is that when a user submits their NFT to play a new game, the game can automatically add its win/loss record retriever to the NFT without an explicit confirmation from the user because the user has given permission implicitly.

It is the best of all worlds!

#### ***Considerations***

A consideration to note here on the side of the game developer is that the storage costs for this game data will be incurred on the account to which the game contract is deployed. For this, you get a public and central location which is very useful for building a leaderboard of `NFT`'s win/loss performance. 

Alternatively, you could construct an `NFT` so that the metadata would be stored on the NFT itself, but you would lose that in-built on-chain leaderboard and will need to consider if and how you'll want to enable that functionality. Some solutions involve maintaining off-chain (but verifiable) stats or simply requiring a user to pay for the storage themselves while maintaining a Capability to the `NFT`s that allows you to query their stats on a time interval.

### **GamePieceNFT**

As mentioned above, there can be many implementations of an `NFT` that would make it relevant for use in a game. Our `GamePieceNFT` is as minimal as possible so that it could be used in a number of simple games. Fundamentally, the `NFT` defined here serves to maintain a mechanism to retrieve the win/loss record for games in which it's been played. For a simple game like Rock, Paper, Scissors, something like the metadata defined in `GamingMetadataViews.BasicWinLoss` is sufficient. 

In order for all players to trust the validity of win/loss metadata, the metadata should only be mutable by the relevant game. Given this requirement, our `NFT` was implemented as a simple example demonstrating how an `NFT` could expose certain data to be mutated by authorized parties, but not it's owners. The `WinLossViews` metadata effectively serves as a pointer to the game which the metadata refers to, allowing the game to define the access and conditions under which the metadata could be altered.

Games can add their respective retrievers with `addWinLossRetriever()`, and the `NFT`'s `WinLossView` can be resolved using `resolveView()`. The simplest way to explain the storage patern of an `NFT`'s win/loss data is that the `NFT`'s `BasicWinLoss` is stored on the relevant game contract while the `NFT` stores a retriever that can access and return its `BasicWinLoss` record within that game.

The usual components of a standard `NFT` contract such as `Collection` and associated interface implementations are present as well. 

#### ***Considerations***

For this proof of concept, we did not find a `Minter` resource necessary, but anyone referring to this design should consider if they find such a resource necessary for things like rate-limiting, allowing/disallowing minting, accepting tokens to authorize minting of a new token, etc.

Another consideration is the namespace of game names which map to `BasicWinLossRetriever` Capabilities. In the current design of this contract, there is a potential spam vector where an attacker adds an arbitrary number of game names and retriever capabilities, filling the namespace of `NFT.winLossRetrieverCaps`.

A potential solution includes introducing a `deleteWinLossRetriever()` method so `NFT` owners can remove Capabilities. Another solution might be to design a game name registry where a game must pay a fee in some token denomination. Doing so might return some resource or Capability that would give the game the ability to add their registered name and retriever Capability to a player's `NFT`. In addition to minimizing the spam vector, this solution also introduces a new monetizization licensing-like mechanism to gaming `NFT` creators.

### **RockPaperScissorsGame**

All the of above components are pulled together in this smart contract implementation of single-round match Rock, Paper, Scissors. Again, this is a simple proof of concept that will hopefully illuminate the power of Cadence and Flow for the purpose of game development on-chain.

Before getting into the contract level details, let's first cover the basic gameplay setup defined here. The idea is that two players engage in a single round of Rock, Paper, Scissors where Rock > Scissors > Paper > Rock > ... and so on. A match is mediated by a central game client that coordinates the match and submits moves on behalf of both players. Once the match has been created, the players submit their `NFT`s so that the game can record the match win/loss history of that `NFT`. After the moves are submitted by the match administrator, a winner is decided, win/loss results are recorded, and the `NFT`s are returned to their owners.

Now let's go over what that looks like in the contract. In broad strokes, under the model of a central game client submitting moves on behalf of players, we define a `GameAdmin` that administers matches between `GamePlayer`s. This `GameAdmin` maintains a mapping of `MatchAdminActions` Capabilities which allow it to `submitMoves()` on behalf of the two players.

The `GamePlayer` maintains a mapping of `Match.id` to `MatchPlayerActions`, allowing the player to `escrowNFT()` (which must occur by both players before a match can be played) and `returnPlayerNFTs()`, which simply returns the escrowed NFTs to the `NonFungibleToken.Receiver` passed upon escrow deposit (assuming the match is over or has timed out).

The pattern outlined above allows a `GameAdmin` to ask the game contract to create a `Match`, save the new `Match` to the contract's account storage, and link `MatchAdminActions` and `MatchPlayerActions` to the account's private storage. From there, the `MatchAdminActions` are added to the `GameAdmin`'s `matchAdminActionsCapabilities`.

To add a `GamePlayer` to a match, the player could call `signUpForMatch()` with the desired `matchID` which would add the `MatchPlayerActions` to the `GamePlayer`'s `matchPlayerCapabilities`. Alternatively, the `GamePlayerPublic` interface exposes the ability for a `GamePlayer` to be added to a `Match` by anyone. To see this in action, check out the `game_admin_setup_new_match` transaction.

Once a match has been set up, two NFTs must be escrowed. Then, `MatchAdminActions` can submit moves with `submitMoves()` which:

1. determines the winner
2. alters the `BasicWinLoss` metadata of the `NFT` in `winLossRecords` based on the outcome
3. returns the escrowed `NFT`s to the respective `Receiver`s

>Note that a `Match` can only be utilized once.

Taking a look at the contract, you'll see that the core logic of Rock, Paper, Scissors is exposed in the contract function `determineRockPaperScissorsWinner()`. This was done intentionally in hopes that the core logic could be used in other variations. You could imagine another contract that defines a `Match` resource using other `NFT`s or that combines logic of a hypothetical tic-tac-toe game or that runs for multiple rounds and requires a buy-in from players which goes to the winner. Again, this is designed to be built on by the Flow community, so have fun with it and make building the game part of the fun!

#### ***Considerations***

Something a game developer might want to consider is whether they want a central `GameAdmin` coordinating play between players via `MatchAdminActions`. The `Match.submitMoves()` function assumes that the submiting admin is honest, but doesn't protect against dishonest administrators.

A possible disintermediated solution (soon to be implemented) would be to enable players to create and join `Match`es themselves. Adding another player could be done via the `GamePlayer`'s `GamePlayerPublic` Capability. If you go this route, you'll want to put some thought into how you'll submit moves for a `Match` asynchronously and in a manner that protects each player's ability to submit their own moves and associate it directly with their `NFT`'s win/loss data - you wouldn't want someone else to submit your moves simply by including your `NFT.id` and a move.

___

### Happy Path Walkthrough

With the context and components explained, we can more closely examine how they interact in a full user interaction. For simplicity, we'll assume everything goes as it's designed and walk the happy path.

1. `GamePieceNFT` setup
    1. `setup_game_piece_nft_collection`
        1. Each player sets their account up with a `GamePieceNFT.Collection`, linking some public capabilities allowing for deposit of `NFT`s to their `Collection`
    2. `mint_game_piece_nft`
        1. Each player mints at least one `GamePieceNFT` to their `Collection` which will be used in gameplay for the sake of maintaining gameplay history (win/loss/ties)
2. `RockPaperScissorsGame` setup
    1. `setup_game_admin`
        1. The game client sets up a `GameAdmin` resource, allowing it to maintain access to `MatchAdminActions` Capabilities for all `Match`es it administers.
    2. `setup_game_player`
        1. Each player sets up a `GamePlayer` resource, allowing them to maintain access to `MatchPlayerActions` for each `Match` they’re participating in. Similar to how `NonFungibleToken.Receiver` allows others to `deposit()` artifacts, the `GamePlayerPublic` Capability implemented in `GamePlayer` also allows for public deposit of `MatchPlayerActions` so the user can be added to a `Match`. To enable this functionality, a `GamePlayerPublic` Capability should be linked in user’s public storage.
3. `Match` gameplay
    1. `game_admin_setup_new_match`
        1. The `GameAdmin` creates a `Match` (with `createMatch()`), which is then stored in the game contract’s storage. In addition to creating and storing the new `Match`, `MatchAdminActions` and `MatchPlayerActions` Capabilities are linked in the contract’s private storage. The `MatchAdminActions` are then added to the `GameAdmin`’s mapping maintaining its `MatchAdminActions` Capabilities
        2. To add `GamePlayers` to the `Match`, the `GameAdmin` then calls `addPlayerToMatch()`, passing the new `Match.id` and reference to the `GamePlayer`’s `GamePlayerPublic` Capability. The `MatchPlayerActions` Capability for the `Match` with the provided `id` is then added to the `GamePlayer`’s mapping, by calling `addMatchPlayerActionsCapability()` on the given reference and providing the relevant `MatchPlayerActions` and `Match.id`
    2. `game_player_escrow_nft`
        1. With the `MatchPlayerActions` Capability, each player then escrows their `GamePieceNFT`, providing the `NFT` and their `Collection`’s `NonFungibleToken.Receiver` Capability as parameters in `MatchPlayerActions.escrowNFT()`. The `Receiver` is provided so that the `NFT` can be easily returned to the player automatically at the end of the `Match`.
            1. As previously mentioned, the `NFT` is provided so that history of wins and losses can be recorded and maintained. Upon escrow to the Match, the `NFT`’s `id` is recorded and a `WinLoss` is added to the game contract’s `winLossRecords` mapping. Additionally, a `RPSWinLossRetriever` Capability is added to the `NFT` so that the recorded `WinLoss` can be accessed via the NFT’s `GamingMetadataViews.WinLossView` struct.
    3. `game_admin_submit_moves`
        1. Upon successful escrow of both players’ `NFT`s, the `Match` can be played. It’s assumed in this construction that each players’ moves will be submitted to a game client off-chain. Once the game client has received each player’s moves, the `GameAdmin` accessed the `Match`’s `MatchAdminActions`, and calls `submitMoves()`. This method - `submitMoves()` - does a number of things before finalizing the `Match`:
            1. Calls to game logic defined in a contract method, `determineRockPaperScissorsWinner()`, passing the provided moves and `NFT.id` associated with each move. The called function then returns the `id` of the winning `NFT` or `nil` if the result is a tie.
            2. The `Match` results for each `NFT` are then recorded in the contract’s `winLossRecord` with `updateWinLossRecord()`
            3. The `Match` is labeled as no longer in play (`inPlay = false`)
            4. The escrowed `NFT`s are returned to both player’s by calling deposit on the provided `Receiver`



## Transaction Diagrams

Below you'll find diagrams that visualize the flow between all components for each major game-related transaction.

### `setup_game_admin` and `setup_game_player`
![Setup GameAdmin and Setup_GamePlayer](/images/rps_setup_game_admin_and_game_player.png)

### `game_admin_setup_new_match`
![GameAdmin setup new Match](/images/rps_game_admin_setup_new_match.png)

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

1. Deploy all contracts:
    ```sh
    flow run
    ```
1. Create players accounts: 
    1. Player 1:
        ```sh
        flow accounts create
        ```
        
        account name: `player-one`
    1. Player 2: 
        ```sh
        flow accounts create
        ```
        
        account name: `player-two`
1. Admin setup as `GameAdmin`:
    ```sh
    flow transactions send ./transactions/setup_game_admin.cdc
    ```
1. Players setup as `GamePlayer`s: 
    1. Player one:
        ```sh
        flow transactions send ./transactions/setup_game_player.cdc --signer player-one
        ```
    1. Player two:
        ```sh
        flow transactions send ./transactions/setup_game_player.cdc --signer player-two
        ```
1. Players setup NFT collection: 
    1. Player one:
        ```sh
        flow transactions send ./transactions/setup_game_piece_nft_collection.cdc --signer player-one
        ```
    1. Player two: 
        ```sh
        flow transactions send ./transactions/setup_game_piece_nft_collection.cdc --signer player-two
        ```
1. Players mint GamePieceNFT: 
    1. Player one:
        ```sh
        flow transactions send ./transactions/mint_game_piece_nft.cdc --signer player-one
        ```
    1. Player two:
        ```sh
        flow transactions send ./transactions/mint_game_piece_nft.cdc --signer player-two
        ```
1. Admin creates new match with args `<player_one_address> <player_two_address> <match_timeout_in_minutes>`:
    ```sh
    flow transactions send ./transactions/game_admin_setup_new_match.cdc 01cf0e2f2f715450 179b6b1cb6755e31 5
    ```
1. Get matches ids from Admin with arg `<game_admin_address>`: 
    ```sh
    flow scripts execute ./scripts/get_matches_ids.cdc f8d6e0586b0a20c7
    ```
1. Get Score NFTs ids from Players with arg `<player_address>`: 
    1. Player one:
        ```sh
        flow scripts execute ./scripts/get_collection_ids.cdc 01cf0e2f2f715450
        ```
    1. Player two:
        ```sh
        flow scripts execute ./scripts/get_collection_ids.cdc 179b6b1cb6755e31
        ```
1. Players escrow GamePieceNFTs with args `<match_id> <nft_id>`:
    1. Player one:
        ```sh
        flow transactions send ./transactions/game_player_escrow_nft.cdc 37 35 --signer player-one
        ```
    1. Player two:
        ```sh
        flow transactions send ./transactions/game_player_escrow_nft.cdc 37 36 --signer player-two
        ```
1. Admin submit moves on behalf of both players with args `<match_id> <player_one_nft_id> <player_one_move> <player_two_nft_id> <player_two_move>`: 
    ```sh
    flow transactions send ./transactions/game_admin_submit_moves.cdc 37 35 0 36 2
    ```
1. Get scores associated with each player's NFT `<player_address> <nft_id>`: 
    1. Player one:
        ```sh
        flow scripts execute ./scripts/get_rps_win_loss_view.cdc 01cf0e2f2f715450 35
        ```
    1. Player two: 
        ```sh
        flow scripts execute ./scripts/get_rps_win_loss_view.cdc 179b6b1cb6755e31 36
        ```

___

 