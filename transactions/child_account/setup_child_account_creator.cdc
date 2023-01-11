// import ChildAccount from "../../contracts/ChildAccount.cdc"
import ChildAccount from "../../contracts/ChildAuthAccount.cdc"

/// Sets up a ChildAccountCreator in signer's account to enable creation of
/// accounts & querying created addresses from the originating public key
///
transaction {
    prepare(signer: AuthAccount) {
        signer.save(
            <-ChildAccount.createChildAccountCreator(),
            to: ChildAccount.ChildAccountCreatorStoragePath
        )
    }
}