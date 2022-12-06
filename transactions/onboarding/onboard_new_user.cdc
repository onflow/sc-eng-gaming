import FungibleToken from "../../contracts/utility/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"
import ChildAccount from "../../contracts/ChildAccount.cdc"

/// This transaction sets a user's main account up with the following
///   - GamePieceNFT.Collection
///   - ChildAccount.ChildAccountManager with ChildAccountAdmin for new child account
///
/// Note: A "child account" is an account to which the signer's account's PublicKey is added,
/// at 1000.0 weight, giving them full signatory access to that account. This relationship
/// is represented on-chain via the ChildAccountManager.childAccounts mapping. Know that the
/// private key to this child account is generated outside of the context of this transaction and that
/// any assets in child accounts should be considered at risk if any party other than the signer has 
/// access to the given public key's paired private key. In the context of this repo, child accounts
/// are used by local game clients to facilitate a gameplay UX that does not require user transactions
/// at every step while still giving true ownership over game assets to the player. While this approach
/// does compromises on security, convenience is far improved. Given this security risk, only trusted game
/// clients should be used & users should consider moving very valuable assets to their parent account.
///
transaction(
        pubKey: String,
        fundingAmt: UFix64,
        childAccountName: String,
        childAccountDescription: String,
        clientIconURL: String,
        clientExternalURL: String
    ) {

    prepare(signer: AuthAccount) {
        
        /** --- Setup signer's GamePieceNFT.Collection --- */
        //
        // Set up GamePieceNFT.Collection if it doesn't exist
        if signer.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath) == nil {
            // Create a new empty collection
            let collection <- GamePieceNFT.createEmptyCollection()

            // save it to the account
            signer.save(<-collection, to: GamePieceNFT.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&{
                NonFungibleToken.Receiver,
                NonFungibleToken.CollectionPublic,
                GamePieceNFT.GamePieceNFTCollectionPublic,
                MetadataViews.ResolverCollection
            }>(
                GamePieceNFT.CollectionPublicPath,
                target: GamePieceNFT.CollectionStoragePath
            )

            // Link the Provider Capability in private storage
            signer.link<&{
                NonFungibleToken.Provider
            }>(
                GamePieceNFT.ProviderPrivatePath,
                target: GamePieceNFT.CollectionStoragePath
            )
        }

        /** --- Set user up with ChildAccountManager --- */
        // Check if ChildAccountManager already exists
        if signer.borrow<&ChildAccount.ChildAccountManager>(from: ChildAccount.ChildAccountManagerStoragePath) == nil {
            // Create and save the ChildAccountManager resource
            let manager <- ChildAccount.createChildAccountManager()
            signer.save(<-manager, to: ChildAccount.ChildAccountManagerStoragePath)
            signer.link<
                &{ChildAccount.ChildAccountManagerPublic}
            >(
                ChildAccount.ChildAccountManagerPublicPath,
                target: ChildAccount.ChildAccountManagerStoragePath
            )
            signer.link<
                &{ChildAccount.ChildAccountManagerViewer}
            >(
                ChildAccount.ChildAccountManagerPrivatePath,
                target: ChildAccount.ChildAccountManagerStoragePath
            )

            // Get reference to ChildAccoutManager & create child account
            let managerRef = signer
                .borrow<
                    &ChildAccount.ChildAccountManager
                >(
                    from: ChildAccount.ChildAccountManagerStoragePath
                )!

            // Construct ChildAccountInfo struct from given arguments
            let info = ChildAccount.ChildAccountInfo(
                name: childAccountName,
                description: childAccountDescription,
                clientIconURL: MetadataViews.HTTPFile(url: clientIconURL),
                clienExternalURL: MetadataViews.ExternalURL(clientExternalURL)
            )

            // Create the child account
            managerRef.createChildAccount(
                signer: signer,
                publicKey: pubKey,
                initialFundingAmount: fundingAmt,
                childAccountInfo: info
            )
        }    
    }
}
 