/// This contract is an initial implementation of a Capability-based 
/// puppet account model. The idea is that an account maintains a
/// ProxyManager resource through which it can define certain
/// Capabilities that other accounts can access. The "child" account,
/// so to speak, should be considered user's account, but might be
/// an account that another entity maintains key access to.
///
access(all) contract AccountProxies {

    pub let ProxyManagerStoragePath: StoragePath
    pub let ProxyManagerPrivatePath: PrivatePath
    pub let ProxyManagerPublicPath: PublicPath

    pub struct StoredCapability {
        pub let path:Path
        pub let type:String
        pub let capability:Capability

        init(path:Path, type:String, capability:Capability) {
            self.path = path
            self.type = type
            self.capability = capability
        }

        pub fun equals(_ other:StoredCapability) : Bool {
            return (self.path.toString() == other.path.toString() && self.type == other.type)
        }
    }

    pub resource interface ProxyManagerPublic {
        pub fun getProxyCapability(type: Type, path:Path, acct:AuthAccount) : Capability?
    }

    pub resource interface ProxyManagerAdmin {
        pub fun authorizeChild(address:Address, name:String)
        pub fun deauthorizeChild(address:Address)
        pub fun grantChildCapability(address:Address, path:Path, capability:Capability)
        pub fun revokeChildCapability(address:Address, path:Path, capability:Capability)
        pub fun getAuthorisedChildList() : {Address:String}
        pub fun getChildCapabilityList(address: Address) : [String]
    }

    pub resource ProxyManager : ProxyManagerAdmin, ProxyManagerPublic {
        priv let children : {Address:[StoredCapability]}
        priv let accountNames : {Address:String}

        init() {
            self.children = {}
            self.accountNames = {}
        }

        priv fun findCapability(address:Address, storedCap:StoredCapability) : Int? {
            if self.children.containsKey(address) {
                var currentIndex = 0
                while currentIndex < self.children[address]!.length {
                    // find capability
                    if self.children[address]![currentIndex]!.equals(storedCap) {
                        return currentIndex
                    }

                    currentIndex = currentIndex + 1
                }
            }
            return nil
        }

        pub fun authorizeChild(address:Address, name:String) {
            if !self.children.containsKey(address) {
                self.children[address] = []
                self.accountNames[address] = name
                log(
                    "Authorized child: "
                    .concat(name)
                    .concat(" Address: ")
                    .concat(address.toString())
                )
            } else {
                log(
                    "Child already authorized: "
                    .concat(
                        self.accountNames[address]!
                    ).concat(" for Address: ")
                    .concat(address.toString())
                )
            }
        }

        pub fun deauthorizeChild(address:Address) {
            if self.children.containsKey(address) {
                let name = self.accountNames[address]!
                // remove account listing
                self.children.remove(key: address)
                self.accountNames.remove(key: address)
                log("Deauthorized child: ".concat(name).concat(" Address: ").concat(address.toString()))
            } else {
                log("Child not found: ".concat(address.toString()))        
            }
        }

        pub fun grantChildCapability(address:Address, path:Path, capability:Capability) {
            if self.children.containsKey(address) {
                let newCap = StoredCapability(
                    path: path,
                    type: capability.getType().identifier,
                    capability: capability
                )
                let capIndex = self.findCapability(address:address, storedCap: newCap)
                if capIndex == nil {
                    self.children[address]!.append(newCap)
                    log(
                        "Granted capability: "
                        .concat(
                            capability.getType().identifier
                        ).concat(" to child: ")
                        .concat(address.toString())
                    )
                } else {
                    log("Capability already granted")
                }
            } else {
                log("Child not authorized: ".concat(address.toString()))        
            }
        }

        pub fun revokeChildCapability(address:Address, path:Path, capability:Capability) {
            
            if self.children.containsKey(address) {
                // revoke capability
                let newCap = StoredCapability(
                    path: path,
                    type: capability.getType().identifier,
                    capability: capability
                )
                let capIndex = self.findCapability(address:address, storedCap: newCap)
                if capIndex != nil {
                    self.children[address]!.remove(at: capIndex!)
                    log(
                        "Revoked capability: "
                        .concat(
                            capability.getType().identifier
                        ).concat(" from child: ")
                        .concat(address.toString())
                    )
                }
                else {
                    log("Capability not found on child: ".concat(address.toString()))
                }
            } else {
                log("Child not authorized: ".concat(address.toString()))    
            }
        }

        pub fun getProxyCapability(type: Type, path:Path, acct:AuthAccount) : Capability? {
            let address = acct.address
            if self.children.containsKey(address) {
                var currentIndex = 0
                while currentIndex < self.children[address]!.length {                   
                    if self.children[address]![currentIndex]!.type == type.identifier {
                        return self.children[address]![currentIndex]!.capability
                    }

                    currentIndex = currentIndex + 1
                }
            }
            log("Child not authorized: ".concat(address.toString()))

            return nil
        }

        pub fun getAuthorisedChildList() : {Address:String} {
            // return a copy for security
            let output : {Address: String} = {}

            for address in self.accountNames.keys {
                output[address] = self.accountNames[address]
            }

            return output
        }

        pub fun getChildCapabilityList(address: Address) : [String] {
            let output : [String] = []

            if self.children[address] != nil {
                for childCapability in self.children[address]! {
                    let entry = childCapability.type
                        .concat("(from: ")
                        .concat(
                            childCapability.path.toString()
                        ).concat(")")
                    output.append(entry)
                }
            } else {
                log("Child not authorized: ".concat(address.toString()))
            }

            return output
        }

    }

    pub fun createProxyManager() : @ProxyManager {
        return <- create ProxyManager()
    }

    init() {
        self.ProxyManagerStoragePath = /storage/ProxyManager
        self.ProxyManagerPrivatePath = /private/ProxyManager
        self.ProxyManagerPublicPath = /public/ProxyManager
    }
}
 