import FungibleToken from "../../contracts/utility/FungibleToken.cdc"
import ExampleToken from "../../contracts/utility/ExampleToken.cdc"

/// This transaction is a template for a transaction to allow 
/// anyone to add a Vault resource to their account so that 
/// they can use the exampleToken
///
transaction {

    prepare(acct: AuthAccount) {

        // Return early if the account already stores a ExampleToken Vault
        if acct.borrow<&ExampleToken.Vault>(from: ExampleToken.VaultStoragePath) != nil {
            return
        }

        // Create a new ExampleToken Vault and put it in storage
        acct.save(
            <-ExampleToken.createEmptyVault(),
            to: ExampleToken.VaultStoragePath
        )

        // Create a public capability to the Vault that only exposes
        // the deposit function through the Receiver interface
        acct.link<&ExampleToken.Vault{FungibleToken.Receiver}>(
            ExampleToken.ReceiverPublicPath,
            target: ExampleToken.VaultStoragePath
        )

        // Create a public capability to the Vault that only exposes
        // the balance field through the Balance interface
        acct.link<&ExampleToken.Vault{FungibleToken.Balance}>(
            ExampleToken.BalancePublicPath,
            target: ExampleToken.VaultStoragePath
        )
    }
}
