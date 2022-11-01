import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction that sets up GamePlayer resource in signing account
/// and exposes GamePlayerPublic capability so matches can be added
/// for the player to participate in
transaction {

    prepare(acct: AuthAccount) {
        // Do nothing if the resource exists at the expected path
        if acct.borrow<&{RockPaperScissorsGame.GamePlayerPublic}>(from: RockPaperScissorsGame.GamePlayerStoragePath) != nil {
            return
        }
        // Create GamePlayer resource
        let gamePlayer <- RockPaperScissorsGame.createGamePlayer()
        // Save it
        acct.save(<-gamePlayer, to: RockPaperScissorsGame.GamePlayerStoragePath)
        // Link GamePlayerPublic Capability so player can be added to Matches
        acct.link<&{RockPaperScissorsGame.GamePlayerPublic}>(RockPaperScissorsGame.GamePlayerPublicPath, target: RockPaperScissorsGame.GamePlayerStoragePath)
    }

}
