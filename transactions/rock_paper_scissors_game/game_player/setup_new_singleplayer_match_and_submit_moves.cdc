import "NonFungibleToken"
import "GamePieceNFT"
import "RockPaperScissorsGame"

/// Transaction that creates a new Match in single player mode and escrows the specified NFT from the signing account's
/// Collection, also submitting the given move for the new match and calling for the automated player's move to be played.
///
transaction(submittingNFTID: UInt64, matchTimeLimitInMinutes: UInt, move: UInt8) {
    
    let gamePlayerRef: &RockPaperScissorsGame.GamePlayer
    let newMatchID: UInt64

    prepare(acct: AuthAccount) {
        // Get a reference to the GamePlayer resource in the signing account's storage
        self.gamePlayerRef = acct.borrow<&RockPaperScissorsGame.GamePlayer>(
                from: RockPaperScissorsGame.GamePlayerStoragePath
            ) ?? panic("Could not borrow GamePlayer reference!")
        
        let receiverCap = acct.getCapability<&{NonFungibleToken.Receiver}>(
                GamePieceNFT.CollectionPublicPath
            )
        
        // Get a reference to the account's Provider
        let providerRef = acct.borrow<&{NonFungibleToken.Provider}>(from: GamePieceNFT.CollectionStoragePath)
            ?? panic("Could not borrow reference to account's Provider")
        // Withdraw the desired NFT
        let submittingNFT <-providerRef.withdraw(withdrawID: submittingNFTID) as! @GamePieceNFT.NFT

        // Create a match with the given timeLimit in minutes
        self.newMatchID = self.gamePlayerRef.createMatch(
                multiPlayer: false,
                matchTimeLimit: UFix64(matchTimeLimitInMinutes) * UFix64(60000),
                nft: <-submittingNFT,
                receiverCap: receiverCap
            )
    }

    execute {
        // Construct a legible move from the raw input value
        let moveAsEnum = RockPaperScissorsGame.Moves(rawValue: move)
            ?? panic("Given move does not map to a legal RockPaperScissorsGame.Moves value!")
        // Submit moves for the game
        self.gamePlayerRef.submitMoveToMatch(matchID: self.newMatchID, move: moveAsEnum)
        RockPaperScissorsGame.submitAutomatedPlayerMove(matchID: self.newMatchID)
    }
}
 