import Test

pub var accounts: {String: Test.Account} = {}
pub var blockchain = Test.newEmulatorBlockchain()
pub let fungibleTokenAddress: Address = 0xee82856bf20e2aa6
pub let flowTokenAddress: Address = 0x0ae53cb6e3f42a79

pub let dynamicNFT = "DynamicNFT"
pub let gamingMetadataViews = "GamingMetadataViews"
pub let gamePieceNFT = "GamePieceNFT"
pub let ticketToken = "TicketToken"
pub let rockPaperScissorsGame = "RockPaperScissorsGame"
pub let arcadePrize = "ArcadePrize"

pub let gamePieceNFTPublicIdentifier = "GamePieceNFTCollection"
pub let arcadePrizePublicIdentifier = "ArcadePrizeCollection"

pub let matchTimeLimit: UInt = 10
pub let rock: UInt8 = 0
pub let paper: UInt8 = 1
pub let scissors: UInt8 = 2

// --------------- Test cases ---------------

pub fun testMintGamePieceNFT() {
    let receiver = blockchain.createAccount()
    setupNFTCollection(receiver, collection: gamePieceNFT)

    assertCollectionConfigured(receiver.address, collection: gamePieceNFT)

    mintRandomGamePieceNFTPublic(receiver)

    let ids = getCollectionIDs(receiver.address, collection: gamePieceNFT)
    Test.assertEqual(1, ids.length)
}

pub fun testSetupGamePlayer() {
    let player = blockchain.createAccount()
    
    let success = txExecutor("rock_paper_scissors_game/game_player/setup_game_player.cdc", [player], [], nil, nil)
    Test.assertEqual(true, success)
    
    assertGamePlayerConfigured(player.address)

    // Ensure we can query GamePlayer.id
    let playerID = scriptExecutor("rock_paper_scissors_game/get_game_player_id.cdc", [player.address]) as! UInt64?
        ?? panic("GamePlayer was not configured correctly!")
}

pub fun testMintTicketToken() {
    let mintAmount = 10.0
    let receiver = blockchain.createAccount()

    // Setup & verify TicketToken Vault configured correctly
    setupTicketTokenVault(receiver)
    assertTicketTokenConfigured(receiver.address)

    let balance = scriptExecutor("ticket_token/get_balance.cdc", [receiver.address]) as! UFix64?
        ?? panic("TicketToken Vault was not configured correctly!")
    Test.assertEqual(0.0, balance)

    // Mint 10 TicketTokens
    mintTicketTokens(to: receiver.address, amount: mintAmount)
    let newBalance = getTicketTokenBalance(receiver.address)
    Test.assertEqual(mintAmount, newBalance)
}

pub fun testGameOnboarding() {
    
}
// TODO
pub fun testCreateSinglePlayerMatch() {

}
// TODO
pub fun testSubmitSinglePlayerMove() {

}
// TODO
pub fun testSubmitAutomatedPlayerMove() {

}

