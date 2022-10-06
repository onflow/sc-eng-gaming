import ScoreNFT from "./ScoreNFT.cdc"
import GamingMetadataViews from "./GamingMetadataViews.cdc"
import NonFungibleToken from "./utility/NonFungibleToken.cdc"

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

	/// Set canonical paths
	pub let MatchStoragePath: StoragePath
	pub let MatchPrivatePath: PrivatePath
	pub let EscrowCollectionStoragePath: StoragePath
	pub let EscrowCollectionPrivatePath: PrivatePath

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
		pub fun escrowPlayerOne(nft: @ScoreNFT.NFT, receiver: Capability<&{NonFungibleToken.Receiver}>)
		pub fun returnAssetsToOwners()
	}

	pub resource interface PlayerTwo {
		pub let id: UInt64
		pub fun escrowPlayerTwo(nft: @ScoreNFT.NFT, receiver: Capability<&{NonFungibleToken.Receiver}>)
		pub fun returnAssetsToOwners()
	}

	/// Resource defining a Match as a single round of Rock Paper Scissors
	/// Logic for move hierarchy is contained in the struct above, Moves
	pub resource Match: MatchAdmin, PlayerOne, PlayerTwo {

		pub let id: UInt64
		pub let createdTimestamp: UFix64
		pub let timeout: UFix64

		// Defines whether match is still in play or not
		pub var inPlay: Bool

		// ScoreNFT Capability to custody NFTs during gameplay
		pub let escrowCollection: Capability<&ScoreNFT.Collection>
		// We'll track each players' NFTs by their IDs
		pub var playerOneNFTID: UInt64?
		pub var playerTwoNFTID: UInt64?
		// Keep Receiver Capabilities to easily return NFTs
		pub var playerOneReceiver: Capability<&{NonFungibleToken.Receiver}>?
		pub var playerTwoReceiver: Capability<&{NonFungibleToken.Receiver}>?

		init(matchTimeout: UFix64) {
			self.id = self.uuid
			self.inPlay = true
			self.createdTimestamp = getCurrentBlock().timestamp
			self.timeout = matchTimeout
			self.escrowCollection = RockPaperScissorsGame.createEscrowCollection(matchID: self.id)
			self.playerOneNFTID = nil
			self.playerTwoNFTID = nil
			self.playerOneReceiver = nil
			self.playerTwoReceiver = nil
		}

		// Dedicated 
		pub fun escrowPlayerOne(nft: @ScoreNFT.NFT, receiver: Capability<&{NonFungibleToken.Receiver}>) {
			pre {
				self.playerOneNFTID == nil && self.playerOneReceiver == nil: "Player1 has already escrowed!"
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
			let token <- nft as! @NonFungibleToken.NFT
			self.playerOneNFTID = token.id
			let escrowRef = self.escrowCollection.borrow()!
			escrowRef.deposit(token: <-token)
			self.playerOneReceiver = receiver
			emit PlayerOneDeposited(game: RockPaperScissorsGame.name, matchID: self.id)
		}
		

		pub fun escrowPlayerTwo(nft: @ScoreNFT.NFT, receiver: Capability<&{NonFungibleToken.Receiver}>) {
			pre {
				self.playerTwoNFTID == nil && self.playerTwoReceiver == nil: "Player2 has already deposited!"
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
			let token <- nft as! @NonFungibleToken.NFT
			self.playerTwoNFTID = token.id
			let escrowRef = self.escrowCollection.borrow()!
			escrowRef.deposit(token: <-token)
			self.playerTwoReceiver = receiver
			emit PlayerTwoDeposited(game: RockPaperScissorsGame.name, matchID: self.id)
		}

		pub fun returnAssetsToOwners() {
			pre {
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: "Cannot return NFTs while Match is still in play!"
			}
			let escrowRef = self.escrowCollection.borrow()!
			// return the NFTs to their owners
			if self.playerOneNFTID != nil {
				let nft <- escrowRef.withdraw(withdrawID: self.playerOneNFTID!)
				self.playerOneReceiver!.borrow()!.deposit(token: <-nft)
				self.playerOneNFTID = nil
			}
			if self.playerTwoNFTID != nil {
				let nft <- escrowRef.withdraw(withdrawID: self.playerTwoNFTID!)
				self.playerTwoReceiver!.borrow()!.deposit(token: <-nft)
				self.playerTwoNFTID = nil
			}
		}

		// can only be called by the game admin to submit moves for both players
		pub fun submitMoves(moves: RockPaperScissorsGame.Moves) {
			pre {
				self.escrowCollection.borrow()!.getIDs().length == 2:
					"Both players must escrow NFTs before play begins!"
			}

			// Resolve any Game logic necessary to figure out a winner
			let winner = moves.resolveMoves()

			// Then update the win loss records for both the players
			// TODO: Implement these in the contract
			RockPaperScissorsGame.updateWinLossRecord(
				id: self.playerOneNFTID!,
				win: winner == RockPaperScissorsGame.Winner.playerOne
			)
			RockPaperScissorsGame.updateWinLossRecord(
				id: self.playerTwoNFTID!,
				win: winner == RockPaperScissorsGame.Winner.playerTwo
			)

			// Finally, end match & return assets
			self.inPlay = false
			self.returnAssetsToOwners()

			emit MatchOver(game: RockPaperScissorsGame.name, matchID: self.id)
		}

		destroy() {
			pre {
				self.escrowCollection.borrow()!.getIDs().length == 0:
					"Cannot destroy while NFTs in escrow!"
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: 
					"Cannot destroy while Match is still in play!"
			}
		}
	}


	/** --- Wrappers for each party's capabilities --- */
	pub resource MatchAdminWrapper {
		pub let matchAdminCap: Capability<&{MatchAdmin}>
		init(_ admin: Capability<&{MatchAdmin}>) {
			self.matchAdminCap = admin
		}
	}

	pub resource PlayerOneWrapper {
		pub let playerOneCap: Capability<&{PlayerOne}>
		init(_ p1: Capability<&{PlayerOne}>) {
			self.playerOneCap = p1
		}
	}

	pub resource PlayerTwoWrapper {
		pub let playerTwoCap: Capability<&{PlayerTwo}>
		init(_ p2: Capability<&{PlayerTwo}>) {
			self.playerTwoCap = p2
		}
	}

	/** --- Contract helper functions --- */

	/// Function to create a new match and return the MatchAdmin Capability
	pub fun createNewMatch(matchTimeout: UFix64): Capability<&{MatchAdmin}> {
		// Create the new match & preserve its ID
		let newMatch <- create Match(matchTimeout: matchTimeout)
		let newMatchID = newMatch.id
		
		// Construct Match specific paths
		let matchPrivatePath = PrivatePath(identifier: self.MatchPrivatePath.toString().concat(newMatchID.toString()))!
		let matchStoragePath = StoragePath(identifier: self.MatchStoragePath.toString().concat(newMatchID.toString()))!
		
		// Save the match to this account
		self.account.save(<-newMatch, to: matchStoragePath)

		// Link each Capability to private
		self.account.link<&{MatchAdmin, PlayerOne, PlayerTwo}>(matchPrivatePath, target: matchStoragePath)
		
		return self.account.getCapability<&{MatchAdmin}>(self.MatchPrivatePath)!
	}

	access(contract) fun createEscrowCollection(matchID: UInt64): Capability<&ScoreNFT.Collection> {
		// Derive path
		let escrowCollectionStoragePath = StoragePath(identifier: self.EscrowCollectionStoragePath.toString().concat(matchID.toString()))!
		let escrowCollectionPrivatePath = PrivatePath(identifier: self.EscrowCollectionPrivatePath.toString().concat(matchID.toString()))!
		// Create the collection
		let collection <- ScoreNFT.createEmptyCollection()
		// Save & link
		self.account.save(<-collection, to: escrowCollectionStoragePath)
		self.account.link<&ScoreNFT.Collection>(escrowCollectionPrivatePath, target: escrowCollectionStoragePath)
		// Return Capability
		return self.account.getCapability<&ScoreNFT.Collection>(escrowCollectionPrivatePath)
	}

	/// Returns the PlayerOne Capability for a given match
	pub fun getPlayerOne(matchID: UInt64): @PlayerOneWrapper? {
		let playerOnePrivatePath = PrivatePath(identifier:self.MatchPrivatePath.toString().concat(matchID.toString()))!
		let playerOneCap = self.account.getCapability<&{PlayerOne}>(playerOnePrivatePath)
		if playerOneCap != nil {
			return <- create PlayerOneWrapper(playerOneCap)
		}
		return nil
	}

	/// Returns the PlayerTwo Capability for a given match
	pub fun getPlayerTwo(matchID: UInt64): @PlayerTwoWrapper? {
		let playerTwoPrivatePath = PrivatePath(identifier:self.MatchPrivatePath.toString().concat(matchID.toString()))!
		let playerTwoCap = self.account.getCapability<&{PlayerTwo}>(playerTwoPrivatePath)
		if playerTwoCap != nil {
			return <- create PlayerTwoWrapper(playerTwoCap)
		}
		return nil
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
		self.MatchStoragePath = /storage/Match
		self.MatchPrivatePath = /private/Match
		self.EscrowCollectionStoragePath = /storage/EscrowCollection
		self.EscrowCollectionPrivatePath = /private/EscrowCollection

		self.allowableMoves = ["rock", "paper", "scissors"]
		self.name = "RockPaperScissors"
		self.winLossRecords = {}
	}
}
 