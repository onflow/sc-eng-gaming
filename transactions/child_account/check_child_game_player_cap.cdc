import ChildAccount from "../../contracts/ChildAccount.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// This transaction panics if any aspect of a GamePlayer Capability
/// is not configured at the signer's ChildAccountTag.grantedCapabilies
/// or if the signer does not have a ChildAccountTag
///
transaction {

    let tagRef: &ChildAccount.ChildAccountTag
    let childAddress: Address

    prepare(childAccount: AuthAccount) {
        self.childAddress = childAccount.address
        // Get a reference to the signer's ChildAccountTag resource
        self.tagRef = childAccount.borrow<&
                ChildAccount.ChildAccountTag
            >(
                from: ChildAccount.ChildAccountTagStoragePath
            ) ?? panic("ChildAccountTag not accessible at path ".concat(ChildAccount.ChildAccountTagStoragePath.toString()))
        log(self.tagRef.getType().identifier)
    }

    execute {
        // // Get the GamePlayer Capability from the child's granted capabilities or panic if not available
        // let gamePlayerCap = self.tagRef.getGrantedCapabilities()[
        //         Type<Capability<&RockPaperScissorsGame.GamePlayer>>()
        //     ] ?? panic("GamePlayer Capability has not been granted to child account ".concat(self.childAddress.toString()))
        // // Panic if the Capability is invalid
        // if gamePlayerCap.borrow<&RockPaperScissorsGame.GamePlayer>() == nil {
        //     panic("ChildAccountTag has invalid GamePlayerCapability")
        // }
        

        let capRef = self.tagRef
            .getGrantedCapabilityAsRef(
                Type<Capability<&RockPaperScissorsGame.GamePlayer>>()
            ) ?? panic("Child account does not have GamePlayer Capability in its ChildAccountTag!")
        let gamePlayerRef = capRef.borrow<&RockPaperScissorsGame.GamePlayer>()
        log(gamePlayerRef.getType().identifier)
        // let gamePlayerRef = capRef.borrow<&RockPaperScissorsGame.GamePlayer>()
        //     ?? panic("ChildAccountTag has invalid GamePlayerCapability")
    }
}
 