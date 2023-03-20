import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// Returns true if LinkedAccounts.Handler at given Address has a RockPaperScissorsGame.DelegatedGamePlayer Capability
/// and false if it does not. If no HandlerPublic reference is available at the address, nil is returned
///
pub fun main(childAddress: Address): Bool? {

    // Get a ref to the parentAddress's LinkedAccounts.Handler if possible
    if let handlerRef = getAccount(childAddress).getCapability<
            &LinkedAccounts.Handler{LinkedAccounts.HandlerPublic}
        >(LinkedAccounts.HandlerPublicPath).borrow() {

        return handlerRef.getGrantedCapabilityTypes().contains(
                Type<Capability<&RockPaperScissorsGame.GamePlayer{RockPaperScissorsGame.DelegatedGamePlayer}>>()
            )
    }

    return nil
}