pub fun testCompleteSinglePlayerMatch() {
    /* --- Onboard Player --- */
    //
    // Configure player's account with game resources
    let player = blockchain.createAccount()
    selfCustodyOnboarding(player)

    // Ensure all resources & Capabilities configured as expected
    assertCollectionConfigured(player.address, collection: gamePieceNFT)
    assertGamePlayerConfigured(player.address)
    assertTicketTokenConfigured(player.address)

    // Query minted NFT.id
    let nftIDs = scriptExecutor("game_piece_nft/get_collection_ids.cdc", [player.address]) as! [UInt64]?
        ?? panic("Problem getting GamePiece NFT IDs!")
    Test.assertEqual(1, nftIDs.length)
    let nftID = nftIDs[0]

    // Query GamePlayer.id
    let playerID = scriptExecutor("rock_paper_scissors_game/get_game_player_id.cdc", [player.address]) as! UInt64?
        ?? panic("GamePlayer was not configured correctly!")

    /* --- Create Single-Player Match --- */
    //
    // Sign up for match
    setupSinglePlayerMatch(player, nftID: nftID, matchTimeLimit: matchTimeLimit)

    // Get the ID of the match just created
    let matchIDs = getMatchIDsInPlay(player.address)
    Test.assertEqual(1, matchIDs.length)
    let matchID = matchIDs[0]

    /* --- Play the Match --- */
    //
    submitBothSinglePlayerMoves(player, matchID: matchID, move: rock)
    resolveMatch(player, matchID: matchID)

    /* --- Verify Results --- */
    //
    let history = getMatchHistoryAsRawValues(matchID: matchID)
        ?? panic("Should have returned valid history, but got nil!")
    assert(history.containsKey(playerID))
    Test.assertEqual(rock, history[playerID]!)
}
// TODO
pub fun testJoinExistingMultiPlayerMatch() {

}
// TODO
pub fun testCompleteMultiPlayerMatch() {

}
// TODO
pub fun testCheatingMoveFails() {

}
// TODO
pub fun testCheatingResolutionFails() {
    
}

// --------------- Transaction wrapper functions ---------------

pub fun transferFlow(amount: UFix64, to: Test.Account) {
    let account = blockchain.serviceAccount()

    let code = loadCode("flow_token/transfer_flow.cdc", "transactions")
    let tx = Test.Transaction(
        code: code,
        authorizers: [account.address],
        signers: [],
        arguments: [to.address, amount]
    )

    // Act
    let result = blockchain.executeTransaction(tx)
    Test.assert(result.status == Test.ResultStatus.succeeded)
}

pub fun setupNFTCollection(_ acct: Test.Account, collection: String) {
    var success: Bool = false
    switch collection {
        case gamePieceNFT:
            success = txExecutor("game_piece_nft/setup_account.cdc", [acct], [], nil, nil)
        case arcadePrize:
            success = txExecutor("arcade_prize/setup_collection.cdc", [acct], [], nil, nil)
    }
    Test.assert(success)
}

pub fun setupTicketTokenVault(_ acct: Test.Account) {
    let success = txExecutor("ticket_token/setup_account.cdc", [acct], [], nil, nil)
    Test.assert(success)
}

pub fun mintGamePieceNFT(_ acct: Test.Account) {
    let success = txExecutor("game_piece_nft/mint_nft_random_component_public.cdc", [acct], [accounts[gamePieceNFT]!.address], nil, nil)
    Test.assert(success)
}

pub fun mintRandomGamePieceNFTPublic(_ acct: Test.Account) {
    let success = txExecutor("game_piece_nft/mint_nft_random_component_public.cdc", [acct], [accounts[gamePieceNFT]!.address], nil, nil)
    Test.assert(success)
}

pub fun mintTicketTokens(to: Address, amount: UFix64) {
    let success = txExecutor("ticket_token/mint_tokens.cdc", [accounts[ticketToken]!], [to, amount], nil, nil)
    Test.assert(success)
}

pub fun selfCustodyOnboarding(_ acct: Test.Account) {
    txExecutor(
        "onboarding/self_custody_onboarding.cdc",
        [acct],
        [accounts[gamePieceNFT]!.address],
        nil,
        nil
    )
}

pub fun setupSinglePlayerMatch(_ acct: Test.Account, nftID: UInt64, matchTimeLimit: UInt) {
    txExecutor(
        "rock_paper_scissors_game/game_player/setup_new_singleplayer_match.cdc",
        [acct],
        [nftID, matchTimeLimit],
        nil,
        nil
    )
}

pub fun submitBothSinglePlayerMoves(_ acct: Test.Account, matchID: UInt64, move: UInt8) {
    txExecutor(
        "rock_paper_scissors_game/game_player/submit_both_singleplayer_moves.cdc",
        [acct],
        [matchID, move],
        nil,
        nil
    )
}

