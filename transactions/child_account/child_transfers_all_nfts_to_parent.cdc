import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"
// import ChildAccount from "../../contracts/ChildAccount.cdc"
import ChildAccount from "../../contracts/ChildAuthAccount.cdc"

/// This transaction moves all GamePieceNFT.NFTs from the child account to the 
/// parent account, assuming that the two accounts have been linked and the signing
/// child account has been assigned a parent account.
///
transaction {

    let sourceCollectionRef: &GamePieceNFT.Collection
    let receiverRef: &{NonFungibleToken.Receiver}
    
    prepare(child: AuthAccount) {
        pre {
            child.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath) != nil :
                "Signer does not have Collection at expected storage path!"
        }
        // Get a reference to the signing child account's ChildAccountTag to retrieve its parent account's address
        let tagRef = child.borrow<
                &ChildAccount.ChildAccountTag
            >(
                from: ChildAccount.ChildAccountTagStoragePath
            ) ?? panic("Could not borrow reference to ChildAccountTag from signer's account at expected path!")
        let parentAddress = tagRef.parentAddress ?? panic("Child account has not been assigned a parent account!")

        // Get a reference to signer's Provider
        self.sourceCollectionRef = child
            .borrow<
                &GamePieceNFT.Collection
            >(
                from: GamePieceNFT.CollectionStoragePath
            )!

        // Get a reference to the parent account's Receiver
        self.receiverRef = getAccount(parentAddress)
            .getCapability<&{NonFungibleToken.Receiver}>(
                GamePieceNFT.CollectionPublicPath
            ).borrow()
            ?? panic("Could not borrow reference to Receiver at ".concat(parentAddress.toString()))
    }

    execute {
        // Withdraw all NFTs from child's Collection into parent's Collection
        for id in self.sourceCollectionRef.getIDs() {
            self.receiverRef.deposit(token: <-self.sourceCollectionRef.withdraw(withdrawID: id))
        }
    }
}
