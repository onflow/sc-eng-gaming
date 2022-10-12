1. Deploy all contracts: `flow run`
1. Setup account as GameAdmin: `flow transactions send ./transactions/setup_game_admin.cdc`
1. Setup account as GamePlayer: `flow transactions send ./transactions/setup_game_player.cdc`
1. Setup NFT collection [GamePlayers]: `flow transactions send ./transactions/setup_score_nft_collection.cdc`
1. Mint Score NFT [GamePlayers]: `flow transactions send ./transactions/mint_score_nft.cdc`
1. Create new match [GameAdmin]: `flow transactions send ./transactions/game_admin_setup_new_match.cdc <Player1Address> <Player2Address>`
1. Get matches ids: `flow scripts execute ./scripts/get_matches_ids.cdc <GameAdminAddress>`
1. Get Score NFTs ids: `flow scripts execute ./scripts/get_collection_ids.cdc <AnyPlayerAddress>`
1. Escrow NFT [GamePlayers]: `flow transactions execute ./transactions/game_player_escrow_nft.cdc <MatchID> <NFTID>`
1. Submit moves [GameAdmin]: `flow transactions execute ./transactions/game_admin_submit_moves.cdc <MatchID> <NFTID1> <Move1> <NFTID2> <Move2>`
1. Get player score: `flow scripts execute ./scripts/get_rps_win_loss_view.cdc <AnyPlayerAddress>`