pub fun resolveMatch(_ acct: Test.Account, matchID: UInt64) {
    txExecutor(
        "rock_paper_scissors_game/game_player/resolve_match.cdc",
        [acct],
        [matchID],
        nil,
        nil
    )
}

pub fun resolveMatchAndReturnNFTs(_ acct: Test.Account, matchID: UInt64) {
    txExecutor(
        "rock_paper_scissors_game/game_player/resolve_match_and_return_nfts.cdc",
        [acct],
        [matchID],
        nil,
        nil
    )
}

// ---------------- End Transaction wrapper functions

// ---------------- Begin script wrapper functions

pub fun getTicketTokenBalance(_ addr: Address): UFix64 {
    let balance: UFix64? = (scriptExecutor("ticket_token/get_balance.cdc", [addr])! as! UFix64)
    return balance!
}

pub fun getCollectionIDs(_ addr: Address, collection: String): [UInt64] {
    let collectionIDs: [UInt64] = []
    switch collection {
        case gamePieceNFT:
            collectionIDs.appendAll((scriptExecutor("game_piece_nft/get_collection_ids.cdc", [addr])! as! [UInt64]))
        case arcadePrize:
            collectionIDs.appendAll((scriptExecutor("game_piece_nft/get_collection_ids.cdc", [addr])! as! [UInt64]))
    }
    return collectionIDs
}

pub fun getMatchIDsInPlay(_ addr: Address): [UInt64] {
    return scriptExecutor("rock_paper_scissors_game/get_matches_in_play.cdc", [addr])! as! [UInt64]
}

pub fun getMatchHistoryAsRawValues(matchID: UInt64): {UInt64: UInt8}? {
    return scriptExecutor("rock_paper_scissors_game/get_match_move_history_as_raw_values.cdc", [matchID]) as! {UInt64: UInt8}?
}

pub fun assertGamePlayerConfigured(_ address: Address) {
    let configured = scriptExecutor("test/test_game_player_configuration.cdc", [address]) as! Bool?
        ?? panic("GamePlayer was not configured correctly!")
    Test.assertEqual(true, configured)
}

pub fun assertCollectionConfigured(_ address: Address, collection: String) {
    var path: String = ""
    switch collection {
        case gamePieceNFT:
            path = "test/test_game_piece_nft_configuration.cdc"
        case arcadePrize:
            path = "test/test_arcade_prize_configuration.cdc"
    }
    let configured = scriptExecutor(path, [address]) as! Bool?
        ?? panic("NFT Collection was not configured correctly!")
    Test.assertEqual(true, configured)
}

pub fun assertTicketTokenConfigured(_ address: Address) {
    let configured = scriptExecutor("test/test_ticket_token_configuration.cdc", [address]) as! Bool?
        ?? panic("TicketToken Vault was not configured correctly!")
    Test.assertEqual(true, configured)
}

// ---------------- End script wrapper functions

// ---------------- BEGIN General-purpose helper functions

pub fun buildTypeIdentifier(_ acct: Test.Account, _ contractName: String, _ suffix: String): String {
    let addrString = (acct.address as! Address).toString()
    return "A.".concat(addrString.slice(from: 2, upTo: addrString.length)).concat(".").concat(contractName).concat(".").concat(suffix)
}

// ---------------- END General-purpose helper functions

pub fun getTestAccount(_ name: String): Test.Account {
    if accounts[name] == nil {
        accounts[name] = blockchain.createAccount()
    }

    return accounts[name]!
}

pub fun loadCode(_ fileName: String, _ baseDirectory: String): String {
    return Test.readFile("../".concat(baseDirectory).concat("/").concat(fileName))
}

