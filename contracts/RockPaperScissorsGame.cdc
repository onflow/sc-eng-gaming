pub contract RockPaperScissorsGame {

	// Simple enum to identify match winner
	pub enum Winner: UInt8 {
		pub case playerOne
		pub case playerTwo
	}

	/// Name of the game
	pub let name: String
	/// Moves that are allowed for this game
	pub let allowableMoves: [String]
	/// Field that stores win/loss records for every NFT that has played this game
	pub let winLossRecords: {UInt64: MetadataViews.WinLoss}
	/// Maintain matches in a mapping
	access(contract) let matches: @{UInt64: Match}

	// Relevant events to watch
	pub event PlayerOneDeposited(game: String, matchID: UInt64)
	pub event PlayerTwoDeposited(game: String, matchID: UInt64)
	pub event MatchOver(game: String, matchID: UInt64, winner: RockPaperScissorsGame.Winner)

	/// Struct used to submit & resolve player moves according to the
	/// rules of Rock Paper Scissors
	pub struct Moves {
		pub let playerOneMove: String
		pub let playerTwoMove: String
		access(self) let winner: GameContract.Winner?

		pub fun resolveMoves(): GameContract.Winner {
			// return winner if already decided
			if self.winner != nil {
				return self.winner
			}

			// Check playerOneMove agains playerTwoMove to decide winner with
			// guarantees that they are not equal as enforced in init pre
			switch moves.playerOneMove {
				// playerOne played rock
				case GameContract.allowableMoves[0]:
					if moves.playerTwoMove == GameContract.allowableMoves[1] {
						// playerTwo played paper -> playerTwo wins
						self.winner = GameContract.Winner.playerTwo
						return self.winner
					} else if {
						// playerTwo played scissors -> playerOne wins
						self.winner = GameContract.Winner.playerOne
						return self.winner
					}
				// playerOne played paper
				case GameContract.allowableMoves[1]:
					if moves.playerTwoMove == GameContract.allowableMoves[0] {
						// playerTwo played rock -> playerOne wins
						self.winner = GameContract.Winner.playerOne
						return self.winner
					} else if moves.playerTwoMove == GameContract.allowableMoves[2] {
						// playerTwo played scissors -> playerTwo wins
						self.winner = GameContract.Winner.playerTwo
						return self.winner
					}
				// playerOne played scissors
				case GameContract.allowableMoves[2]:
					if moves.playerTwoMove == GameContract.allowableMoves[0] {
						// playerTwo played rock -> playerTwo wins
						self.winner = GameContract.Winner.playerTwo
						return self.winner
					} else if moves.playerTwoMove == GameContract.allowableMoves[1] {
						// playerTwo played paper -> playerOne wins
						self.winner = GameContract.Winner.playerOne
						return self.winner
					}
			}
		}

		// Set variables on construction, ensuring provided moves are legal
		init(playerOneMove: String, playerTwoMove: String) {
			// Ensure that the moves are allowed & that they are not the same
			pre {
				GameContract.allowableMoves.contains(playerOneMove) &&
				GameContract.allowableMoves.contains(playerTwoMove): "Provided moves are not legal for this game!"
				playerOneMove != playerTwoMove: "No ties allowed, try again!"
			}
			self.playerOneMove = playerOneMove
			self.playerTwoMove = playerTwoMove
			self.winner == nil
		}
	}

	pub resource interface MatchAdmin {
		pub let id: UInt64
		pub fun submitMoves(moves: RockPaperScissorsGame.Moves)
		pub fun returnAssetsToOwners()
		pub fun getMatchID(): UInt64
	}

	pub resource interface PlayerOne {
		pub let id: UInt64
		pub fun depositPlayerOne(nft: @NFT, receiver: Capability<{NonFungibleToken.Receiver}>)
		pub fun returnAssetsToOwners()
		pub fun getMatchID(): UInt64
	}

	pub resource interface PlayerTwo {
		pub let id: UInt64
		pub fun depositPlayerTwo(nft: @NFT, receiver: Capability<{NonFungibleToken.Receiver}>)
		pub fun returnAssetsToOwners()
		pub fun getMatchID(): UInt64
	}

	/// Resource defining a Match as a single round of Rock Paper Scissors
	/// Logic for move hierarchy is contained in the struct above, Moves
	pub resource Match: MatchAdmin, PlayerOne, PlayerTwo {

		pub let id: UInt64
		pub let createdTimestamp: UInt64
		pub let timeout: UInt64

		// Defines whether match is still in play or not
		access(self) var inPlay: Bool
		
		pub var playerOneNFT: @ExampleNFT.NFT?
		pub var playerOneReceiver: Capability<{NonFungibleToken.Receiver}>?

		pub var playerTwoNFT: @ExampleNFT.NFT?
		pub var playerTwoReceiver: Capability<{NonFungibleToken.Receiver}>?

		pub fun depositPlayerOne(nft: @NFT, receiver: Capability<{NonFungibleToken.Receiver}>) {
			pre {
				self.playerOneNFT == nil && self.playerOneReceiver == nil: "Match is already in play!"
				self.inPlay == true: "Match is over!"
			}
			post {
				self.playerOneNFT == nft && self.playerOneReceiver == receiver: "Deposit to Match unsuccessful!"
			}
			// if nft doesn't already have a winLossRetriever, add it
			// then store it in player one
			nft.addWinLossRetriever(gameName: RockPaperScissorsGame.name, retriever: RockPaperScissorsGame.retrieveWinLoss)
			self.playerOneNFT <- nft
			self.playerOneReceiver = receiver
			emit PlayerOneDeposited(game: RockPaperScissorsGame.name, matchID: self.id)
		}
		

		pub fun depositPlayerTwoNFT(nft: @NFT, receiver: Capability<{NonFungibleToken.Receiver}>) {
			pre {
				self.playerTwoNFT == nil && self.playerTwoReceiver == nil: "Match is already in play!"
				self.inPlay == true: "Match is over!"
			}
			post {
				self.playerTwoNFT == nft && self.playerTwoReceiver == receiver: "Deposit to Match unsuccessful!"
			}

			// if nft doesn't already have a winLossRetriever, add it
			// then store it in player One or player two
			nft.addWinLossRetriever(gameName: RockPaperScissorsGame.name, retriever: RockPaperScissorsGame.retrieveWinLoss)
			self.playerTwoNFT <- nft
			self.playerTwoReceiver = receiver
			emit PlayerTwoDeposited(game: RockPaperScissorsGame.name, matchID: self.id)
		}

		pub fun returnAssetsToOwners() {
			pre {
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: "Cannot return NFTs while Match is still in play!"
			}
			// return the NFTs to their owners
			if playerOneNFT != nil {
				self.playerOneReceiver.borrow()!.deposit(nft: self.playerOneNFT)
			}
			if playerTwoNFT != nil {
				self.playerTwoReceiver.borrow()!.deposit(nft: self.playerTwoNFT)
			}
		}

		// can only be called by the game admin to submit moves for both players
		pub fun submitMoves(moves: RockPaperScissorsGame.Moves) {
			pre {
				self.playerOneNFT != nil && self.player != nil: "Both players must escrow NFTs before play begins!"
			}

			// Resolve any Game logic necessary to figure out a winner
			let winner = moves.resolveMoves()

			// Then update the win loss records for both the players
			// TODO: Implement these in the contract
			RockPaperScissorsGame.updateWinLossRecord(
				id: self.playerOneNFT.id,
				win: winner == GameContract.Winner.playerOne
			)
			RockPaperScissorsGame.updateWinLossRecord(
				id: self.playerTwoNFT.id,
				win: winner == GameContract.Winner.playerTwo
			)

			// Finally, end match & return assets
			self.inPlay = false
			self.playerOneReceiver.borrow()!.deposit(self.playerOneNFT)
			self.playerTwoReceiver.borrow()!.deposit(self.playerTwoNFT)

			emit MatchOver(game: RockPaperScissorsGame.name, matchID: self.id, winner: winner)
		}

		pub fun getMatchID(): UInt64 {
			return self.id
		}

		init(matchTimeout: UInt64) {
			self.id = self.uuid
			self.inPlay == true
			self.createdTimestamp = getCurrentBlock().timestamp
			self.timeout = matchTimeout
		}

		destroy() {
			pre {
				self.playerOneNFT == nil && self.playerTwoNFT == nil: "Cannot destroy while NFTs in escrow!"
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: "Cannot destroy while Match is still in play!"
			}
			destroy self
		}
	}

	/// Wrapper resource allowing the MatchAdmin to preserve reference to the nested
	/// Match resource in the wrappers mapping
	pub resource MatchAdminWrapper {
		pub let matchAdminRef: &AnyResource{MatchAdmin}

		init(_ ref: &AnyResource{MatchAdmin}) {
			self.matchAdminRef = ref
		}
	}

	/// Function to create a new match and return a wrapper resource with which to
	/// administer the match
	pub fun createNewMatch(matchTimeout: UInt64): @MatchAdminWrapper {
		// Create the new match & preserve its ID
		let newMatch = create <- Match(matchTimeout: matchTimeout)
		let newMatchID = newMatch.id
		// Add the match to the matches mapping
		self.matches[newMatchID]! <- newMatch
		
		// Protect against uncommon nil case
		if let newMatchAdminRef = &self.matches[newMatchID] as &AnyResource{MatchAdmin}? {
			// Return the wrapper resource
			return <- create MatchAdminWrapper(newMatchAdminRef)
		}
		return nil
	}

	/// Get a reference to the PlayerOne resource
	pub fun getPlayerOne(matchID: UInt64): &AnyResource{PlayerOne}? {
		post {
			result == nil || result?.id == matchID:
				"Cannot borrow PlayerTwo reference: the ID of the returned reference is incorrect"
		}
		return &self.matches[matchID] as &AnyResource{PlayerOne}?
	}

	/// Get a reference to the PlayerTwo resource
	pub fun getPlayerTwo(matchID: UInt64): &AnyResource{PlayerTwo}? {
		post {
			result == nil || result?.id == matchID:
				"Cannot borrow PlayerTwo reference: the ID of the returned reference is incorrect"
		}
		return &self.matches[matchID] as &AnyResource{PlayerTwo}?
	}

	// Retriever for winloss data to be added to deposited NFTs metadata retrievers
	pub fun retrieveWinLoss(id: UInt64): MetadataViews.WinLoss {
		return self.winLossRecords[id]
	}

	// Method to update winloss data for each NFT
	access(contract) fun updateWinLossRecord(id: UInt64, win: Bool) {
		if win {
			self.winLossRecords[id].addWin()
		} else {
			self.winLossRecords[id].addLoss()
		}
	}

	init() {
		self.allowableMoves = ["rock", "paper", "scissors"]
		self.matches <- {}
	}
}
 