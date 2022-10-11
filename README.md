1. Deploy all contracts: `flow run`
1. Create players accounts: 
    1. Player 1: `flow accounts create` account name: "player-one"
    1. Player 2: `flow accounts create` account name: "player-two"
1. Admin setup as `GameAdmin`: `flow transactions send ./transactions/setup_game_admin.cdc`
1. Players setup as `GamePlayer`s: 
    1. Player one: `flow transactions send ./transactions/setup_game_player.cdc --signer player-one`
    1. Player two: `flow transactions send ./transactions/setup_game_player.cdc --signer player-two`
1. Players setup NFT collection: 
    1. Player one: `flow transactions send ./transactions/setup_score_nft_collection.cdc --signer player-one`
    1. Player two: `flow transactions send ./transactions/setup_score_nft_collection.cdc --signer player-two`
1. Players mint ScoreNFT: 
    1. Player one: `flow transactions send ./transactions/mint_score_nft.cdc --signer player-one`
    1. Player two: `flow transactions send ./transactions/mint_score_nft.cdc --signer player-two`
1. Admin creates new match: `flow transactions send ./transactions/game_admin_setup_new_match.cdc 01cf0e2f2f715450 179b6b1cb6755e31 5`
1. Get matches ids from Admin: `flow scripts execute ./scripts/get_matches_ids.cdc f8d6e0586b0a20c7`
1. Get Score NFTs ids from Players: 
    1. Player 1: `flow scripts execute ./scripts/get_collection_ids.cdc 01cf0e2f2f715450`
    1. Player 2: `flow scripts execute ./scripts/get_collection_ids.cdc 179b6b1cb6755e31`
1. Players escrow ScoreNFTs:
    1. `flow transactions send ./transactions/game_player_escrow_nft.cdc 36 34 --signer player-one`
    1. `flow transactions send ./transactions/game_player_escrow_nft.cdc 36 35 --signer player-two`
1. Admin submit moves on behalf of both players: `flow transactions send ./transactions/game_admin_submit_moves.cdc 36 34 0 35 2`
    * Cool to see one by one move submission for async play
        - Re: Commit-Reveal - "Couldn't you have a revealer service running? Every client encrypts for a generated public key and when all the players have submitted the revealer submits the key to the chain." - Justin Barry
1. Get player's scores: 
    1. Player 1: `flow scripts execute ./scripts/get_rps_win_loss_view.cdc 01cf0e2f2f715450 34`
    1. Player 1: `flow scripts execute ./scripts/get_rps_win_loss_view.cdc 179b6b1cb6755e31 35`