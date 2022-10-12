import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Transaction that sets up GameAdmin resource in signing account
transaction {

    prepare(acct: AuthAccount) {
        // Do nothing if the resource exists at the expected path
        if acct.borrow<&RockPaperScissorsGame.GameAdmin>(from: RockPaperScissorsGame.GameAdminStoragePath) != nil {
            return
        }
        // Create GamePlayer resource
        let gameAdmin: @RockPaperScissorsGame.GameAdmin <- RockPaperScissorsGame.createGameAdmin()
        // Save it
        acct.save(<-gameAdmin, to: RockPaperScissorsGame.GameAdminStoragePath)
        acct.link<&{RockPaperScissorsGame.GameAdminPublic}>(
            RockPaperScissorsGame.GameAdminPublicPath,
            target: RockPaperScissorsGame.GameAdminStoragePath
        )
    }

}
