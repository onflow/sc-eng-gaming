# Rock Paper Scissors (Mostly) On-Chain

## Overview

In this version of RockPaperScissors, a central game client submits both players’ moves in a single function call to a `Match` administrator Capability.

___

## Demo Using Flow CLI

To demo the functionality of this repo, clone it and follow the steps below by entering each command using Flow CLI from the package root:

1. Deploy all contracts:
    ```console
    flow run
    ```
1. Create players accounts: 
    1. Player 1:
        ```console
        flow accounts create
        ```
        
        account name: `player-one`
    1. Player 2: 
        ```console
        flow accounts create
        ```
        
        account name: `player-two`
1. Admin setup as `GameAdmin`:
    ```console
    flow transactions send ./transactions/setup_game_admin.cdc
    ```
1. Players setup as `GamePlayer`s: 
    1. Player one:
        ```console
        flow transactions send ./transactions/setup_game_player.cdc --signer player-one
        ```
    1. Player two:
        ```console
        flow transactions send ./transactions/setup_game_player.cdc --signer player-two
        ```
1. Players setup NFT collection: 
    1. Player one:
        ```console
        flow transactions send ./transactions/setup_score_nft_collection.cdc --signer player-one
        ```
    1. Player two: 
        ```console
        flow transactions send ./transactions/setup_score_nft_collection.cdc --signer player-two
        ```
1. Players mint ScoreNFT: 
    1. Player one:
        ```console
        flow transactions send ./transactions/mint_score_nft.cdc --signer player-one
        ```
    1. Player two:
        ```console
        flow transactions send ./transactions/mint_score_nft.cdc --signer player-two
        ```
1. Admin creates new match with args `<player_one_address> <player_two_address> <match_timeout_in_minutes>`:
    ```console
    flow transactions send ./transactions/game_admin_setup_new_match.cdc 01cf0e2f2f715450 179b6b1cb6755e31 5
    ```
1. Get matches ids from Admin with arg `<game_admin_address>`: 
    ```console
    flow scripts execute ./scripts/get_matches_ids.cdc f8d6e0586b0a20c7
    ```
1. Get Score NFTs ids from Players with arg `<player_address>`: 
    1. Player one:
        ```console
        flow scripts execute ./scripts/get_collection_ids.cdc 01cf0e2f2f715450
        ```
    1. Player two:
        ```console
        flow scripts execute ./scripts/get_collection_ids.cdc 179b6b1cb6755e31
        ```
1. Players escrow ScoreNFTs with args `<match_id> <nft_id>`:
    1. Player one:
        ```console
        flow transactions send ./transactions/game_player_escrow_nft.cdc 36 34 --signer player-one
        ```
    1. Player two:
        ```console
        flow transactions send ./transactions/game_player_escrow_nft.cdc 36 35 --signer player-two
        ```
1. Admin submit moves on behalf of both players with args `<match_id> <player_one_nft_id> <player_one_move> <player_two_nft_id> <player_two_move>`: 
    ```console
    flow transactions send ./transactions/game_admin_submit_moves.cdc 36 34 0 35 2
    ```
1. Get scores associated with each player's NFT `<player_address> <nft_id>`: 
    1. Player one:
        ```console
        flow scripts execute ./scripts/get_rps_win_loss_view.cdc 01cf0e2f2f715450 34
        ```
    1. Player two: 
        ```console
        flow scripts execute ./scripts/get_rps_win_loss_view.cdc 179b6b1cb6755e31 35
        ```

___

## Components

### **GamingMetadataViews**

This contract defines the basic structure of NFT metadata `WinLoss` related to simple games like Rock Paper Scissors, with wins, losses, and ties as well as exposing the ability to increment those values.

The `WinLossView` maintains a mapping of game names to the game's respective 'WinLoss' retriever. This pattern was established to allow game contracts to maintain their own histories of NFT IDs to `WinLoss` data while also enabling an NFT to easily retrieve the data stored about it.

### **ScoreNFT**

This NFT was implemented as a simple example demonstrating how an NFT could expose certain data to be mutated by some parties, but not it's owners. The `WinLossViews` metadata effectively serves as a pointer to the game which the metadata refers to, allowing the game to define the access and conditions under which the metadata could be altered.

Games can add their respective retrievers with `addWinLossRetriever()`. And `WinLossView` can be resolved using `resolveView()`.

