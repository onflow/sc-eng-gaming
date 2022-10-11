import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Script to get matches IDs from a game admin
///
pub fun main(address: Address): [UInt64] {
    
    let account = getAccount(address)

    let gameAdminRef = account
        .getCapability(RockPaperScissorsGame.GameAdminPublicPath)
        .borrow<&{RockPaperScissorsGame.GameAdminPublic}>()
        ?? panic("Could not borrow capability from public collection at specified path")

    return gameAdminRef.getMatchesIDs()
}