pub contract GameContract {

	/// Name of the game
	pub let name: String

	/// Field that stores win/loss records for every NFT that has played this game
	pub let winLossRecords: {UInt64: MetadataViews.WinLoss}

	pub let adminCapReceiver:

	pub fun retrieveWinLoss(id: UInt64): MetadataViews.WinLoss {
		return self.winLossRecords[id]
	}

	pub resource interface GameAdmin {
		pub fun submitMoves()
	}

	pub resource interface User {
		pub fun withdraw()
	} 

	pub resource GameSession {
		
		pub var playerOneNFT: @ExampleNFT.NFT?
		pub var playerOneReceiver: Capability<{NonFungibleToken.Receiver}>?

		pub var playerTwoNFT: @ExampleNFT.NFT?

		pub fun deposit(nft: @NFT, receiver: Capability<{NonFungibleToken.Receiver}>) {
			// if nft doesn't already have a winLossRetriever, add it
			// then store it in player One or player two
			nft.addWinLossRetriever(gameName: Game.name, retriever: Game.retrieveWinLoss)
				self.playerOneNFT <- nft
		}

		pub fun withdraw(): @NFT

			// can only be called by the game admin to submit moves for both players
			pub fun submitMoves(moves: GameMoves) {
					
			// Resolve any Game logic necessary to figure out a winner

			// then update the win loss records for both the players
		    Game.updateWinLossRecord(id: self.playerOneNFT.id, win: true)
			Game.updateWinLossRecord(id: self.playerTwoNFT.id, win: false)

		}
	}

	pub fun createGame(nft: @NFT, receiver: Capability<{NonFungibleToken.Receiver}>): {
		let session <- create GameSession()
		session.deposit(nft, receiver)

		GameContract.account.save(<-session, to: /storage/GameSession.uuid().concat(self.name))

		adminCap = GameContract.account.link(admin)
		self.capReceiver.depositSessionCapability(adminCap)
		userCap = GameContract.account.link(user)
		return userCap
	}

	pub fun joinGame(gameID: UInt)

	pub resource Admin {

		pub fun createGameSession()
	}
		
}
