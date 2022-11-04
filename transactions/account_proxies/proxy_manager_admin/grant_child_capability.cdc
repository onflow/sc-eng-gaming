import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

/// Grants the specified address access to a Capability
///
transaction(childAccount:Address) {
    
    let adminCap : Capability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}>
    let adminCapRef : &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}

    prepare(acct: AuthAccount)  {
        // Get a reference to the ProxyManagerAdmin
        self.adminCap = acct.getCapability<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                AccountProxies.ProxyManagerPrivatePath
            )
        self.adminCapRef = self.adminCap.borrow() ?? panic("cannot borrow admin interface")

        // TODO: Replace with GamePlayerProxy Cap
        let childPath = AccountProxies.ProxyManagerPrivatePath
        let childCap : Capability = self.adminCap   // for testing only

        // Grant the account the access Capability
        self.adminCapRef.grantChildCapability(
                address: childAccount,
                path: childPath,
                capability: childCap
            )
        
        log(
            "Capability: "
            .concat(
                childCap.getType().identifier
            ).concat(" authorized on: ")
            .concat(childAccount.toString())
        )
    }

    post {
        // check stuff
    }
    }
