import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import GamingMetadataViews from "../../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// This script returns the winLossRecords stored in RockPaperScissors contract
///
pub fun main(matchID: UInt64): {UInt64: RockPaperScissorsGame.SubmittedMove}? {
    return RockPaperScissorsGame.getMatchMoveHistory(id: matchID)
}