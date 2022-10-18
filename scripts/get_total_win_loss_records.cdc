import GamePieceNFT from "../contracts/GamePieceNFT.cdc"
import GamingMetadataViews from "../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// This script returns the winLossRecords stored in RockPaperScissors.WinLossRecordKeeper
pub fun main(): {UInt64: GamingMetadataViews.BasicWinLoss} {
    return RockPaperScissorsGame.getTotalWinLossRecords()
}