import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction to setup a rudimentary implementation of a
/// Capability-based account proxy (AKA puppet account)
///
transaction {

    prepare(playerAcct: AuthAccount, proxyAcct: AuthAccount) {
        // Return if a resource already exists in this account at the target path
        if proxyAcct.borrow<&RockPaperScissorsGame.GamePlayerProxyReceiver>(from: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath) != nil {
            return
        }
        // Get the GamePlayerProxy Capability from the playerAcct storage
        let gamePlayerProxyCap = playerAcct.getCapability<&{
            RockPaperScissorsGame.GamePlayerProxy
        }>(
            RockPaperScissorsGame.GamePlayerPrivatePath
        )
        // Create a new resource
        let proxyReceiver <- RockPaperScissorsGame.createProxyReceiver(gamePlayerProxyCap)
        // Save it
        proxyAcct.save(<-proxyReceiver, to: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath)
    }
}
 