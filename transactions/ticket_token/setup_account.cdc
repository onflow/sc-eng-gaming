import "FungibleToken"
import "TicketToken"
import "MetadataViews"

/// This transaction creates a TicketToken.Vault, saves it in signer's storage
/// and links public & private capabilities
///
transaction {

    prepare(signer: AuthAccount) {

        if signer.borrow<&TicketToken.Vault>(from: TicketToken.VaultStoragePath) == nil {
            // Create a new flowToken Vault and put it in storage
            signer.save(<-TicketToken.createEmptyVault(), to: TicketToken.VaultStoragePath)
        }

        if !signer.getCapability<&{FungibleToken.Receiver, FungibleToken.Balance, MetadataViews.Resolver}>(
            TicketToken.ReceiverPublicPath
        ).check() {
            // Unlink any capability that may exist there
            signer.unlink(TicketToken.ReceiverPublicPath)
            // Create a public capability to the Vault that only exposes the deposit function
            // & balance field through the Receiver & Balance interface
            signer.link<&{FungibleToken.Receiver, FungibleToken.Balance, MetadataViews.Resolver}>(
                TicketToken.ReceiverPublicPath,
                target: TicketToken.VaultStoragePath
            )
        }

        if !signer.getCapability<&{FungibleToken.Provider, FungibleToken.Receiver, FungibleToken.Balance}>(
            TicketToken.ProviderPrivatePath
        ).check() {
            // Unlink any capability that may exist there
            signer.unlink(TicketToken.ProviderPrivatePath)
            // Create a private capability to the Vault that only exposes the withdraw function
            // through the Provider interface
            signer.link<&{FungibleToken.Provider, FungibleToken.Receiver, FungibleToken.Balance}>(
                TicketToken.ProviderPrivatePath,
                target: TicketToken.VaultStoragePath
            )
        }
    }
}
 