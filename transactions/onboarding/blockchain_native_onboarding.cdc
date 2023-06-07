#allowAccountLinking

import FungibleToken from "../../contracts/utility/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"
import AccountCreator from "../../contracts/utility/AccountCreator.cdc"
import LinkedAccountMetadataViews from "../../contracts/LinkedAccountMetadataViews.cdc"
import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"
import TicketToken from "../../contracts/TicketToken.cdc"

/// This transaction creates a new account, funding creation with the signed client account and configuring it with a
/// GamePieceNFT Collection & NFT, RockPaperScissorsGame GamePlayer, and TicketToken Vault. The parent account is
/// configured with a GamePieceNFT Collection, TicketToken Vault, and LinkedAccounts.Collection. Lastly, the new 
/// account is then linked to the signing parent account, establishing it as a linked account of the parent account.
///
transaction(
        pubKey: String,
        fundingAmt: UFix64,
        linkedAccountName: String,
        linkedAccountDescription: String,
        clientThumbnailURL: String,
        clientExternalURL: String,
        monsterBackground: Int,
        monsterHead: Int,
        monsterTorso: Int,
        monsterLeg: Int
    ) {

    let minterRef: &GamePieceNFT.Minter
    let gamePieceCollectionRef: &GamePieceNFT.Collection{NonFungibleToken.CollectionPublic}
    let linkedAccountsCollectionRef: &LinkedAccounts.Collection
    let linkedAccountCap: Capability<&AuthAccount>

    prepare(parent: AuthAccount, client: AuthAccount) {
        /* --- Create a new account --- */
        //
        // Ensure resource is saved where expected
        if client.type(at: AccountCreator.CreatorStoragePath) == nil {
            client.save(
                <-AccountCreator.createNewCreator(),
                to: AccountCreator.CreatorStoragePath
            )
        }
        // Ensure public Capability is linked
        if !client.getCapability<&AccountCreator.Creator{AccountCreator.CreatorPublic}>(
            AccountCreator.CreatorPublicPath).check() {
            // Link the public Capability
            client.unlink(AccountCreator.CreatorPublicPath)
            client.link<&AccountCreator.Creator{AccountCreator.CreatorPublic}>(
                AccountCreator.CreatorPublicPath,
                target: AccountCreator.CreatorStoragePath
            )
        }
        // Get a reference to the client's AccountCreator.Creator
        let creatorRef = client.borrow<&AccountCreator.Creator>(
                from: AccountCreator.CreatorStoragePath
            ) ?? panic("No AccountCreator in client's account!")
        // Create the account
        let child = creatorRef.createNewAccount(
            signer: client,
            initialFundingAmount: fundingAmt,
            originatingPublicKey: pubKey
        )
        // Link AuthAccountCapability & assign
        // **NOTE:** You'll want to consider adding the AuthAccount Capability path suffix as a transaction arg
        let authAccountCapPrivatePath: PrivatePath = PrivatePath(identifier: "RPSAuthAccountCapability")
            ?? panic("Couldn't create Private Path from identifier: RPSAuthAccountCapability")
        self.linkedAccountCap = child.linkAccount(authAccountCapPrivatePath)
            ?? panic("Problem linking AuthAccount Capability for ".concat(child.address.toString()))

        /* --- Set up GamePieceNFT.Collection --- */
        //
        // Create a new empty collection & save it to the child account
        child.save(<-GamePieceNFT.createEmptyCollection(), to: GamePieceNFT.CollectionStoragePath)
        // create a public capability for the collection
        child.link<
            &GamePieceNFT.Collection{NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, GamePieceNFT.GamePieceNFTCollectionPublic, MetadataViews.ResolverCollection}
        >(
            GamePieceNFT.CollectionPublicPath,
            target: GamePieceNFT.CollectionStoragePath
        )
        // Link the Provider Capability in private storage
        child.link<
            &GamePieceNFT.Collection{NonFungibleToken.Provider}
        >(
            GamePieceNFT.ProviderPrivatePath,
            target: GamePieceNFT.CollectionStoragePath
        )
        // Grab Collection related references & Capabilities
        self.gamePieceCollectionRef = child.borrow<
                &GamePieceNFT.Collection{NonFungibleToken.CollectionPublic}
            >(
                from: GamePieceNFT.CollectionStoragePath
            )!
        
        /* --- Make sure child account has a GamePieceNFT.NFT to play with --- */
        //
        // Borrow a reference to the Minter Capability in minter account's storage
        self.minterRef = client.borrow<&GamePieceNFT.Minter>(from: GamePieceNFT.MinterStoragePath)
            ?? panic("Couldn't borrow reference to Minter Capability in storage at ".concat(GamePieceNFT.MinterStoragePath.toString()))

        /* --- Set user up with GamePlayer in child account --- */
        //
        // Create GamePlayer resource
        let gamePlayer <- RockPaperScissorsGame.createGamePlayer()
        // Save it
        child.save(<-gamePlayer, to: RockPaperScissorsGame.GamePlayerStoragePath)
        // Link GamePlayerPublic Capability so player can be added to Matches
        child.link<&RockPaperScissorsGame.GamePlayer{RockPaperScissorsGame.GamePlayerPublic}>(
            RockPaperScissorsGame.GamePlayerPublicPath,
            target: RockPaperScissorsGame.GamePlayerStoragePath
        )
        // Link GamePlayerID & DelegatedGamePlayer Capability
        child.link<
            &RockPaperScissorsGame.GamePlayer{RockPaperScissorsGame.DelegatedGamePlayer,RockPaperScissorsGame.GamePlayerID}
        >(
            RockPaperScissorsGame.GamePlayerPrivatePath,
            target: RockPaperScissorsGame.GamePlayerStoragePath
        )

        /* --- Set child account up with TicketToken.Vault --- */
        //
        // Create & save a Vault
        child.save(<-TicketToken.createEmptyVault(), to: TicketToken.VaultStoragePath)
        // Create a public capability to the Vault that only exposes the deposit function
        // & balance field through the Receiver & Balance interface
        child.link<&TicketToken.Vault{FungibleToken.Receiver, FungibleToken.Balance, MetadataViews.Resolver}>(
            TicketToken.ReceiverPublicPath,
            target: TicketToken.VaultStoragePath
        )
        // Create a private capability to the Vault that only exposes the withdraw function
        // through the Provider interface
        child.link<&TicketToken.Vault{FungibleToken.Provider}>(
            TicketToken.ProviderPrivatePath,
            target: TicketToken.VaultStoragePath
        )

        /** --- Setup parent's GamePieceNFT.Collection --- */
        //
        // Set up GamePieceNFT.Collection if it doesn't exist
        if parent.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath) == nil {
            // Create a new empty collection
            let collection <- GamePieceNFT.createEmptyCollection()
            // save it to the account
            parent.save(<-collection, to: GamePieceNFT.CollectionStoragePath)
        }
        // Check for public capabilities
        if !parent.getCapability<
                &GamePieceNFT.Collection{NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, GamePieceNFT.GamePieceNFTCollectionPublic, MetadataViews.ResolverCollection}
            >(
                GamePieceNFT.CollectionPublicPath
            ).check() {
            // create a public capability for the collection
            parent.unlink(GamePieceNFT.CollectionPublicPath)
            parent.link<
                &GamePieceNFT.Collection{NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, GamePieceNFT.GamePieceNFTCollectionPublic, MetadataViews.ResolverCollection}
            >(
                GamePieceNFT.CollectionPublicPath,
                target: GamePieceNFT.CollectionStoragePath
            )
        }
        // Check for private capabilities
        if !parent.getCapability<&GamePieceNFT.Collection{NonFungibleToken.Provider}>(GamePieceNFT.ProviderPrivatePath).check() {
            // Link the Provider Capability in private storage
            parent.unlink(GamePieceNFT.ProviderPrivatePath)
            parent.link<
                &GamePieceNFT.Collection{NonFungibleToken.Provider}
            >(
                GamePieceNFT.ProviderPrivatePath,
                target: GamePieceNFT.CollectionStoragePath
            )
        }

        /* --- Set parent account up with TicketToken.Vault --- */
        //
        // Create & save a Vault
        if parent.borrow<&TicketToken.Vault>(from: TicketToken.VaultStoragePath) == nil {
            // Create a new flowToken Vault and put it in storage
            parent.save(<-TicketToken.createEmptyVault(), to: TicketToken.VaultStoragePath)
        }

        if !parent.getCapability<&TicketToken.Vault{FungibleToken.Receiver, FungibleToken.Balance, MetadataViews.Resolver}>(
            TicketToken.ReceiverPublicPath
        ).check() {
            // Unlink any capability that may exist there
            parent.unlink(TicketToken.ReceiverPublicPath)
            // Create a public capability to the Vault that only exposes the deposit function
            // & balance field through the Receiver & Balance interface
            parent.link<&TicketToken.Vault{FungibleToken.Receiver, FungibleToken.Balance, MetadataViews.Resolver}>(
                TicketToken.ReceiverPublicPath,
                target: TicketToken.VaultStoragePath
            )
        }

        if !parent.getCapability<&TicketToken.Vault{FungibleToken.Provider}>(
            TicketToken.ProviderPrivatePath
        ).check() {
            // Unlink any capability that may exist there
            parent.unlink(TicketToken.ProviderPrivatePath)
            // Create a private capability to the Vault that only exposes the withdraw function
            // through the Provider interface
            parent.link<&TicketToken.Vault{FungibleToken.Provider}>(
                TicketToken.ProviderPrivatePath, 
                target: TicketToken.VaultStoragePath
            )
        }

        /** --- Set user up with LinkedAccounts.Collection --- */
        //
        // Check that Collection is saved in storage
        if parent.type(at: LinkedAccounts.CollectionStoragePath) == nil {
            parent.save(
                <-LinkedAccounts.createEmptyCollection(),
                to: LinkedAccounts.CollectionStoragePath
            )
        }
        // Link the public Capability
        if !parent.getCapability<
                &LinkedAccounts.Collection{LinkedAccounts.CollectionPublic, MetadataViews.ResolverCollection}
            >(LinkedAccounts.CollectionPublicPath).check() {
            parent.unlink(LinkedAccounts.CollectionPublicPath)
            parent.link<&LinkedAccounts.Collection{LinkedAccounts.CollectionPublic, MetadataViews.ResolverCollection}>(
                LinkedAccounts.CollectionPublicPath,
                target: LinkedAccounts.CollectionStoragePath
            )
        }
        // Link the private Capability
        if !parent.getCapability<
                &LinkedAccounts.Collection{LinkedAccounts.CollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.Provider, MetadataViews.ResolverCollection}
            >(LinkedAccounts.CollectionPrivatePath).check() {
            parent.unlink(LinkedAccounts.CollectionPrivatePath)
            parent.link<
                &LinkedAccounts.Collection{LinkedAccounts.CollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver, NonFungibleToken.Provider, MetadataViews.ResolverCollection}
            >(
                LinkedAccounts.CollectionPrivatePath,
                target: LinkedAccounts.CollectionStoragePath
            )
        }
        // Assign linkedAccountsCollectionRef
        self.linkedAccountsCollectionRef = parent.borrow<&LinkedAccounts.Collection>(from: LinkedAccounts.CollectionStoragePath)
            ?? panic("Couldn't get a reference to the parent's LinkedAccounts.Collection")
    }

    execute {
        // Build the MonsterComponent struct from given arguments
        let componentValue = GamePieceNFT.MonsterComponent(
                background: monsterBackground,
                head: monsterHead,
                torso: monsterTorso,
                leg: monsterLeg
            )
        // Mint NFT to child account's Collection
        self.minterRef.mintNFT(
            recipient: self.gamePieceCollectionRef,
            component: componentValue
        )
        // Construct the AccountInfo metadata struct
        let info = LinkedAccountMetadataViews.AccountInfo(
                name: childAccountName,
                description: childAccountDescription,
                thumbnail: MetadataViews.HTTPFile(url: clientIconURL),
                externalURL: MetadataViews.ExternalURL(clientExternalURL)
            )
        // Add the child account to the LinkedAccounts.Collection so its AuthAccountCapability can be maintained
        self.linkedAccountsCollectionRef.addAsChildAccount(
            linkedAccountCap: self.linkedAccountCap,
            linkedAccountMetadata: self.info,
            linkedAccountMetadataResolver: nil,
            handlerPathSuffix: "RockPaperScissorsHandler"
        )
    }
}
 