pub fun scriptExecutor(_ scriptName: String, _ arguments: [AnyStruct]): AnyStruct? {
    let scriptCode = loadCode(scriptName, "scripts")
    let scriptResult = blockchain.executeScript(scriptCode, arguments)
    var failureMessage = ""
    if let failureError = scriptResult.error {
        failureMessage = "Failed to execute the script because -:  ".concat(failureError.message)
    }

    assert(scriptResult.status == Test.ResultStatus.succeeded, message: failureMessage)
    return scriptResult.returnValue
}

pub fun expectScriptFailure(_ scriptName: String, _ arguments: [AnyStruct]): String {
    let scriptCode = loadCode(scriptName, "scripts")
    let scriptResult = blockchain.executeScript(scriptCode, arguments)

    assert(scriptResult.error != nil, message: "script error was expected but there is no error message")
    return scriptResult.error!.message
}

pub fun txExecutor(_ filePath: String, _ signers: [Test.Account], _ arguments: [AnyStruct], _ expectedError: String?, _ expectedErrorType: ErrorType?): Bool {
    let txCode = loadCode(filePath, "transactions")

    let authorizers: [Address] = []
    for s in signers {
        authorizers.append(s.address)
    }

    let tx = Test.Transaction(
        code: txCode,
        authorizers: authorizers,
        signers: signers,
        arguments: arguments,
    )

    let txResult = blockchain.executeTransaction(tx)
    if let err = txResult.error {
        if let expectedErrorMessage = expectedError {
            let ptr = getErrorMessagePointer(errorType: expectedErrorType!)
            let errMessage = err.message
            let hasEmittedCorrectMessage = contains(errMessage, expectedErrorMessage)
            let failureMessage = "Expecting - "
                .concat(expectedErrorMessage)
                .concat("\n")
                .concat("But received - ")
                .concat(err.message)
            assert(hasEmittedCorrectMessage, message: failureMessage)
            return true
        }
        panic(err.message)
    } else {
        if let expectedErrorMessage = expectedError {
            panic("Expecting error - ".concat(expectedErrorMessage).concat(". While no error triggered"))
        }
    }

    return txResult.status == Test.ResultStatus.succeeded
}

pub fun setup() {

    // standard contracts
    let nonFungibleToken = blockchain.createAccount()
    let metadataViews = blockchain.createAccount()
    let fungibleTokenMetadataViews = blockchain.createAccount()
    let viewResolver = blockchain.createAccount()
    
    // main contracts
    let gamingMetadataViews: Test.Account = blockchain.createAccount()
    let dynamicNFT: Test.Account = blockchain.createAccount()
    let gamePieceNFT = blockchain.createAccount()
    let ticketToken = blockchain.createAccount()
    let rockPaperScissorsGame = blockchain.createAccount()
    let arcadePrize = blockchain.createAccount()

    accounts = {
        "NonFungibleToken": nonFungibleToken,
        "MetadataViews": metadataViews,
        "FungibleTokenMetadataViews": fungibleTokenMetadataViews,
        "ViewResolver": viewResolver,
        "GamingMetadataViews": gamingMetadataViews,
        "DynamicNFT": dynamicNFT,
        "GamePieceNFT": gamePieceNFT,
        "TicketToken": ticketToken,
        "RockPaperScissorsGame": rockPaperScissorsGame,
        "ArcadePrize": arcadePrize
    }

    blockchain.useConfiguration(Test.Configuration({
        "FungibleToken": fungibleTokenAddress,
        "NonFungibleToken": accounts["NonFungibleToken"]!.address,
        "FlowToken": flowTokenAddress,
        "FungibleTokenMetadataViews": accounts["FungibleTokenMetadataViews"]!.address,
        "MetadataViews": accounts["MetadataViews"]!.address,
        "ViewResolver": accounts["ViewResolver"]!.address,
        "GamingMetadataViews": accounts["GamingMetadataViews"]!.address,
        "DynamicNFT": accounts["DynamicNFT"]!.address,
        "GamePieceNFT": accounts["GamePieceNFT"]!.address,
        "TicketToken": accounts["TicketToken"]!.address,
        "RockPaperScissorsGame": accounts["RockPaperScissorsGame"]!.address,
        "ArcadePrize": accounts["ArcadePrize"]!.address
    }))

    // deploy standard libs first
    deploy("NonFungibleToken", accounts["NonFungibleToken"]!, "../contracts/utility/NonFungibleToken.cdc")
    deploy("MetadataViews", accounts["MetadataViews"]!, "../contracts/utility/MetadataViews.cdc")
    deploy("FungibleTokenMetadataViews", accounts["FungibleTokenMetadataViews"]!, "../contracts/utility/FungibleTokenMetadataViews.cdc")
    deploy("ViewResolver", accounts["ViewResolver"]!, "../contracts/utility/ViewResolver.cdc")

    // main contracts we'll be testing
    deploy("GamingMetadataViews", accounts["GamingMetadataViews"]!, "../contracts/GamingMetadataViews.cdc")
    deploy("DynamicNFT", accounts["DynamicNFT"]!, "../contracts/DynamicNFT.cdc")
    deploy("GamePieceNFT", accounts["GamePieceNFT"]!, "../contracts/GamePieceNFT.cdc")
    deploy("TicketToken", accounts["TicketToken"]!, "../contracts/TicketToken.cdc")
    deploy("RockPaperScissorsGame", accounts["RockPaperScissorsGame"]!, "../contracts/RockPaperScissorsGame.cdc")
    deploy("ArcadePrize", accounts["ArcadePrize"]!, "../contracts/ArcadePrize.cdc")
}