The usual components of an NFT contract such as `Collection` and associated interface implementations are present as well.

### **RockPaperScissorsGame**

The game contract contains all of the game logic and components that enable access restricted gameplay.

In broad strokes, under the model of a central game client submitting moves on behalf of players, we define a `GameAdmin` that administers matches between `GamePlayer`s. This `GameAdmin` maintains a mapping of `MatchAdminActions` Capabilities which allow it to `submitMoves()` on behalf of the two players.

The `GamePlayer` maintains a mapping of `Match.id` to `MatchPlayerActions`, allowing the player to `escrowNFT()` (which must occur by both players before a match can be played) and `returnPlayerNFTs()`, which simply returns the escrowed NFTs to the `NonFungibleToken.Receiver` passed upon escrow deposit (assuming the match is over or has timed out).

The pattern outlined above allows a `GameAdmin` to ask the game contract to create `Match`, save the new `Match` to the contract's account storage, and link `MatchAdminActions` and `MatchPlayerActions` to the account's private storage. From there, the `MatchAdminActions` are added to the `GameAdmin`'s `matchAdminActionsCapabilities`.

To add a `GamePlayer` to a match, the player could call `signUpForMatch()` with the desired `matchID` which would add the `MatchPlayerActions` to the `GamePlayer`'s `matchPlayerCapabilities`. Alternatively, the `GamePlayerPublic` interface exposes the ability for a `GamePlayer` to be added to a `Match` by anyone. To see this in action, check out the `game_admin_setup_new_match` transaction.

Once a match has been set up, two NFTs must be escrowed. Then, `MatchAdminActions` can submit moves with `submitMoves` which:

1. determines the winner
2. alters the `WinLoss` metadata of the NFT in `winLossRecords` based on the outcome
3. returns the escrowed NFTs to the respective `Receiver`s

>Note that a `Match` can only be utilized once.

___

### Happy Path Walkthrough

1. `ScoreNFT` setup
    1. `setup_score_nft_collection`
        1. Each player sets their account up with a `ScoreNFT.Collection`, linking some public capabilities allowing for deposit of `NFT`s to their `Collection`
    2. `mint_score_nft`
        1. Each player mints at least one `ScoreNFT` to their `Collection` which will be used in gameplay for the sake of maintaining gameplay history (win/loss/ties)
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
        1. With the `MatchPlayerActions` Capability, each player then escrows their `ScoreNFT`, providing the `NFT` and their `Collection`’s `NonFungibleToken.Receiver` Capability as parameters in `MatchPlayerActions.escrowNFT()`. The `Receiver` is provided so that the `NFT` can be easily returned to the player automatically at the end of the `Match`.
            1. As previously mentioned, the `NFT` is provided so that history of wins and losses can be recorded and maintained. Upon escrow to the Match, the `NFT`’s `id` is recorded and a `WinLoss` is added to the game contract’s `winLossRecords` mapping. Additionally, a `WinLossRetriever` is added to the `NFT` so that the recorded `WinLoss` can be accessed via the NFT’s `GamingMetadataViews.WinLossView` struct.
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
![GamePlayer escrow ScoreNFT](/images/rps_game_player_escrow_nft.png)

### `game_admin_submit_moves`
![GameAdmin submit player Moves](/images/rps_game_admin_submit_moves.png)

___

## Edge Case Resolution

#### **NFTs are escrowed, but the moves are never submitted**

Since a match timeout is specified upon `Match` creation and retrieval of `NFT`s is contingent on either the timeout being reached or the `Match` no longer being in play, a player can easily retrieve their `NFT` after timeout by calling `returnPlayerNFTs()` on their `MatchPlayerActions` Capability.

Since this Capability is linked on the game contract account which shouldn’t not have active keys, the user can be assured that the Capability will not be unlinked. Additionally, since the method deposits the `NFT` to the `Receiver` provided upon escrow, they can be assured that it will not be accessible to anyone else calling `returnPlayerNFTs()`.

#### **NFTs are escrowed, but player unlinks their `Receiver` Capability before the NFT could be returned**

In this edge case, the `Receiver` Capability provided upon escrowing would no longer be linked to the depositing player’s `Collection`. Such an edge case is not handled in this version of the game, but should be considered to avoid permanent loss of their `NFT` should this situation occur.