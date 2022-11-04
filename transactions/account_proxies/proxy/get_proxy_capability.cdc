import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

/// Allows an authorised account access to a Capability
/// to which it has already been granted by the ProxyManagerAdmin
///
transaction(parentAccount: Address) {

    let adminCap: Capability

    prepare(acct: AuthAccount) {  
        // get proxymananger from parent
        let parentCap = getAccount(parentAccount)
            .getCapability<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublic}
            >(
                AccountProxies.ProxyManagerPublicPath
            )
        let parentCapRef = parentCap
            .borrow()
            ?? panic("cant get parent public cap")

        // ask parent for capability
        let capType = Type<Capability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}>>() // fully qualified capability type - not AnyResource, unless that was what was granted.
        self.adminCap = parentCapRef
            .getProxyCapability(
                type: capType,
                path: AccountProxies.ProxyManagerPrivatePath,
                acct: acct
            ) ?? panic("Cant get capability from parent")
        
        // borrow and use capability
        self.adminCap
            .borrow<&{AccountProxies.ProxyManagerAdmin}>()
            ?? panic("cannot borrow admin interface")
        
        log(
            "Child:"
            .concat(
                acct.address.toString()
            ).concat(" borrowed admin cap from: ")
            .concat(parentAccount.toString()))
    }

    post {
        // check stuff
    }
}