// BEGIN SECTION: Helper functions. All of the following were taken from
// https://github.com/onflow/Offers/blob/fd380659f0836e5ce401aa99a2975166b2da5cb0/lib/cadence/test/Offers.cdc
// - deploy
// - scriptExecutor
// - txExecutor
// - getErrorMessagePointer

pub fun deploy(_ contractName: String, _ account: Test.Account, _ path: String) {
 let contractCode = Test.readFile(path)
    let err = blockchain.deployContract(
        name: contractName,
        code: contractCode,
        account: account,
        arguments: [],
    )

    if err != nil {
        panic(err!.message)
    }
}

pub enum ErrorType: UInt8 {
    pub case TX_PANIC
    pub case TX_ASSERT
    pub case TX_PRE
}

pub fun getErrorMessagePointer(errorType: ErrorType) : Int {
    switch errorType {
        case ErrorType.TX_PANIC: return 159
        case ErrorType.TX_ASSERT: return 170
        case ErrorType.TX_PRE: return 174
        default: panic("Invalid error type")
    }

    return 0
}

// END SECTION: Helper functions
 

 // Copied functions from flow-utils so we can assert on error conditions
 // https://github.com/green-goo-dao/flow-utils/blob/main/cadence/contracts/StringUtils.cdc
pub fun contains(_ s: String, _ substr: String): Bool {
    if let index =  index(s, substr, 0) {
        return true
    }
    return false
}

 // https://github.com/green-goo-dao/flow-utils/blob/main/cadence/contracts/StringUtils.cdc
pub fun index(_ s : String, _ substr : String, _ startIndex: Int): Int?{
    for i in range(startIndex,s.length-substr.length+1){
        if s[i]==substr[0] && s.slice(from:i, upTo:i+substr.length) == substr{
            return i
        }
    }
    return nil
}

// https://github.com/green-goo-dao/flow-utils/blob/main/cadence/contracts/ArrayUtils.cdc
pub fun rangeFunc(_ start: Int, _ end: Int, _ f : ((Int):Void) ) {
    var current = start
    while current < end{
        f(current)
        current = current + 1
    }
}

pub fun range(_ start: Int, _ end: Int): [Int]{
    var res:[Int] = []
    rangeFunc(start, end, fun (i:Int){
        res.append(i)
    })
    return res
}
