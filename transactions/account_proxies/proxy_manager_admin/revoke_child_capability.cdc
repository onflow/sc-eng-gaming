import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

/// Will revoke the given account's access to a Capability
///
transaction(childAccount:Address) {
    
    let adminCap: Capability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}>
    let adminCapRef: &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}

    prepare(acct: AuthAccount) {  
        self.adminCap = acct.getCapability<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                AccountProxies.ProxyManagerPrivatePath
            )
        self.adminCapRef = self.adminCap
            .borrow()
            ?? panic("cannot borrow admin interface")

        // TODO: Replace with GamePlayerProxy Cap
        let childPath = AccountProxies.ProxyManagerPrivatePath
        let childCap: Capability = self.adminCap   // for testing only

        self.adminCapRef
            .revokeChildCapability(
                address: childAccount,
                path: childPath,
                capability: childCap
            )
        
        log(
            "Capability: "
            .concat(
                childCap.getType().identifier
            ).concat(" deauthorized on: ")
            .concat(childAccount.toString())
        )
    }

    post {
        // check stuff
    }
}
 