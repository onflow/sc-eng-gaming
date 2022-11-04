import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

transaction(proxyAddress: Address) {

    prepare(acct: AuthAccount) {
        let proxyAcct = getAccount(proxyAddress)
        // TODO - this will be replaced with AccountProxies.ProxyManagerPublicInterface.GetCapability(): &G
        //   when we settle the game contracts Capability interface & implement this cap-based proxy account model
        let gamePlayerReceiverCap = proxyAcct.getCapability<&{
                RockPaperScissorsGame.GamePlayerProxyReceiverPublic
            }>(
                /public/GamePlayerProxyReceiver
            )
        let gamePlayerReceiverRef = gamePlayerReceiverCap
            .borrow()
            ?? panic("Could not borrow GamePlayerProxyReceiver reference!")
        // Get a reference to GamePlayerProxy contained in the receiver
        let gamePlayerProxyCap = acct.getCapability<&{RockPaperScissorsGame.GamePlayerProxy}>(
                RockPaperScissorsGame.GamePlayerPrivatePath
            )
        // Add the capability to the proxy receiver
        gamePlayerReceiverRef.updateGamePlayerProxyCap(gamePlayerProxyCap)
    }
}
