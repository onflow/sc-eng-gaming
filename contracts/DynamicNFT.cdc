// import NonFungibleToken from "./utility/NonFungibleToken.cdc" 

pub contract DynamicNFT {

    /// An interface for a resource defining the Type that an attachment is
    /// designed to be attached to
    ///
    pub resource interface Attachment {
        pub let nftID: UInt64
        pub let attachmentFor: [Type]
    }

    pub resource interface Dynamic /*: NonFungibleToken.INFT*/ {

        access(contract) let attachments: @{Type: AnyResource{Attachment}}

        pub fun addAttachment(_ attachment: @AnyResource{Attachment}) {
            pre {
                !self.hasAttachmentType(attachment.getType()):
                    "NFT already contains attachment of this type!"
            }
        }

        /// Function revealing whether NFT has an attachment of the given Type
        ///
        /// @param type: The type in question
        ///
        /// @return true if NFT has given Type attached and false otherwise
        ///
        pub fun hasAttachmentType(_ type: Type): Bool {
            return self.attachments.containsKey(type)
        }

        /// Returns a reference to the attachment of the given Type
        ///
        /// @param type: Type of the desired attachment reference
        ///
        /// @return Generic auth reference ready for downcasting
        ///
        pub fun getAttachmentRef(_ type: Type): auth &AnyResource? {
            return &self.attachments[type] as auth &AnyResource?
        }

        /// Getter method for array of types attached to this NFT
        ///
        /// @return array of attached Types
        ///
        pub fun getAttachmentTypes(): [Type] {
            return self.attachments.keys
        }
    }
}