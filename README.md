# Rock Paper Scissors Onchain | (🪨 📃 ✂️) - ⛓️

This repo originated as an proof of concept onchain Rock Paper Scissors game as an exploration in blockchain gaming powered by [Cadence](https://developers.flow.com/cadence/intro) on [Flow](https://flow.com/). Through that process, the UX hurdles faced by all onchain games - wallet onboarding, in-game transaction signing, etc. - revealed there was no way to create a meaningfully onchain game that was also user-friendly and permissionlessly composable. Consequently, this repo served as a sandbox to prototype [Hybrid Custody](https://flow.com/hybrid-custody) and make [account linking](https://developers.flow.com/concepts/account-linking) a reality.

The contents in this repo are the onchain components powering the [Walletless Arcade](https://walletless-arcade-game.vercel.app/).

In addition to onchain gaming, you'll find a number of novel Cadence implemenations including:

- 🔗 Linked accounts
- 📲 Walletless onboarding
- 🏆 Dynamic NFTs

<details>
<summary>Table of Contents</summary>

- [Overview](#overview)
    - [Gameplay Overview](#gameplay-overview)
- [Components](#components)
    - [Summary](#summary)
    - [Gaming](#gaming)
    - [Linked Accounts](#linked-accounts)
    - [Supporting](#supporting)
    - [Composition](#composition)
- [User Walkthrough](#user-walkthrough)
    - [Onboarding](#onboarding)
        - [Wallet-less Onboarding](#wallet-less-onboarding)
        - [Blockchain-Native Onboarding](#blockchain-native-onboarding)
    - [Gameplay](#gameplay)
    - [Edge Case Resolution](#edge-case-resolution)
- [Demo on Emulator](#demo-on-emulator)
    - [Pre-Requisites](#pre-requisites)
    - [Walletless Demo Walkthrough](#walletless-demo-walkthrough)
    - [Blockchain-Native Onboarding Demo](#blockchain-native-onboarding-demo)


</details>

___
# Overview

As gaming makes its way into Web 3.0, bringing with it the next swath of mainstream users, we created this repo as a playground to develop proof of concept implementations that showcase the power of onchain games built with the Cadence resource-oriented programming language. Through this exploration, we discovered the importance of improving onboarding and reducing in-app UX friction, and so iterated our way to an initial [hybrid custody model](https://flow.com/post/flow-blockchain-mainstream-adoption-easy-onboarding-wallets). It's our hope that the work and exploration here uncovers unique design patterns that are useful towards composable game designs and, more broadly, novel custody models, helping to pave the way for a thriving community of developers building the best apps in the world on Flow.

For our first proof of concept game, we've created the `RockPaperScissorsGame` and supporting contract `GamingMetadataViews`.

As a learning ground for upcoming Cadence [Attachments](https://developers.flow.com/cadence/language/attachments#docusaurus_skipToContent_fallback), we wanted to demonstrate how NFT metadata could update with gameplay in an entirely separate contract than the NFT was defined. So we created `DynamicNFT` which contains interfaces for attachments & receivers for those attachments. 

The attachment receiver portion of that model is implemented in `GamePieceNFT` (modeled heavily after [`MonsterMaker`](https://github.com/onflow/monster-maker)) and the attachments are implemented in `RockPaperScissorsGame`.

Taken together with any NFT implementing `DynamicNFT`, these contracts define an entirely onchain game with a dynamic NFT that accesses an ongoing record of its win/loss data.

> :information_source: While Hybrid Custody contracts & transactions are included in this repo, they're not critical to the core gameplay logic. It's recommended that readers focus on understanding the game-related contracts and components and layer on the process of account linking in the context of the application user flow.

## Gameplay Overview

Players engage in single or two-player single round matches of RPS. After configuring their `GamePlayer` resource, users can start a match by escrowing a `GamePieceNFT`. The match is playable once both players have escrowed their NFTs (or after the first player to escrow if in single player mode). The escrowed NFT gets an attachment enabling retrieval of its win/loss record and another that maintains the playable moves for the game - rock, paper, and scissors, as expected.

> :information_source: NFTs are escrowed into matches to ensure the NFT provided is a) actually owned by the player and b) players can't bypass updates to their NFT's win/loss record.

Once playable, the match proceeds in stages - commit and resolve (to be replaced by a commit-reveal pattern to obfuscate onchain moves). Players must first commit their moves. After both players have submitted moves, the match can be resolved. On resolution, a winner is determined and the associated NFT's win/loss record is amended with the match results.

Of course, once the match is over (or if a timeout is reached without resolution) the escrowed NFTs can then be returned to their respective escrowing players.

Things get much more interesting when the onchain game is coupled with account linking - seen in [this demo](https://walletless-arcade-game.vercel.app/) - allowing for embedded wallets to abstract transaction execution in-app while unlocking those in-app assets to be accessible by a user's primary wallet. To facilitate a fuller game experience in said app, `TicketToken` was introduced as a player reward for winning matches, just like you'd win in an real arcade!

## Marketplace Overview

The accompanying `TicketToken` and `ArcadePrize` contracts aren't special in and of themselves - simple FT and NFT contracts. However, once a user links their wallet with the app account used to play the game - the account issued `TicketToken` when the player wins a match - the authenticated account is issued access to the app account. This link between accounts exists onchain and establishes what we'll call a "parent-child" hierarchy between user accounts where the user's wallet mediated account is the "parent" to the partitioned "child" account.

> :information_source: This setup introduces account models similar to Web2's app authorization into our decentralized Web3 context. Linked child accounts can be thought of as sub-accounts to the parent, allowing both the user **and** the custodial party (game app in this case) to maintain access on the app-managed account. 

After linking, the user can authenticate in other unrelated apps with their wallet, and any app recognizing Hybrid Custody accounts can identify all associated child accounts, their contents, and facilitate transactions interacting with child-account custodied assets with a transaction signed by the parent account alone.

To demonstrate this, `ArcadePrize` accepts `TicketToken` redemption for minting NFTs. Redeeming FTs for NFTs isn't new, but the ability to sign a transaction with one account and, using delegated account access, acquire funds from another to mint an NFT to the signing account **is** new, and it solves an enormous problem in the Web3 app experience. 

# Components

## Gaming

* **GamingMetadataViews** - Defining the metadata structs relevant to an NFT's win/loss data and assigned moves as well as interfaces designed to be implemented as attachments for NFTs. These interfaces enable the implementing contracts to alter values associated with data on an NFT's attachments via limited access control, a useful feature for smart contract game development, among other use cases.

* **RockPaperScissorsGame** - As you might imagine, this contract contains the game's moves, logic as well as resources and interfaces defining the rules of engagement in the course of a match. Additionally, receivers for Capabilities to matches are defined in `GamePlayer` resource and interfaces that allow players to create matches, be added and add others to matches, and engage with the matches they're in. The `Match` resource is defined as a single round of Rock, Paper, Scissors that can be played in either single or two player modes, with single-player modes randomizing the second player's move on a contract function call.

## Supporting

* **DynamicNFT** - This contract defines interfaces for attachments & resources which receive those attachments as nested resources as well as resolve metadata related those attachments.
* **GamePieceNFT** - An example NFT implementation of `DynamicNFT`, [featuring png's seen elsewhere](https://monster-maker-web-client.vercel.app/) in Flow demos, and used to demonstrate NFT escrow in `RockPaperScissorsGame` gameplay.
* **TicketToken** - A simple FungibleToken implementation intended for use as redemption tokens in exchange for `ArcadePrize` NFTs
* **ArcadePrize** - Another example implementation, this time of a NonFungibleToken. Minting requires `TicketToken` redemption. An interesting note, you can redeem

## Hybrid Custody

Contracts enabling account linking are not critical to the gameplay, but layer nicely to create a smooth in-app experience. While understanding the Hybrid Custody contracts is useful, it's recommended you focus on understanding the game-related contracts and components before layering on these mental constructs if you're solely intersted in understanding the mechanics of the onchain gaming.

> :information_source: For more info on the parts making up `HybridCustody`, check out [these docs](https://developers.flow.com/concepts/account-linking)

## Composition

Taking a look at `RockPaperScissorsGame`, you'll see that it stands on its own - a user with any `DynamicNFT` can engage with the game to play single and multiplayer matches. The same goes for `TicketToken` and `GamePieceNFT` contracts in that they are independent components not necessarily designed to be used together.

Each set of contracts were created as composable building blocks and used together to create a unique app experience.

`HybridCustody` was layered on to solve both the app UX problem created by the current dichotomous app- v. self-custody paradigms and to give users access to in-app assets outside the context of the custodial app.

### Considerations

Optimizing for openness and interoperability is not without its tradeoffs.

The game contract's use of any NFT maximizes composability, but it means that NFTs with the same ID cause collisions in the win/loss record mapping indexed on escrowed NFT IDs. This shouldn't be an issue for NFTs that assign ids on UUIDs, but users could experience a case where they effectively share a win/loss record with another NFT of the same ID. This could be handled by indexing on the hash of an NFT's ID along with its Type which should yield a unique value or alternatively, the NFTs UUID. The latter would be a harder ask as it's unlikely a requestor would have the NFT's UUID on hand if it's not already the equivalent to its ID. In the end, the contract indexes on UUID.

A bit of a note on best practices...it's evident that defining onchain game logic must involve adversarial thinking. For example, we could have (and did at one point) return NFTs from escrow on match resolution to remove the need for an additional function call. However, we discovered that a malicious player could technically prevent `Match` resolution (a custom `Receiver` could `panic` on `deposit()`). This along with the revelation that a malicious player could also assure game outcomes with the afforementioned post-condition on match results led us to the commit-resolve pattern you see in the contracts & transactions.
___

# User Walkthrough

With the context and components explained, we can more closely examine how they interact in an end-to-end user experience. For simplicity, we'll assume everything goes as it's designed and walk the happy path.

## Onboarding
With linked accounts, there are two ways a user can onboard.

- 🌈 **"Wallet-less" onboarding** - First, a app can onboard a user with Web2 credentials, creating a Flow account for the user and abstracting away key management.

- 🔗 **"Blockchain-native" onboarding flow** - Second, a user native to the Flow ecosystem can connect their wallet and start the app experience with controll over the app account. In our version, the app will still abstract key management, but will additionally delegate control over the app account to the user's authenticated account via AuthAccount Capabilities.

### Wallet-less Onboarding

After a user authenticates via some traditional Web2 authentication mechanism, the app initiates walletless onboarding

1. A new public/private key pair is generated
1. Providing the generated public key, initial funding amount, and `MonsterComponent` NFT attributes, the walletless onboarding transaction starts by creating a new account from the signer's `AccountCreator` resource.

    :warning: Note that any old account creation mechanism can be used in your walletless onboarding flow, but this resource allowed us to query created addresses from custodied keys.

1. A `GamePieceNFT` Collection is configured in the new account
1. The signer mints a `GamePieceNFT` to the new account's Collection
1. A `GamePlayer` resource is configured in the new account so it can play `RockPaperScissorsGame.Match`es
1. A `TicketToken.Vault` is saved & linked in the new account

### Blockchain-native Onboarding

After a user's wallet has been connected, run the blockchain-native multisig onboarding transaction signed by both a developer account & the user. Note that this would require a backend account pre-configured with an `AccountCreator` & funded with FLOW to pay for new account creation, though account creation can be handled by many other mechanisms.

This onboarding transaction does the following.

1. Given a generated public key (private key managed by the game dev), funding amount, a minter address, and hybrid custody filter & factory addresses
1. Creates a new account & optionally funds it with $FLOW
1. Configures the account with a `GamePieceNFT` Collection
1. Configures the new account with a `GamePlayer` resource
1. Sets up a `TicketToken` Vault in the new account
1. Sets up `GamePieceNFT.Collection` in the user's connected account
1. Sets up a `TicketToken.Vault` in the user's connected account
1. Preps the new account to link to the signing user's account, setting up an `HybridCustody.OwnedAccount` resource in the new account
1. Configures a `HybridCustody.Manager` in the user's account
1. Mints a `GamePieceNFT` to the new account's `Collection`
1. Links the new account as a child of the user's account, saving a Capability on the child account in the user's `HybridCustody.Manager`

> :information_source: The output of this transaction is a new account, custodied by the key provider, fully configured for gameplay, and linked to the signing user's account as a child account. **Both** the user **and** the application have access on the new account - the user via `HybridCustody` and the app via key custody.

## Gameplay

- <details><summary>Single-Player Gameplay</summary>

    1. Player creates a new match, escrowing their NFT along with their NFT `Receiver`. Note that match timeout is established on creation, which prevents the escrowed NFT from being retrieved during gameplay.
        - `RPSAssignedMoves` and `RPSWinLossRetriever` are attached to their escrowed NFT if they are not already attached
    1. Player submits their move
    1. Player calls for automated player's move to be submitted
    1. In a separate transaction (enforced by block height), player calls `resolveMatch()` to determine the outcome of the `Match`
        1. The win/loss record is recorded for the player's NFT
        1. The win/loss record is recorded for the designated contract's `dummyNFTID`
        1. The escrowed NFT is returned to the escrowing player
    1. Player calls for escrowed NFT to be returned via `returnPlayersNFTs()`. Since the `Match` returns the escrowed NFTs directly via the given `Receiver` Capability, we made this a separate call to prevent malicious Capabilities from disallowing resolution. In this case, the worst a malicious Capability could do would be force the other player to call `retrieveUnclaimedNFT()` in order to have their NFT returned.
    </details>

- <details><summary>Multi-Player Gameplay</summary>

    1. Player one creates a new match, escrowing their NFT. Note that match timeout is established on creation, which prevents the escrowed NFT from being retrieved during gameplay.
        - `RPSAssignedMoves` and `RPSWinLossRetriever` are attached to their escrowed NFT if they are not already attached
    1. Player one adds `MatchLobbyActions` Capability to Player two's `GamePlayerPublic`
        1. Player one gets `GamePlayerPublic` Capability from Player two
        1. Player one calls `addPlayerToMatch()` on their `GamePlayer`, passing the `matchID` and the reference to Player two's `GamePlayerPublic`
    1. Player two escrows their NFT into the match
        1. `RPSAssignedMoves` and `RPSWinLossRetriever` are attached to their escrowed NFT if they are not already attached
    1. Each player submits their move
    1. After both moves have been submitted, any player can then call for match resolution
        1. A winner is determined
        1. The win/loss records are recorded for each NFT
        1. Each NFT is returned to their respective owners
    1. Any player calls for escrowed NFT to be returned via `returnPlayersNFTs()`. Since the `Match` returns the escrowed NFTs directly via the given `Receiver` Capability, we made this a separate call to prevent malicious Capabilities from disallowing resolution. In this case, the worst a malicious Capability could do would be to require that the other player call `retrieveUnclaimedNFT()` in a separate transaction to retrieve their singular NFT from escrow.
    </details>
    

## Edge Case Resolution

### **NFTs are escrowed, but the moves are never submitted**

Since a match timeout is specified upon `Match` creation and retrieval of `NFT`s is contingent on either the timeout being reached or the `Match` no longer being in play, a player can easily retrieve their `NFT` after timeout by calling `returnPlayerNFTs()` on their `MatchPlayerActions` Capability.

Since this Capability is linked on the game contract account which (in an actual stakes environment) shouldn't have active keys, the user can be assured that the Capability will not be unlinked. Additionally, since the method deposits the `NFT` to the `Receiver` provided upon escrow, they can be assured that it will not be accessible to anyone else calling `returnPlayerNFTs()`.

### **NFTs are escrowed, but player unlinks their `Receiver` Capability before the NFT could be returned**

In this edge case, the `Receiver` Capability provided upon escrowing would no longer be linked to the depositing player’s `Collection`. In this case, as long as the escrowing player still has their `GamePlayer`, they could call `retrieveUnclaimedNFT()`, providing a reference to their `GamePlayerID` and the `Receiver` they want their NFT returned to.

### **Player provides a Receiver Capability that panics in its deposit() method**

This wouldn't be encountered by the `Match` until `returnPlayerNFTs()` is called after match resolution. Depending on the order of the `Receiver` Capabilities in the `nftReceivers` mapping, this could prevent the other player from retrieving their NFT via that function. At that point, however, the winner & loser have been decided and the game is over (`inPlay == false`). The other player could then call `retrieveUnclaimedNFT()` to retrieve the NFT that the trolling Receiver was preventing from being returned.

### **Player changes their mind after NFT escrow & before move submission**

In the event a player changes their mind after creating a match, they'd currently have to wait the length of timeout to call `returnPlayerNFTs()`. Changing this behavior is scoped as a future improvement to enable abandoning a match before initiating gameplay, likely only to be updated in singleplayer mode matches.
___

# Demo on Emulator

To demo the functionality of this repo, clone it and follow the steps below by entering each command using [Flow CLI](https://github.com/onflow/flow-cli) from the package root:

## Pre-Requisites

- Start the emulator & deploy the contracts
    
    - In one terminal window, run:
        ```sh
        flow emulator
        ```
    
    - In another terminal window, run the setup script creating our accounts & deploying contracts:
        ```sh
        sh setup.sh
        ```
    
    - Lastly, a HybridCustody pre-requisite includes setting up a Capability `Filter` and Capability Factory `Manager`. These ensure that parent account access is scoped to just the Capabilities they need to interact with the assets we as the developer want them to access. For more info on `CapabilityFilter` & `CapabilityFactory`, read [these docs](https://developers.flow.com/concepts/hybrid-custody/guides/linking-accounts#pre-requisites).

        ```sh
        flow transactions send ./transactions/hybrid_custody/dev_setup/setup_filter_and_factory_manager.cdc \
            045a1763c93006ca GamePieceNFT 045a1763c93006ca TicketToken --signer emulator-game
        ```

## Walletless Demo Walkthrough

### Onboarding

1. Generate public/private key pair
    
    ```sh
    flow keys generate
    ```
    
2. Initialize walletless onboarding
    * `onboarding/walletless_onboarding`
        1. `pubKey: String,`
        1. `fundingAmt: UFix64,`
        1. `monsterBackground: Int,`
        1. `monsterHead: Int,`
        1. `monsterTorso: Int,`
        1. `monsterLeg: Int`
    
    ```sh
    flow transactions send transactions/onboarding/walletless_onboarding.cdc <PUBLIC_KEY> <FUNDING_AMT> <BACKGROUND> <HEAD> <TORSO> <LEG> --signer emulator-game
    ```
    
3. Query for new account address from public key
    * `child_account/get_child_address_from_public_key_on_creator: Address`
        1. `creatorAddress: Address`
        2. `pubKey: String`
    
    ```sh
    flow scripts execute scripts/account_creator/get_address_from_pub_key.cdc 045a1763c93006ca <PUBLIC_KEY>
    ```
    
4. Add the child account to your flow.json (assuming following along on flow-cli)
    
    ```json
    "accounts": {
        "emulator-account": {
            "address": "f8d6e0586b0a20c7",
            "key": "<EMULATOR_ACCOUNT_PRIVATE_KEY>"
        },
        "child": {
            "address": "01cf0e2f2f715450",
            "key": "<CHILD_PRIVATE_KEY>"
        }
    }
    ```

### Gameplay

1. Query for `NFT.id` 
    * `game_piece_nft/get_collection_ids: [UInt64]`
        * `address: Address`
    
    ```sh
    flow scripts execute scripts/game_piece_nft/get_collection_ids.cdc <CHILD_ADDRESS>
    ```
    
2. Query for `GamePlayer.id`
    * `rock_paper_scissors_game/get_game_player_id: UInt64`
        * `playerAddress: Address`
    
    ```sh
    flow scripts execute scripts/rock_paper_scissors_game/get_game_player_id.cdc <CHILD_ADDRESS>
    ```
    
3. Setup a new singleplayer `Match`
    * `rock_paper_scissors_game/game_player/setup_new_singleplayer_match`
        1. `submittingNFTID: UInt64`
        2. `matchTimeLimitInMinutes: UInt`
    
    ```sh
    flow transactions send transactions/rock_paper_scissors_game/game_player/setup_new_singleplayer_match.cdc <NFT_ID> <TIME_LIMIT> --signer child
    ```
    
4. Query `Match.id`
    1. Listen for `NewMatchCreated` event filtered on `creatorID == GamePlayer.id`
    2. `rock_paper_scissors_game/get_matches_in_play: [UInt64]`
        * `address: Address`
    
    ```sh
    flow scripts execute scripts/rock_paper_scissors_game/get_matches_in_play.cdc <CHILD_ADDRESS>
    ```
    
5. Submit moves for the `Match`
    * `rock_paper_scissors_game/game_player/submit_both_singleplayer_moves`
        1. `matchID: UInt64`
        2. `move: UInt8`
    
    ```sh
    flow transactions send transactions/rock_paper_scissors_game/game_player/submit_both_singleplayer_moves.cdc <MATCH_ID> <MOVE> --signer child
    ```
    
6. Resolve `Match` & return escrowed NFTs
    * `rock_paper_scissors_game/game_player/resolve_match_and_return_nfts`
        * `matchID: UInt64`
    
    ```sh
    flow transactions send transactions/rock_paper_scissors_game/game_player/resolve_match_and_return_nfts.cdc <MATCH_ID> --signer child
    ```
    
7. Query move history for both players one of a number of ways:
    1. Listen for `MatchOver` event filtered on `matchID == Match.id` and map user’s `GamePlayer.id` to `player1ID` or `player2ID` in the event values, displaying the `player1MoveRawValue` and `player2MoveRawValue` as appropriate
    2. `rock_paper_scissors_game/get_match_move_history: {UInt64: RockPaperScissorsGame.SubmittedMove}?`
        * `matchID: UInt64`
        
        ```sh
        flow scripts execute scripts/rock_paper_scissors_game/get_match_move_history.cdc <MATCH_ID>
        ```
        
    3. `rock_paper_scissors_game/get_match_move_history_as_raw_values: {UInt64: UInt8}?`
        * `matchID: UInt64`
        
        ```sh
        flow scripts execute scripts/rock_paper_scissors_game/get_match_move_history_as_raw_values.cdc <MATCH_ID>
        ```
        
8. Query player’s NFT win/loss record
    * `game_piece_nft/get_rps_win_loss: GamingMetadataViews.BasicWinLoss?`
        1. `address: Address`
        2. `id: UInt64`
        
        ```sh
        flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc <CHILD_ADDRESS> <NFT_ID>
        ```

### Connect Wallet & Link Accounts

There are two ways to go about this process. One involves a multi-signature transaction where both the existing app account (soon to be “child” account) and the user’s main account (soon to be “parent” account) sign a transaction in which all changes are made. Another approach is to have the app account sign a transaction publishing its AuthAccount capability to then be claimed by the user’s account in a subsequent transaction.

For both the following transaction, you'll want to create an account if following along in flow-cli

```sh
flow accounts create # account name: parent | network: emulator
```

> :information_source: Depending on your use case and custodial architecture, you may find it easier to configure publish & claim; however, both linking modalities are included for illustration.

<details>
<summary>Publish & Claim</summary>

This process leverages the [account `Inbox`](https://developers.flow.com/cadence/language/accounts#account-inbox) and involves two steps:

1. [Publish](./transactions/hybrid_custody/setup_owned_account_and_publish_to_parent.cdc)
1. [Claim](./transactions/hybrid_custody/redeem_account.cdc)

The app-custodied account sends the first transaction, configuring itself with `HybridCustody` constructs and publishing a `ChildAccoun` Capability for the specified parent account. The user subsequently sends another transaction, claiming the published Capability and storing it in a `HybridCustody.Manager` (configuring one if needed).
    
* Configure the app-custodied account as a child account & publish a capability on the account for the given parent account to claim
    1. `parent: Address`
    1. `factoryAddress: Address`
    1. `filterAddress: Address`

    ```sh
    flow transactions send transactions/hybrid_custody/setup_owned_account_and_publish_to_parent.cdc <PARENT_ADDRESS> 0x045a1763c93006ca 0x045a1763c93006ca --signer child
    ```

* Claim the published `ChildAccount` Capability & store in the signing parent account's `Manager`
    - `childAddress: Address`

    ```sh
    flow transactions send transactions/hybrid_custody/redeem_account.cdc <CHILD_ADDRESS> --signer parent
    ```


</details>

<details>
<summary>Multi-Sign</summary>

This process condenses the publish & claim path into a single transaction signed by both the parent and child accounts. In this transaction, a `HybridCustody.Manager` is configured in the user’s main account, capturing the app account’s `ChildAccount` capability in said `Manager`. The signing parent account is also configured with `GamePieceNFT.Collection` and `TicketToken.Vault` so each asset can be easily transferred between accounts.
    
* Both accounts sign the transaction, linking both accounts as parent-child and accomplishing Hybrid Custody.
    1. `childAccountFactoryAddress: Address`
    1. `childAccountFilterAddress: Address`

    ```sh
    flow transactions build transactions/hybrid_custody/add_account_multi_sign.cdc \
        0x045a1763c93006ca 0x045a1763c93006ca \
        --proposer parent --payer parent --authorizer parent --authorizer child \
        --filter payload --save add_account_multi_sign.rlp
    ```
    
    ```sh
    flow transactions sign add_as_child_multisig --signer parent --signer child --filter payload --save add_account_multi_sign.rlp
    ```
    
    ```sh
    flow transactions send-signed add_account_multi_sign.rlp
    ```

</details>

At the end of either process, the two accounts are linked by resource representation onchain and both are configured such that the app has all it needs to play the game on behalf of the player. The user’s main account (AKA parent account) maintains a Capability on the app account (AKA child account) via `HybridCustody` components, allowing the player to access in-app assets while the app maintains signing authority on behalf of the user when playing in-game.

## Blockchain-Native Onboarding Demo
<aside>
🔔 Reminder to fulfill pre-requisites from above
</aside>

### Onboarding

1. Generate public/private key pair
    
    ```sh
    flow keys generate
    ```
    
2. Initialize blockchain-native onboarding, signing as both the authenticated user and the application's backend account.
    * `onboarding/blockchain_native_onboarding`
        1. `pubKey: String`
        1. `fundingAmt: UFix64`
        1. `factoryAddress: Address`
        1. `filterAddress: Address`
        1. `minterAddress: Address`
        
        <aside>
        ⚠️ Note: If you’re using `flow-cli`, you’ll want to add the created account as `“child”` to your `flow.json` before continuing. This is similar to the same step in walletless onboarding above
        </aside>

    ```sh
    flow transactions execute transactions/onboarding/blockchain_native_onboarding.cdc \
        <PUBLIC_KEY> 0.5 0x045a1763c93006ca 0x045a1763c93006ca 0x045a1763c93006ca \
        --proposer emulator-game --payer emulator-game --authorizer parent --authorizer emulator-game \
        --filter payload --save blockchain_native_onboarding.rlp
    ```
    
    ```sh
    flow transactions sign blockchain_native_onboarding.rlp --signer parent --signer emulator-game --filter payload --save blockchain_native_onboarding.rlp
    ```
    
    ```sh
    flow transactions send-signed blockchain_native_onboarding.rlp
    ```
        
3. Query for new account address from public key 
    * `account_creator/get_address_from_pub_key.cdc`
        1. `creatorAddress: Address`
        2. `pubKey: String`
    
    ```sh
    flow scripts execute scripts/account_creator/get_address_from_pub_key.cdc 045a1763c93006ca <PUBLIC_KEY>
    ```
    

### Minting TicketToken

Based on Match results (queried above in `game_piece_nft/get_rps_win_loss`) and checked against the user's `GamePlayer.id` (queried in `rock_paper_scissors_game/get_game_player_id`), we’ll want to mint tokens to the child account’s `TicketToken.Vault`. These tokens can be redeemed for an `ArcadePrize.NFT` later in the demo.

1. Mint tokens to the player’s app account
    * `ticket_token/mint_tokens`
        1. `recipient: Address`
        2. `amount: UFix64`
        
        ```sh
        flow transactions send transactions/ticket_token/mint_tokens.cdc <CHILD_ADDRESS> <AMOUNT>
        ```
        
2. Query the balance of tokens in the account
    * `ticket_token/get_balance: UFix64` - panics if Vault is not configured
        * `of: Address`
    
    ```sh
    flow scripts execute scripts/ticket_token/get_balance.cdc <CHILD_ADDRESS>
    ```
    

### Minting ArcadePrize.NFT

In this section, we’ll use the TicketToken.Vault in the child account to pay for an NFT to the signing account’s Collection. This serves as an example for how a app can present and utilize the assets in a connected account’s child account(s), creating a seamless experience compared to the fragmented UX previously inherent to isolated app accounts.

1. Query for the TicketToken.Vault.balance in each of the user’s child accounts
    1. `ticket_token/get_all_account_balances_from_storage: {Address: UFix64}`
        * `parentAddress: Address`
    
        ```sh
        flow scripts execute scripts/ticket_token/get_balance_of_all_child_accounts.cdc <PARENT_ADDRESS>
        ```
    
    1. `hybrid_custody/get_all_account_balances_from_storage: {Type: VaultInfo}`
        * `address: Address`
        
        ```sh
        flow scripts execute scripts/hybrid_custody/get_all_vault_bal_from_storage.cdc <PARENT_ADDRESS>
        ```
        
        ```cadence
        // Where VaultInfo has the following interface
        pub struct VaultInfo {
            pub let name: String?
            pub let symbol: String?
            pub var balance: UFix64
            pub let description: String?
            pub let externalURL: String?
            pub let logos: MetadataViews.Medias?
            pub let storagePathIdentifier: String
            pub let receiverPathIdentifier: String?
            pub let providerPathIdentifier: String?
        
            pub fun addBalance(_ addition: UFix64)
        }
        ```
    
2. Query for all publicly accessible NFTs in the connected account & its child accounts
    * `child_account/get_all_nft_display_views_from_public: [NFTData]`
        * `address: Address`

    ```sh
    flow scripts execute scripts/hybrid_custody/get_all_nft_display_views_from_storage.cdc <PARENT_ADDRESS>
    ```

    ```cadence
    // Where NFTData has the following interface
    pub struct NFTData {
        pub let name: String
        pub let description: String
        pub let thumbnail: String
        pub let resourceID: UInt64
        pub let ownerAddress: Address?
        pub let collectionName: String
        pub let collectionDescription: String
        pub let collectionURL: String
        pub let collectionStoragePathIdentifier: String?
        pub let collectionPublicPathIdentifier: String
    }
    ```

1. Mint a rainbow duck for 10.0 TicketTokens, redeeming the TicketTokens in the user’s child account & minting to the signer’s Collection
    * `arcade_prize/mint_rainbow_duck_paying_with_child_vault`
        1. `fundingChildAddress: Address`
        2. `minterAddress: Address`
    
    ```sh
    flow transactions send transactions/arcade_prize/mint_rainbow_duck_paying_with_child_vault.cdc <CHILD_ADDRESS> 045a1763c93006ca --signer parent
    ```
    
1. Again query for all publicly accessible NFTs in the connected account & its child accounts to see the NFT that was minted among all of the user’s owned NFTs
    * `child_account/get_all_nft_display_views_from_public: [NFTData]`
        * `address: Address`
    
    ```bash
    flow scripts execute scripts/hybrid_custody/get_all_nft_display_views_from_storage.cdc <PARENT_ADDRESS>
    ```
___

# Play Self-Custodied on Testnet

The contracts in this repos have been deployed to 

If you want to play this game on testnet in a fully fledged Hybrid Custody app, check out our demo implementation [here](https://walletless-arcade-game.vercel.app/).

As for good old fashioned self-custody, while you won't be able to perform TicketToken minting, you can play RockPaperScissors Matches using your own wallet and NFTs. You could however use your own NFTs to engage with the contracts via Flow CLI, [FlowRunner](https://runflow.pratikpatel.io/) or [Raft](https://raft.page/nvdtf/welcome-to-raft). Here's how:

1. Onboard your account with GamePieceNFT Collection, NFT, & GamePlayer resource
    * `onboarding/self_custody_onboarding.cdc`
        * `minterAddress: Address`
    ```
    flow transactions send transactions/onboarding/self_custody_onboarding.cdc 917b2b1dafdcfa58 --signer <YOUR_ACCOUNT_NAME> --network testnet
    ```
    1. Check out your new resources on [FlowView](https://testnet.flowview.app/) & note your GamePlayer.id & NFT.id
1. After you have a Collection, NFT, & GamePlayer configured, you're ready to play the game!
    * `rock_paper_scissors_game/game_player/setup_new_singleplayer_match.cdc`
        1. `submittingNFTID: UInt64`
        1. `matchTimeLimitInMinutes: UInt`
    ```
    flow transactions send transactions/rock_paper_scissors_game/game_player/setup_new_singleplayer_match.cdc <NFT_ID> <MATCH_TIMEOUT> --signer <YOUR_ACCOUNT_NAME> --network testnet
    ```
1. Submit your move & the randomized second player's move
    * `rock_paper_scissors_game/game_player/submit_both_singleplayer_moves.cdc`
        1. `matchID: UInt64`
        1. `move: UInt8` - 0: rock, 1: paper, 2: scissors
    ```
    flow transactions send transactions/rock_paper_scissors_game/game_player/submit_both_singleplayer_moves.cdc <MATCH_ID> <MOVE> --signer <YOUR_ACCOUNT_NAME> --network testnet
    ```
1. Resolve the Match & return your NFT. Note that resolution needs to occur at least one block from when the last move was submitted.
    * `rock_paper_scissors_game/game_player/resolve_match_and_return_nfts.cdc`
        * `matchID: UInt64`
    ```
    flow transactions send transactions/rock_paper_scissors_game/game_player/resolve_match_and_return_nfts.cdc <MATCH_ID> --signer <YOUR_ACCOUNT_NAME> --network testnet
    ```
    
1. Query the moves played for the Match
    * `rock_paper_scissors_game/get_match_move_history: {UInt64: RockPaperScissorsGame.SubmittedMove}?`
        * `matchID: UInt64`
    ```
    flow scripts execute scripts/rock_paper_scissors_game/get_match_move_history.cdc <MATCH_ID> --network testnet
    ```
1. You can additionally query your NFT's win/loss record
    * `game_piece_nft/get_rps_win_loss: GamingMetadataViews.BasicWinLoss?`
        1. `address: Address`
        2. `id: UInt64`
    ```
    flow scripts execute scripts/game_piece_nft/get_rps_win_loss.cdc <YOUR_ADDRESS> <NFT_ID> --network testnet
    ```
 