import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

/// Will deauthorize the specified account from any permissioned
/// Capabilities in the signing accounts ProxyManager resource
///
transaction(childAccount: Address) {
  
    let adminRef: &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}

    prepare(acct: AuthAccount) {  
        self.adminRef = acct.borrow<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                from: AccountProxies.ProxyManagerStoragePath
            ) ?? panic("cannot borrow admin interface")
        self.adminRef.deauthorizeChild(address: childAccount)
        
        log(
            "Child:"
            .concat(
                childAccount.toString()
            ).concat(" deauthorized on: ")
            .concat(acct.address.toString())
        )
    }

    post
    {
        // check stuff
    }
}
