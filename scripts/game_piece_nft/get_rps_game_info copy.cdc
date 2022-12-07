import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"
import GamingMetadataViews from "../../contracts/GamingMetadataViews.cdc"

/// Returns RockPaperScissorsGame metadata stored as GamingMetadataViews.GameContractMetadata
///
pub fun main(matchID: UInt64): {UInt64: RockPaperScissorsGame.SubmittedMove}? {
    return RockPaperScissorsGame.getMatchMoveHistory(id: matchID)
}