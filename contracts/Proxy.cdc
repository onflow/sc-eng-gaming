pub contract ProxyAccounts {
    pub resource interface ProxyCapabilitiesReceiver {
        // Type.identifier :  Capability
        pub let receivedCapabilities: {String: Capability}
        pub resource grantProxyCapability(type: Type, cap: Capability): @{ProxyIdentifier}
    }

    pub resource interface ProxyCapabilitiesManager {
        
    }
    
    pub resource interface ProxyIdentifier {
        pub let gameName: String
        pub let gameContractAddress: Address
        pub let associatedNFTs: [Type]
    }

    pub resource RPSProxyIdentifer : ProxyIdentifier {
        pub let gameName: String
        pub let gameContractAddress: Address
        pub let associatedNFTs: Type
        init() {
            self.gameName = RockPaperScissorsGame.name
            self.gameContractAddress = RockPaperScissorsGame.account.address
            self.associatedNFTs = [GamePieceNFT.NFT.getType()]
        }
        pub fun equals(_ other: &AnyResource{ProxyIdentifier}): Bool {
            if let castedOther = other as? self.getType() {
                let partialEquals = (self.gameName == castedOther.gameName && self.gameContractAddress = castedOther.gameContractAddress)
                if partialEquals {
                    for i, nftType in self.associatedNFTs {
                        if !self.associatedNFTs.contains(castedOther.associatedNFTs[i]) ||
                            !castedOther.contains(nftType) {
                            return false
                        }
                    }
                    return true
                } else {
                    return false
                }
            }
            return false
        }
    }

    pub resource RPSProxyCapabilitiesReceiver : ProxyCapabilitiesReceiver {
        pub let receivedCapabilities: {String: Capability}
        pub resource grantProxyCapability(type: Type, cap: Capability): @{ProxyIdentifier} {
            
        }
    }
    
}