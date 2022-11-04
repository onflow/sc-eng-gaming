import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction to setup a rudimentary implementation of a
/// Capability-based account proxy (AKA puppet account)
///
transaction {

    prepare(proxyAcct: AuthAccount) {
        // Return if a resource already exists in this account at the target path
        if proxyAcct.borrow<&RockPaperScissorsGame.GamePlayerProxyReceiver>(from: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath) != nil {
            return
        }
        // Create a new resource
        let proxyReceiver <- RockPaperScissorsGame.createProxyReceiver()
        // Save it
        proxyAcct.save(<-proxyReceiver, to: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath)
        proxyAcct.link<&{RockPaperScissorsGame.GamePlayerProxyReceiverPublic}>(/public/GamePlayerProxyReceiver, target: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath)
    }
}
 