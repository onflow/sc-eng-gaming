import path from "path";
import { 
  emulator, 
  init, 
  getAccountAddress, 
  deployContractByName, 
  sendTransaction, 
  shallPass,
  shallRevert,
  executeScript 
} from "@onflow/flow-js-testing";
  import fs from "fs";


// Auxiliary function for deploying the cadence contracts
async function deployContract(param) {
  const [result, error] = await deployContractByName(param);
  if (error != null) {
    console.log(`Error in deployment - ${error}`);
    emulator.stop();
    process.exit(1);
  }
}

const get_collection_ids = fs.readFileSync(path.resolve(__dirname, "./../../../scripts/game_piece_nft/get_collection_ids.cdc"), {encoding:'utf8', flag:'r'});

// Defining the test suite for the fungible token switchboard
describe("child_accounts", ()=>{

  // Variables for holding the account address
  let serviceAccount;
  let parentAccount;

  // Before each test...
  beforeEach(async () => {
    // We do some scafolding...

    // Getting the base path of the project
    const basePath = path.resolve(__dirname, "./../../../"); 
		// You can specify different port to parallelize execution of describe blocks
    const port = 8080; 
		// Setting logging flag to true will pipe emulator output to console
    const logging = false;

    await init(basePath);
    await emulator.start({ logging });

    // ...then we deploy the ft and example token contracts using the getAccountAddress function
    // from the flow-js-testing library...

    // Create a service account and deploy contracts to it
    serviceAccount = await getAccountAddress("ServiceAccount")

    await deployContract({ to: serviceAccount,    name: "ChildAuthAccount"});
    await deployContract({ to: serviceAccount,    name: "utility/FungibleToken"});
    await deployContract({ to: serviceAccount,    name: "utility/NonFungibleToken"});
    await deployContract({ to: serviceAccount,    name: "utility/MetadataViews"});


    parentAccount = await getAccountAddress("ParentAccount");

  });

  // After each test we stop the emulator, so it could be restarted
  afterEach(async () => {
    return emulator.stop();
  });

  // First test checks if service account can create a orphan child account 
  test("Admin should be able to create a child account", async () => {
    // First step: create a child creator
    await shallPass(
      sendTransaction({
        name: "child_account/setup_child_account_creator",
        args: [],
        signers: [serviceAccount]
      })
    );
    // Second step: create a child account
    let pubKey = "eb986126679b4b718208c9d1d92f5b357f46137fe8de2f5bc589b0c5dfc3e8812f256faea8c6719d1ee014e1b08c62d2243af1413dfb6c2cbf36aca229eb5d05"
    await shallPass(
      sendTransaction({
        name: "child_account/create_child_account",
        args: [pubKey, 0, "first_born", "Test child", "someURL", "anotherURL"],
        signers: [serviceAccount]
      })
    );
  });


  // Second test checks if a parent can adopt a child account from the minter
  test("Admin should be able to associate child to parent", async () => { // parent should accept child!
    // First step: admin create a child creator
    await shallPass(
      sendTransaction({
        name: "child_account/setup_child_account_creator",
        args: [],
        signers: [serviceAccount]
      })
    );
    // Second step: admin create a child account
    let pubKey = "eb986126679b4b718208c9d1d92f5b357f46137fe8de2f5bc589b0c5dfc3e8812f256faea8c6719d1ee014e1b08c62d2243af1413dfb6c2cbf36aca229eb5d05"
    await shallPass(
      sendTransaction({
        name: "child_account/create_child_account",
        args: [pubKey, 0, "first_born", "Test child", "someURL", "anotherURL"],
        signers: [serviceAccount]
      })
    );
    // Third step: user creates a child manager
    await shallPass(
      sendTransaction({
        name: "child_account/setup_child_account_manager",
        args: [],
        signers: [parentAccount]
      })
    );
    // Fourth step: 

  });
  /*
  // Third test checks if parent can access child account
  test("Parent should be able to access child AuthAccount", async () => {
    // First step: create a collection
    await shallPass(
      sendTransaction({
        name: "child_account/create_child_account",
        args: [],
        signers: [playerOne]
      })
    );
  });
 */
  // Fifth test checks if parent can delete child account
  //test("Parent should be able to delete child account", async () => {
    // First step: create a collection
    // Transfer everything from the child account
    // Destroy the controller (delete it from the mapping)
  //});  

});