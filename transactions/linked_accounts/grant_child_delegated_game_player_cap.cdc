import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// Gives a DelegatedGamePlayer capability to a child account via the signer's LinkedAccounts.Collection & the linked
/// account's LinkedAccounts.Handler. If a GamePlayer doesn't exist in the signer's account, one is created & linked.
///
transaction(childAddress: Address) {

    let collectionRef: &LinkedAccounts.Collection
    let gamePlayerCap: Capability<&RockPaperScissorsGame.GamePlayer{RockPaperScissorsGame.DelegatedGamePlayer}

    prepare(signer: AuthAccount) {

        /** --- Set user up with GamePlayer --- */
        //
        // Check if a GamePlayer already exists, pass this block if it does
        if signer.borrow<&{RockPaperScissorsGame.GamePlayerPublic}>(from: RockPaperScissorsGame.GamePlayerStoragePath) == nil {
            // Create & save GamePlayer resource
            signer.save(<-RockPaperScissorsGame.createGamePlayer(), to: RockPaperScissorsGame.GamePlayerStoragePath)
        }
        // Link GamePlayerPublic Capability so player can be added to Matches
        if !signer.getCapability<&{RockPaperScissorsGame.GamePlayerPublic}>(RockPaperScissorsGame.GamePlayerPublicPath).check() {
            signer.unlink(RockPaperScissorsGame.GamePlayerPublicPath)
            signer.link<&
                {RockPaperScissorsGame.GamePlayerPublic}
            >(
                RockPaperScissorsGame.GamePlayerPublicPath,
                target: RockPaperScissorsGame.GamePlayerStoragePath
            )
        }
        // Link GamePlayerID & DelegatedGamePlayer Capability
        if !signer.getCapability<&{RockPaperScissorsGame.GamePlayerID}>(RockPaperScissorsGame.GamePlayerPrivatePath).check() {
            signer.unlink(RockPaperScissorsGame.GamePlayerPrivatePath)
            signer.link<&{
                RockPaperScissorsGame.DelegatedGamePlayer,
                RockPaperScissorsGame.GamePlayerID
            }>(
                RockPaperScissorsGame.GamePlayerPrivatePath,
                target: RockPaperScissorsGame.GamePlayerStoragePath
            )
        }
        
        // Get the GamePlayer Capability
        self.gamePlayerCap = signer.getCapability<&RockPaperScissorsGame.GamePlayer{RockPaperScissorsGame.DelegatedGamePlayer}>(
                RockPaperScissorsGame.GamePlayerPrivatePath
            )

        /** --- Add the Capability to the linked account's Handler through the signer's Collection --- */
        //
        // Get a reference to the ChildAcccountManager resource
        self.collectionRef = signer.borrow<&LinkedAccounts.Collection>(
            from: LinkedAccounts.CollectionStoragePath
            )?? panic("Signer does not have a LinkedAccounts.Collection configured!")
    }
    execute {
        // Grant the GamePlayer Capability to the child account
        collectionRef.addCapability(to: childAddress, self.gamePlayerCap)
    }
}
 