import ScoreNFT from "./ScoreNFT.cdc"
import GamingMetadataViews from "./GamingMetadataViews.cdc"
import NonFungibleToken from "./utility/NonFungibleToken.cdc"

pub contract RockPaperScissorsGame {

	/// Simple enum to identify moves
	pub enum Moves: UInt8 {
		pub case rock
		pub case paper
		pub case scissors
	}

	pub struct WinLossRetriever {
		/// Retriever for winloss data to be added to deposited NFTs metadata retrievers
		pub fun retrieveWinLoss(id: UInt64): GamingMetadataViews.WinLoss? {
			return RockPaperScissorsGame.winLossRecords[id]
		}
	}

	/// Name of the game
	pub let name: String
	/// Field that stores win/loss records for every NFT that has played this game
	pub let winLossRecords: {UInt64: GamingMetadataViews.WinLoss}

	/// Set canonical paths for easy storage of resources in transactions
	pub let GameAdminStoragePath: StoragePath
	// for exposing capability for getting matches ids
	pub let GameAdminPublicPath: PublicPath
	pub let GamePlayerStoragePath: StoragePath
	pub let GamePlayerPublicPath: PublicPath
	/// Set base path as strings - will be concatenated with matchID they apply to
	pub let MatchStorageBasePathString: String
	pub let MatchPrivateBasePathString: String

	// Relevant events to watch
	pub event NewMatchCreated(game: String, matchID: UInt64)
	pub event PlayerSignedUpForMatch(game: String, matchID: UInt64, playerID: UInt64)
	pub event PlayerAddedToMatch(game: String, matchID: UInt64, playerID: UInt64)
	pub event PlayerNFTEscrowed(game: String, matchID: UInt64, matchNFTsEscrowed: Int)
	pub event MatchOver(game: String, matchID: UInt64, winningNFTID: UInt64?, returnedNFTIDs: [UInt64])

	/** --- Interfaces for each party --- */
	pub resource interface MatchAdminActions {
		pub let id: UInt64
		pub fun submitMoves(moves: {UInt64: Moves})
		pub fun returnPlayerNFTs(): [UInt64]
	}

	pub resource interface MatchPlayerActions {
		pub let id: UInt64
		pub fun escrowNFT(nft: @ScoreNFT.NFT, receiver: Capability<&{NonFungibleToken.Receiver}>)
		pub fun returnPlayerNFTs(): [UInt64]
	}

	/// Resource defining a Match as a single round of Rock Paper Scissors
	/// Logic for move hierarchy is contained in the struct above, Moves
	pub resource Match: MatchAdminActions, MatchPlayerActions {

		pub let id: UInt64
		
		// Match timeout parameters so NFTs aren't locked forever
		pub let createdTimestamp: UFix64
		pub let timeout: UFix64

		// Defines whether match is still in play or not
		pub var inPlay: Bool

		// ScoreNFT Capability to custody NFTs during gameplay
		pub let playerNFTs: @{UInt64: NonFungibleToken.NFT}
		// Keep Receiver Capabilities to easily return NFTs
		pub let nftReceivers: {UInt64: Capability<&{NonFungibleToken.Receiver}>}

		init(matchTimeout: UFix64) {
			self.id = self.uuid
			self.inPlay = true
			self.createdTimestamp = getCurrentBlock().timestamp
			self.timeout = matchTimeout
			self.playerNFTs <- {}
			self.nftReceivers = {}
		}

		// Dedicated escrow methods to track each player's NFTs & control access
		// I'm sure there's a better way to do this to avoid redundant code
		pub fun escrowNFT(nft: @ScoreNFT.NFT, receiver: Capability<&{NonFungibleToken.Receiver}>) {
			pre {
				self.playerNFTs.length < 2: "Both players have adready escrowed their NFTs"
				self.inPlay == true: "Match is over!"
			}

			// Make sure we're dealing with a ScoreNFT.NFT
			let token <- nft as! @ScoreNFT.NFT
			let nftID = token.id

			// If nft doesn't already have a winLossRetriever, add it
			token.addWinLossRetriever(gameName: RockPaperScissorsGame.name, retriever: RockPaperScissorsGame.WinLossRetriever())

			// Construct WinLoss Metadata if none exists
			if RockPaperScissorsGame.winLossRecords[nftID] == nil {
				RockPaperScissorsGame.winLossRecords[nftID] = GamingMetadataViews.WinLoss(
					game: RockPaperScissorsGame.name,
					nftID: nftID
				)
			}

			// Then store player's NFT & Receiver
			let oldNFT <- self.playerNFTs[nftID] <- token
			self.nftReceivers.insert(key: nftID, receiver)
			destroy oldNFT

			emit PlayerNFTEscrowed(game: RockPaperScissorsGame.name, matchID: self.id, matchNFTsEscrowed: self.playerNFTs.length)
		}

		// Can be called by any interface if there's a timeout or assets weren't returned
		// for some reason
		pub fun returnPlayerNFTs(): [UInt64] {
			pre {
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: "Cannot return NFTs while Match is still in play!"
			}

			let returnedNFTs: [UInt64] = []
			for id in self.nftReceivers.keys {
				let receiver = self.nftReceivers[id]!.borrow() ?? panic("Could not access player's receiver")
				let token <- self.playerNFTs.remove(key: id)!
				receiver.deposit(token: <-token)
				returnedNFTs.append(id)
				//if let receiver = self.nftReceivers[id]!.borrow() {
         		//	if let token <- self.playerNFTs.remove(key: id)  {
				//		receiver.deposit(token: <- token)
				//		returnedNFTs.append(id)
				//	}
				//}
			}
			return returnedNFTs
		}

		// Can only be called by the game admin to submit moves for both players
		pub fun submitMoves(moves: {UInt64: Moves}) {
			pre {
				self.playerNFTs.length == 2: "Both players must escrow NFTs before play begins!"
				self.inPlay == true: "Match is not in play any longer!"
			}

			// Get the ID of the winning NFT (nil implies a tie)
			let winningID: UInt64? = RockPaperScissorsGame.determineRockPaperScissorsWinner(moves: moves)
			// Then update the win loss records for the players' NFTs
			for nftID in self.playerNFTs.keys {
				RockPaperScissorsGame.updateWinLossRecord(
					id: nftID,
					winner: winningID
				)
			}
			// Finally, end match & return assets
			self.inPlay = false
			let returnedNFTIDs = self.returnPlayerNFTs()

			emit MatchOver(game: RockPaperScissorsGame.name, matchID: self.id, winningNFTID: winningID, returnedNFTIDs: returnedNFTIDs)
		}
		
		// Custom destroyer to prevent destroying escrowed NFTs
		destroy() {
			pre {
				self.playerNFTs.length == 0:
					"Cannot destroy while NFTs in escrow!"
				getCurrentBlock().timestamp >= self.createdTimestamp + self.timeout ||
				self.inPlay == false: 
					"Cannot destroy while Match is still in play!"
			}

			destroy self.playerNFTs
		}
	}

	/** --- Receivers for each party's capabilities --- */

	pub resource interface GameAdminPublic {
		pub fun getMatchesIDs(): [UInt64]
	}
	
	/// Resource to allow creation of matches & maintain Capabilities for each
	/// New matches can be created & are stored to the game contract's account to make
	/// escrow of assets as safe as possible
	pub resource GameAdmin: GameAdminPublic {

		pub let id: UInt64
		pub let matchAdminActionsCapabilities: {UInt64: Capability<&{MatchAdminActions}>}
		
		init() {
			self.id = self.uuid
			self.matchAdminActionsCapabilities = {}
		}
		
		pub fun createMatch(matchTimeout: UFix64): UInt64 {
			// Create the new match & preserve its ID
			let newMatch <- create Match(matchTimeout: matchTimeout)
			let newMatchID = newMatch.id
			
			let storageIdentifier = RockPaperScissorsGame.MatchStorageBasePathString.concat(newMatchID.toString())
			// Derive paths using matchID
			let matchStoragePath = StoragePath(identifier: storageIdentifier)!

			let privateIdentifier = RockPaperScissorsGame.MatchPrivateBasePathString.concat(newMatchID.toString())
			let matchPrivatePath = PrivatePath(identifier: privateIdentifier)!
			
			// Save the match to game contract account's storage
			RockPaperScissorsGame.account.save(<-newMatch, to: matchStoragePath)
			
			// Link each Capability to game contract account's private
			RockPaperScissorsGame.account.link<&{MatchAdminActions, MatchPlayerActions}>(matchPrivatePath, target: matchStoragePath)

			// Add the MatchAdminActions capability to GameAdmin's mappings under newMatchID
			self.matchAdminActionsCapabilities.insert(
				key: newMatchID,
				RockPaperScissorsGame.account.getCapability<&{MatchAdminActions}>(matchPrivatePath)!
			)

			emit NewMatchCreated(game: RockPaperScissorsGame.name, matchID: newMatchID)

			return newMatchID
		}

		pub fun addPlayerToMatch(matchID: UInt64, gamePlayerRef: &AnyResource{GamePlayerPublic}) {
			// Derive match's private path from matchID
			let matchPrivatePath = PrivatePath(identifier: RockPaperScissorsGame.MatchPrivateBasePathString.concat(matchID.toString()))!
			// Get the capability
			let matchPlayerActionsCap = RockPaperScissorsGame.account.getCapability<&{MatchPlayerActions}>(matchPrivatePath)
			assert(
				matchPlayerActionsCap != nil,
				message: "Not able to retrieve MatchPlayerActions Capability for given matchID"
			)
			// Add it to the player's matchPlayerCapabilities
			gamePlayerRef.addMatchPlayerActionsCapability(matchID: matchID, matchPlayerActionsCap)
		}
		
		/// Allows GameAdmin to delete capabilities from their mapping to free up space used by old matches
		pub fun deleteAdminActionsCapability(matchID: UInt64) {
			self.matchAdminActionsCapabilities.remove(key: matchID)
		}

		pub fun getMatchesIDs(): [UInt64] {
			return self.matchAdminActionsCapabilities.keys
		}
	}

	/// Public interface allowing others to add GamePlayer to matches. Of course, there is no obligation for
	/// matches to be played, but this makes it so that a GameAdmin or even other player could add the
	/// GamePlayer to a match
	pub resource interface GamePlayerPublic {
		pub let id: UInt64
		pub fun addMatchPlayerActionsCapability(matchID: UInt64, _ cap: Capability<&{MatchPlayerActions}>)
	}

	/// Resource that maintains all the player's MatchPlayerActions capabilities
	/// Players can add themselves to games or be added if they expose GamePlayerPublic capability
	pub resource GamePlayer: GamePlayerPublic {
		pub let id: UInt64
		pub let matchPlayerCapabilities: {UInt64: Capability<&{MatchPlayerActions}>}
		
		init() {
			self.id = self.uuid
			self.matchPlayerCapabilities = {}
		}
		
		/// Allows for GamePlayer to sign up for a match that already exists
		pub fun signUpForMatch(matchID: UInt64, _ cap: Capability<&{MatchPlayerActions}>) {
			// Derive path to capability
			let matchPrivatePath = PrivatePath(identifier: RockPaperScissorsGame.MatchPrivateBasePathString.concat(matchID.toString()))!
			// Get the Capability
			let matchPlayerActionsCap = RockPaperScissorsGame.account.getCapability<&{MatchPlayerActions}>(matchPrivatePath)
			// Ensure Capability is not nil
			assert(
				matchPlayerActionsCap != nil,
				message: "Not able to retrieve MatchPlayerActions Capability for given matchID"
			)
			// Add it to the mapping
			self.matchPlayerCapabilities.insert(key: matchID, matchPlayerActionsCap)

			emit PlayerSignedUpForMatch(game: RockPaperScissorsGame.name, matchID: matchID, playerID: self.id)
		}

		/// Allows others to add Capabilities to their mapping for ease of match setup
		pub fun addMatchPlayerActionsCapability(matchID: UInt64, _ cap: Capability<&{MatchPlayerActions}>) {
			pre {
				!self.matchPlayerCapabilities.containsKey(matchID): "Player already has capability for this Match!"
			}
			post {
				self.matchPlayerCapabilities.containsKey(matchID): "Capability for match has not been saved into player"
			}

			self.matchPlayerCapabilities.insert(key: matchID, cap)
			// Event that could be used to notify player they were added
			emit PlayerAddedToMatch(game: RockPaperScissorsGame.name, matchID: matchID, playerID: self.id)
		}

		// Allows GamePlayer to delete capabilities from their mapping to free up space used by old matches
		pub fun deletePlayerActionsCapability(matchID: UInt64) {
			self.matchPlayerCapabilities.remove(key: matchID)
		}
	}

	/** --- Contract helper functions --- */

	/// Return a GameAdmin resource
	pub fun createGameAdmin(): @GameAdmin {
		return <- create GameAdmin()
	}

	/// Return a GamePlayer resource
	pub fun createGamePlayer (): @GamePlayer {
		return <- create GamePlayer()
	}

	/// Method to determine outcome of a RockPaperScissors with given moves
	/// Exposing game logic allows for some degree of composability with other
	/// games and match types
	pub fun determineRockPaperScissorsWinner(moves: {UInt64: Moves}): UInt64? {
		pre {
			moves.length == 2: "RockPaperScissors requires two moves"
		}
		
		let player1 = moves.keys[0]
		let player2 = moves.keys[1]

		// Choose one move to compare against other
		switch moves[player1]! {
			case RockPaperScissorsGame.Moves.rock:
				if moves[player2] == RockPaperScissorsGame.Moves.paper {
					return player2
				} else if moves[player2] == RockPaperScissorsGame.Moves.scissors {
					return player1
				}
			case RockPaperScissorsGame.Moves.paper:
				if moves[player2] == RockPaperScissorsGame.Moves.rock {
					return player1
				} else if moves[player2] == RockPaperScissorsGame.Moves.scissors {
					return player2
				}
			case RockPaperScissorsGame.Moves.scissors:
				if moves[player2] == RockPaperScissorsGame.Moves.rock {
					return player2
				} else if moves[player2] == RockPaperScissorsGame.Moves.paper {
					return player1
				}
		}

		// If they played the same move, it's a tie -> return nil
		return nil
	}

	/// Method to update GamingMetadataViews.WinLoss for each NFT
	// why is winner an optional? it will explode comparing
	access(contract) fun updateWinLossRecord(id: UInt64, winner: UInt64?) {
		if id == winner {
			self.winLossRecords[id]!.addWin()
		} else if id != winner && winner != nil{
			self.winLossRecords[id]!.addLoss()
		} else {
			self.winLossRecords[id]!.addTie()
		}
	}

	init() {
		self.GameAdminStoragePath = /storage/RockPaperScissorsGameAdmin
		self.GameAdminPublicPath = /public/RockPaperScissorsGameAdmin
		self.GamePlayerStoragePath = /storage/RockPaperScissorsGamePlayer
		self.GamePlayerPublicPath = /public/RockPaperScissorsGamePlayer
		self.MatchStorageBasePathString = "Match"
		self.MatchPrivateBasePathString = "Match"

		self.name = "RockPaperScissors"
		self.winLossRecords = {}
	}
}
 