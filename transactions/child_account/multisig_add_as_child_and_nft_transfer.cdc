import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
// import ChildAccount from "../../contracts/ChildAccount.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import ChildAccount from "../../contracts/ChildAuthAccount.cdc"

/// Adds the labeled child account as a Child Account in the parent accounts'
/// ChildAccountManager resource. The parent maintains an AuthAccount Capability
/// on the child's account. Requires transaction be signed by both parties so that
/// the child account can link its AuthAccount Capability and withdraw the desired
/// NFT from its Collection for transfer to its parent account.
///
/// NOTE: Assumes that the child account has a GamePieceNFT.Collection & 
/// ChildAccount.ChildAccountTag configured
///
transaction(nftID: UInt64) {

    let authAccountCap: Capability<&AuthAccount>
    let managerRef: &ChildAccount.ChildAccountManager
    let info: ChildAccount.ChildAccountInfo
    let providerRef: &{NonFungibleToken.Provider}
    let receiverRef: &{NonFungibleToken.Receiver}

    prepare(parent: AuthAccount, child: AuthAccount) {
        
        /* --- Configure parent's ChildAccountManager --- */
        //
        // Get ChildAccountManager Capability, linking if necessary
        if parent.borrow<&ChildAccount.ChildAccountManager>(from: ChildAccount.ChildAccountManagerStoragePath) == nil {
            // Save
            parent.save(<-ChildAccount.createChildAccountManager(), to: ChildAccount.ChildAccountManagerStoragePath)
        }
        // Ensure ChildAccountManagerViewer is linked properly
        if !parent.getCapability<&{ChildAccount.ChildAccountManagerViewer}>(ChildAccount.ChildAccountManagerPublicPath).check() {
            // Link
            parent.link<
                &{ChildAccount.ChildAccountManagerViewer}
            >(
                ChildAccount.ChildAccountManagerPublicPath,
                target: ChildAccount.ChildAccountManagerStoragePath
            )
        }
        // Get a reference to the ChildAcccountManager resource
        self.managerRef = parent
            .borrow<
                &ChildAccount.ChildAccountManager
            >(
                from: ChildAccount.ChildAccountManagerStoragePath
            )!

        /* --- Link the child account's AuthAccount Capability & assign --- */
        //
        // Get the AuthAccount Capability, linking if necessary
        if !child.getCapability<&AuthAccount>(ChildAccount.AuthAccountCapabilityPath).check() {
            // Unlink any Capability that may be there
            child.unlink(ChildAccount.AuthAccountCapabilityPath)
            // Link & assign the AuthAccount Capability
            self.authAccountCap = child.linkAccount(ChildAccount.AuthAccountCapabilityPath)!
        } else {
            // Assign the AuthAccount Capability
            self.authAccountCap = child.getCapability<&AuthAccount>(ChildAccount.AuthAccountCapabilityPath)
        }

        // Get the child account's Metadata which should have been configured on creation in context of this dapp
        let childTagRef = child.borrow<
                &ChildAccount.ChildAccountTag
            >(
                from: ChildAccount.ChildAccountTagStoragePath
            ) ?? panic("Could not borrow reference to ChildAccountTag in account ".concat(child.address.toString()))
        self.info = childTagRef.info
        
        /* --- Configure parent's GamePieceNFT.Collection --- */
        //
        // Check for Collection in parent's account
        if parent.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath) == nil {
            // Create a new empty collection & save it to parent account
            parent.save(<-GamePieceNFT.createEmptyCollection(), to: GamePieceNFT.CollectionStoragePath)
        }
        // Check public capabilities on the parent's collection
        if !parent.getCapability<&{
                NonFungibleToken.Receiver,
                NonFungibleToken.CollectionPublic,
                GamePieceNFT.GamePieceNFTCollectionPublic,
                MetadataViews.ResolverCollection
            }>(
                GamePieceNFT.CollectionPublicPath
            ).check() {
            // create a public capability for the collection
            parent.unlink(GamePieceNFT.CollectionPublicPath)
            parent.link<&{
                NonFungibleToken.Receiver,
                NonFungibleToken.CollectionPublic,
                GamePieceNFT.GamePieceNFTCollectionPublic,
                MetadataViews.ResolverCollection
            }>(
                GamePieceNFT.CollectionPublicPath,
                target: GamePieceNFT.CollectionStoragePath
            )
        }
        // Check public capabilities on the parent's collection
        if !parent.getCapability<&{NonFungibleToken.Provider}>(GamePieceNFT.ProviderPrivatePath).check() {
            // Link the Provider Capability in private storage
            parent.unlink(GamePieceNFT.ProviderPrivatePath)
            parent.link<&{
                NonFungibleToken.Provider
            }>(
                GamePieceNFT.ProviderPrivatePath,
                target: GamePieceNFT.CollectionStoragePath
            )
        }

        /* --- Assign Capabilities for NFT transfer --- */
        //
        // Get provider from child account
        self.providerRef = child.getCapability<
                &{NonFungibleToken.Provider}
            >(
                GamePieceNFT.ProviderPrivatePath
            ).borrow()
            ?? panic("Could not borrow reference to child account's Receiver")
        // Get receiver from parent account
        self.receiverRef = parent.getCapability<
                &{NonFungibleToken.Receiver}
            >(
                GamePieceNFT.CollectionPublicPath
            ).borrow()
            ?? panic("Could not borrow reference to parent account's Provider")
    }

    execute {
        // Add child account if it's parent-child accounts aren't already linked
        let childAddress = self.authAccountCap.borrow()!.address
        if !self.managerRef.getChildAccountAddresses().contains(childAddress) {
            // Add the child account
            self.managerRef.addAsChildAccount(childAccountCap: self.authAccountCap, childAccountInfo: self.info)
        }
        // Withdraw NFT from child account's Collection
        let nft <-self.providerRef.withdraw(withdrawID: nftID)
        // Deposit to parent account's Collection
        self.receiverRef.deposit(token: <-nft)
    }
}
