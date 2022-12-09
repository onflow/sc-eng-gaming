import ChildAccount from "../../contracts/ChildAccount.cdc"

/// Adds the labeled child account as a Child Account in the parent accounts'
/// ChildAccountManager resource. The parent is given key access to the child
/// account
///
transaction(
    parent: Address,
    pubKey: String,
    childAccountName: String,
    childAccountDescription: String,
    clientIconURL: String,
    clientExternalURL: String
) {

    prepare(child: AuthAccount) {
        // Get a reference to the ChildAcccountManager resource
        if let managerRef = getAccount(parent)
            .getCapability<
                {&ChildAccount.ChildAccountManagerPublic}
            >(
                ChildAccount.ChildAccountManagerPublicPath
            ).borrow() {
            
            let info = ChildAccount.ChildAccountInfo(
                name: childAccountName,
                description: childAccountDescription,
                clientIconURL: MetadataViews.HTTPFile(url: clientIconURL),
                clienExternalURL: MetadataViews.ExternalURL(clientExternalURL),
                originatingPublicKey: pubKey
            )

            // Create the child account
            managerRef.addAsChildAccount(newAccount: child)
        }
    }
}
