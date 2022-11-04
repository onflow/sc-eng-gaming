import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

transaction(childAddress : Address) {
    
    let adminCap: &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}

    prepare(acct: AuthAccount) {
        // Get a reference to the ProxyManagerAdmin Capability
        self.adminCap = acct.borrow<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                from: AccountProxies.ProxyManagerStoragePath
            ) ?? panic("cannot borrow admin interface")
        // Get the list of Capabilities the specified child address is granted
        let capList = self.adminCap.getChildCapabilityList(address: childAddress)

        // Log the listed capabilities
        log(
            childAddress.toString()
            .concat(" Capabilities: ")
            .concat(
                capList.length.toString()
            )
        )
        for cap in capList {
            log(cap)
        }
    }

    post {
        // check stuff
    }
}

