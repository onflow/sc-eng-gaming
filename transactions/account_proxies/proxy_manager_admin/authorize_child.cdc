import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

transaction(childAccount: Address, childName: String) {
  
    let adminCap : &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}

    prepare(acct: AuthAccount)  {
        // Borrow a reference to the signing account's ProxyAdming resource
        self.adminCap = acct.borrow<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                from: AccountProxies.ProxyManagerStoragePath
            ) ?? panic("cannot borrow admin interface")
        
        // Authorize the specified child account, assigning it the given petname
        self.adminCap.authorizeChild(address: childAccount, name: childName)
        
        log(
            "Child:"
            .concat(
                childAccount.toString()
            ).concat(" authorized on: ")
            .concat(acct.address.toString())
        )
    }

    post {
        // check stuff
    }
}
