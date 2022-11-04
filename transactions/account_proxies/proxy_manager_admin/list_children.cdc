import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

/// Will list the proxy accounts authorized to receive Capabilities
/// from a ProxyManager
///
transaction() {
    
    let adminRef : &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}

    prepare(acct: AuthAccount) {
        // Get a reference to the ProxyManagerAdmin Capability
        self.adminRef = acct.borrow<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                from: AccountProxies.ProxyManagerStoragePath
            ) ?? panic("cannot borrow admin interface")
        // Get the child account mapping
        let childList = self.adminRef.getAuthorisedChildList()

        // Log the children accounts in the returned mapping
        log("Children: ".concat(childList.length.toString()))
        for child in childList.keys {
            log(
                child.toString()
                .concat(" - ")
                .concat(
                    childList[child]!
                )
            )
        }
    }

    post {
        // check stuff
    }
}
