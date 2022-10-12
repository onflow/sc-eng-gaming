import ScoreNFT from "./ScoreNFT.cdc"
import GamingMetadataViews from "./GamingMetadataViews.cdc"

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
	pub let winLossRecords: {UInt64: GamingMetadataViews.WinLoss}
  /// Maintain matches in a mapping
	access(contract) let matches: @{UInt64: RockPaperScissorsGame.Match}

	// Relevant events to watch
	pub event PlayerOneDeposited(game: String, matchID: UInt64)
	pub event PlayerTwoDeposited(game: String, matchID: UInt64)
	pub event MatchOver(game: String, matchID: UInt64)

	/// Struct used to submit & resolve player moves according to the
	/// rules of Rock Paper Scissors
	pub struct Moves {
		pub let playerOneMove: String
		pub let playerTwoMove: String
		access(self) var winner: RockPaperScissorsGame.Winner?

		pub fun resolveMoves(): RockPaperScissorsGame.Winner? {
			// return winner if already decided
			if self.winner != nil {
				return self.winner
			}

			// Check playerOneMove agains playerTwoMove to decide winner with
			// guarantees that they are not equal as enforced in init pre
			switch self.playerOneMove {
				// playerOne played rock
				case RockPaperScissorsGame.allowableMoves[0]:
					if self.playerTwoMove == RockPaperScissorsGame.allowableMoves[1] {
						// playerTwo played paper -> playerTwo wins
						self.winner = RockPaperScissorsGame.Winner.playerTwo
						return self.winner
					} else if self.playerTwoMove == RockPaperScissorsGame.allowableMoves[2] {
						// playerTwo played scissors -> playerOne wins
						self.winner = RockPaperScissorsGame.Winner.playerOne
						return self.winner
					}
				// playerOne played paper
				case RockPaperScissorsGame.allowableMoves[1]:
					if self.playerTwoMove == RockPaperScissorsGame.allowableMoves[0] {
						// playerTwo played rock -> playerOne wins
						self.winner = RockPaperScissorsGame.Winner.playerOne
						return self.winner
					} else if self.playerTwoMove == RockPaperScissorsGame.allowableMoves[2] {
						// playerTwo played scissors -> playerTwo wins
						self.winner = RockPaperScissorsGame.Winner.playerTwo
						return self.winner
					}
				// playerOne played scissors
				case RockPaperScissorsGame.allowableMoves[2]:
					if self.playerTwoMove == RockPaperScissorsGame.allowableMoves[0] {
						// playerTwo played rock -> playerTwo wins
						self.winner = RockPaperScissorsGame.Winner.playerTwo
						return self.winner
					} else if self.playerTwoMove == RockPaperScissorsGame.allowableMoves[1] {
						// playerTwo played paper -> playerOne wins
						self.winner = RockPaperScissorsGame.Winner.playerOne
						return self.winner
					}
			}

			return nil
		}

		// Set variables on construction, ensuring provided moves are legal
		init(playerOneMove: String, playerTwoMove: String) {
			// Ensure that the moves are allowed & that they are not the same
			pre {
				RockPaperScissorsGame.allowableMoves.contains(playerOneMove) &&
				RockPaperScissorsGame.allowableMoves.contains(playerTwoMove): "Provided moves are not legal for this game!"
				playerOneMove != playerTwoMove: "No ties allowed, try again!"
			}
			self.playerOneMove = playerOneMove
			self.playerTwoMove = playerTwoMove
			self.winner = nil
		}
	}

	pub resource interface MatchAdmin {
		pub let id: UInt64
		pub fun submitMoves(moves: RockPaperScissorsGame.Moves)
		pub fun returnAssetsToOwners()
	}

	pub resource interface PlayerOne {
		pub let id: UInt64
		pub fun depositPlayerOne(nft: @ScoreNFT.NFT, receiver: Capability<&AnyResource{NonFungibleToken.Receiver}>)
		pub fun returnAssetsToOwners()
	}

	pub resource interface PlayerTwo {
		pub let id: UInt64
		pub fun depositPlayerTwo(nft: @ScoreNFT.NFT, receiver: Capability<&AnyResource{NonFungibleToken.Receiver}>)
		pub fun returnAssetsToOwners()
	}

	/// Resource defining a Match as a single round of Rock Paper Scissors
	/// Logic for move hierarchy is contained in the struct above, Moves
	pub resource Match: MatchAdmin, PlayerOne, PlayerTwo {

		pub let id: UInt64
		pub let createdTimestamp: UFix64
		pub let timeout: UFix64

		// Defines whether match is still in play or not
		access(self) var inPlay: Bool
		
		pub var playerOneNFT: @ScoreNFT.NFT?
		pub var playerOneReceiver: Capability<&AnyResource{NonFungibleToken.Receiver}>?

		pub var playerTwoNFT: @ScoreNFT.NFT?
		pub var playerTwoReceiver: Capability<&AnyResource{NonFungibleToken.Receiver}>?

		pub fun depositPlayerOne(nft: @ScoreNFT.NFT, receiver: Capability<&AnyResource{NonFungibleToken.Receiver}>) {
			pre {
				self.playerOneNFT == nil && self.playerOneReceiver == nil: "Match is already in play!"
				self.inPlay == true: "Match is over!"
			}

			// If nft doesn't already have a winLossRetriever, add it
			nft.addWinLossRetriever(gameName: RockPaperScissorsGame.name, retriever: RockPaperScissorsGame.retrieveWinLoss)
			// Construct WinLoss Metadata if none exists
			if RockPaperScissorsGame.winLossRecords[nft.id] == nil {
				RockPaperScissorsGame.winLossRecords[nft.id] = GamingMetadataViews.WinLoss(
					game: RockPaperScissorsGame.name,
					nftID: nft.id
				)
			}
			// Then store player's NFT & Receiver
			self.playerOneNFT <-! nft
			self.playerOneReceiver = receiver
			emit PlayerOneDeposited(game: RockPaperScissorsGame.name, matchID: self.id)
		}
		

		pub fun depositPlayerTwoNFT(nft: @ScoreNFT.NFT, receiver: Capability<&AnyResource{NonFungibleToken.Receiver}>) {
			pre {
				self.playerTwoNFT == nil && self.playerTwoReceiver == nil: "Match is already in play!"
				self.inPlay == true: "Match is over!"
			}

			// If nft doesn't already have a winLossRetriever, add it
			nft.addWinLossRetriever(gameName: RockPaperScissorsGame.name, retriever: RockPaperScissorsGame.retrieveWinLoss)
			// Construct WinLoss Metadata if none exists
			if RockPaperScissorsGame.winLossRecords[nft.id] == nil {
				RockPaperScissorsGame.winLossRecords[nft.id] = GamingMetadataViews.WinLoss(
					game: RockPaperScissorsGame.name,
					nftID: nft.id
				)
			}
			// Then store player's NFT & Receiver
			self.playerTwoNFT <-! nft
			self.playerTwoReceiver = receiver
			emit PlayerTwoDeposited(game: RockPaperScissorsGame.name, matchID: self.id)
		}

		pub fun returnAssetsToOwners() {
			pre {
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: "Cannot return NFTs while Match is still in play!"
			}
			// return the NFTs to their owners
			if self.playerOneNFT != nil {
				self.playerOneReceiver!.borrow()!.deposit(token: <-self.playerOneNFT as! @NonFungibleToken.NFT)
			}
			if self.playerTwoNFT != nil {
				self.playerTwoReceiver!.borrow()!.deposit(token: <-self.playerTwoNFT as! @NonFungibleToken.NFT)
			}
		}

		// can only be called by the game admin to submit moves for both players
		pub fun submitMoves(moves: RockPaperScissorsGame.Moves) {
			pre {
				self.playerOneNFT != nil && self.playerTwoNFT != nil: "Both players must escrow NFTs before play begins!"
			}

			// Resolve any Game logic necessary to figure out a winner
			let winner = moves.resolveMoves()

			// Then update the win loss records for both the players
			// TODO: Implement these in the contract
			RockPaperScissorsGame.updateWinLossRecord(
				id: self.playerOneNFT.id,
				win: winner == RockPaperScissorsGame.Winner.playerOne
			)
			RockPaperScissorsGame.updateWinLossRecord(
				id: self.playerTwoNFT.id,
				win: winner == RockPaperScissorsGame.Winner.playerTwo
			)

			// Finally, end match & return assets
			self.inPlay = false
			self.playerOneReceiver.borrow()!.deposit(self.playerOneNFT)
			self.playerTwoReceiver.borrow()!.deposit(self.playerTwoNFT)

			emit MatchOver(game: RockPaperScissorsGame.name, matchID: self.id)
		}

		init(matchTimeout: UFix64) {
			self.id = self.uuid
			self.inPlay = true
			self.createdTimestamp = getCurrentBlock().timestamp
			self.timeout = matchTimeout
			self.playerOneNFT <- nil
			self.playerOneReceiver = nil
			self.playerTwoNFT <- nil
			self.playerTwoReceiver = nil
		}

		destroy() {
			pre {
				self.playerOneNFT == nil && self.playerTwoNFT == nil: "Cannot destroy while NFTs in escrow!"
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: "Cannot destroy while Match is still in play!"
			}
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
	pub fun createNewMatch(matchTimeout: UFix64): @MatchAdminWrapper? {
		// Create the new match & preserve its ID
		let newMatch <- create Match(matchTimeout: matchTimeout)
		let newMatchID = newMatch.id
		// Add the match to the matches mapping
		self.matches[newMatchID] <-! newMatch
		
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
	pub fun retrieveWinLoss(id: UInt64): GamingMetadataViews.WinLoss? {
		return self.winLossRecords[id]
	}

	// Method to update winloss data for each NFT
	access(contract) fun updateWinLossRecord(id: UInt64, win: Bool) {
		if win {
			self.winLossRecords[id]!.addWin()
		} else {
			self.winLossRecords[id]!.addLoss()
		}
	}

	init() {
		self.allowableMoves = ["rock", "paper", "scissors"]
		self.matches <- {}
		self.name = "RockPaperScissors"
		self.winLossRecords = {}
	}
}
 