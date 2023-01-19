// import ChildAccount from "../../contracts/ChildAccount.cdc"
import ChildAccount from "../../contracts/ChildAuthAccount.cdc"
import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// This transaction moves all GamePieceNFT.NFTs from the specified child account to
/// the signing parent account. Assuming the parent has already made the link between
/// the two accounts via its ChildAccountManager, accessing the child's stored AuthAccount
/// Capability allows the parent to transfer all NFTs from the child to the parent's
/// collection without requiring the child's authorization.
///
transaction(childAddress: Address) {

    let parentCollectionRef: &GamePieceNFT.Collection
    let childCollectionRef: &GamePieceNFT.Collection
    let managerRef: &ChildAccount.ChildAccountManager
    
    prepare(parent: AuthAccount) {
        pre {
            parent.borrow<&ChildAccount.ChildAccountManager>(from: ChildAccount.ChildAccountManagerStoragePath) != nil:
                "Signer does not have a ChildAccountManager configured!"
        }
        /* --- Configure GamePieceNFT.Collection if needed --- */
        //
        // Set up GamePieceNFT.Collection if it doesn't exist
        if parent.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath) == nil {
            // Create a new empty collection
            let collection <- GamePieceNFT.createEmptyCollection()
            // save it to the account
            parent.save(<-collection, to: GamePieceNFT.CollectionStoragePath)
        }
        // Check for public capabilities
        if !parent.getCapability<&{
                NonFungibleToken.Receiver,
                NonFungibleToken.CollectionPublic,
                GamePieceNFT.GamePieceNFTCollectionPublic,
                MetadataViews.ResolverCollection
            }>(
                GamePieceNFT.CollectionPublicPath
            ).check() {
            // create a public capability for the collection
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
        // Check for private capabilities
        if !parent.getCapability<&{NonFungibleToken.Provider}>(GamePieceNFT.ProviderPrivatePath).check() {
            // Link the Provider Capability in private storage
            parent.link<&{
                NonFungibleToken.Provider
            }>(
                GamePieceNFT.ProviderPrivatePath,
                target: GamePieceNFT.CollectionStoragePath
            )
        }
        // Assign a reference to Collection
        self.parentCollectionRef = parent.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath)!
        // Assign a reference to signer's ChildAccountmanager
        self.managerRef = parent.borrow<&ChildAccount.ChildAccountManager>(from: ChildAccount.ChildAccountManagerStoragePath)!
        
        /* --- Get child account's capabilities & references --- */
        //
        // Get reference to child account's AuthAccount
        let childAuthAccountRef: &AuthAccount = self.managerRef
            .getChildAuthAccountRef(
                address: childAddress
            ) ?? panic("Signer does not have a child account with address ".concat(childAddress.toString()))
        // Get a reference to the child account's Collection
        self.childCollectionRef = childAuthAccountRef.borrow<&
                GamePieceNFT.Collection
            >(
                from: GamePieceNFT.CollectionStoragePath
            ) ?? panic("Could not get reference to Collection at ".concat(childAddress.toString()))
    }

    execute {
        // Withdraw all NFTs from child's Collection into parent's Collection
        for id in self.childCollectionRef.getIDs() {
            self.parentCollectionRef.deposit(token: <-self.childCollectionRef.withdraw(withdrawID: id))
        }
        // Remove child account, revoking any granted Capabilities
        self.managerRef.removeChildAccount(withAddress: childAddress)
    }
}
