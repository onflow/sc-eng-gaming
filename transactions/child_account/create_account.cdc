import AccountCreator from "../../contracts/utility/AccountCreator.cdc"

/// This transaction creates an account from the given public key, using the AccountCreator.Creator and the signer as 
/// the account's payer, additionally funding the new account with the specified amount of Flow from the signer's 
/// account.
///
transaction(
        pubKey: String,
        fundingAmt: UFix64
    ) {

    prepare(signer: AuthAccount) {
        // Ensure resource is saved where expected
        if signer.type(at: AccountCreator.CreatorStoragePath) == nil {
            signer.save(
                <-AccountCreator.createNewCreator(),
                to: AccountCreator.CreatorStoragePath
            )
        }
        // Ensure public Capability is linked
        if !signer.getCapability<&AccountCreator.Creator{AccountCreator.CreatorPublic}>(
            AccountCreator.CreatorPublicPath).check() {
            // Link the public Capability
            signer.unlink(AccountCreator.CreatorPublicPath)
            signer.link<&AccountCreator.Creator{AccountCreator.CreatorPublic}>(
                AccountCreator.CreatorPublicPath,
                target: AccountCreator.CreatorStoragePath
            )
        }
        // Get a reference to the signer's Creator
        let creatorRef = signer.borrow<&AccountCreator.Creator>(
                from: AccountCreator.CreatorStoragePath
            ) ?? panic(
                "No AccountCreator in signer's account at "
                .concat(AccountCreator.CreatorStoragePath.toString())
            )
        // Create the account
        let newAccount = creatorRef.createNewAccount(
            signer: signer,
            initialFundingAmount: fundingAmt,
            originatingPublicKey: pubKey
        )
        // Now that account is created, we could proceed to configure the new account as desired
    }
}