// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Middleware to serialize BigInt values to strings in JSON responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    try {
      // First handle any BigInt values by converting them to strings
      const stringified = JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );

      // Then parse and send the converted data
      return originalJson.call(this, JSON.parse(stringified));
    } catch (error) {
      console.error('Error serializing response data:', error);
      // Fall back to simple error response in case of serialization issues
      return originalJson.call(this, { error: 'Data serialization error' });
    }
  };
  next();
});

// Attempt to connect to Ganache
let web3;
try {
  web3 = new Web3('http://127.0.0.1:7545');
  console.log('Attempting to connect to Ganache...');
} catch (error) {
  console.error('Failed to initialize Web3:', error.message);
  process.exit(1); // Exit if we can't connect to blockchain
}

// Set default account
let defaultAccount = '0xC12560De6da9fe5AA4A619AE45E0360B0118b9Ad';

// Contract instances
let userReg, electionMgr, results, voting, surveyCtr, decisionVoting;

// Track whitelists in memory since they may not be directly accessible from contract
const decisionWhiteLists = {};

// Define common ID ranges to check for decisions
const decisionIdRanges = [
  { start: 0, end: 100 },       // Low IDs

];

/**
 * Normalizes an Ethereum address for consistent comparison
 * @param {string} address - The Ethereum address to normalize
 * @returns {string} - The normalized address (lowercase with no whitespace)
 */
function normalizeAddress(address) {
  if (!address) return '';
  return address.trim().toLowerCase();
}

// Initialize contracts
async function initializeContracts() {
  try {
    // Load ABIs
    const userRegABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'ABI', 'userRegistration.json')));
    const electionMgrABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'ABI', 'electionManager.json')));
    const resultsABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'ABI', 'Results.json')));
    const votingABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'ABI', 'voting.json')));
    const surveyABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'ABI', 'survey.json')));
    const decisionVotingABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'ABI', 'decisionVoting.json')));

    // Contract addresses
    const userRegAddress = '0x798Ae1aC7E6455d1991040903bB1B48A38769CF1';
    const electionMgrAddress = '0xE3b9eb57eCe05ea35501b1F6C4e7E27F598c7127';
    const resultsAddress = '0x4bE9D81bDF09933f059b88A1ccbd8CfB663BE5db';
    const votingAddress = '0xF2F6e4299FF445BA9178A37bcD506ECed9a1873D';
    const decisionVotingAddress = '0x67D7BbfBAF6cFdF0d5215b4dD4941024D5A26Be1';
    const surveyAddress = '0xb1Cd30073F6Fd376841e07CFCf04537279D3fc22';

    console.log("Attempting to connect to contracts at these addresses:");
    console.log("UserRegistration:", userRegAddress);
    console.log("ElectionManager:", electionMgrAddress);
    console.log("Results:", resultsAddress);
    console.log("Voting:", votingAddress);
    console.log("Survey:", surveyAddress);
    console.log("DecisionVoting:", decisionVotingAddress);

    // Instantiate contract objects
    try {
      userReg = new web3.eth.Contract(userRegABI, userRegAddress);
      console.log("Successfully connected to UserRegistration contract");
    } catch (error) {
      console.error("Failed to connect to UserRegistration contract:", error.message);
      console.log("⚠️ IMPORTANT: User registration will not work! ⚠️");
      console.log("You need to redeploy the contracts and update the addresses in server.js");
    }

    try {
      electionMgr = new web3.eth.Contract(electionMgrABI, electionMgrAddress);
      console.log("Successfully connected to ElectionManager contract");
    } catch (error) {
      console.error("Failed to connect to ElectionManager contract:", error.message);
    }

    try {
      results = new web3.eth.Contract(resultsABI, resultsAddress);
      console.log("Successfully connected to Results contract");
    } catch (error) {
      console.error("Failed to connect to Results contract:", error.message);
    }

    try {
      voting = new web3.eth.Contract(votingABI, votingAddress);
      console.log("Successfully connected to Voting contract");
    } catch (error) {
      console.error("Failed to connect to Voting contract:", error.message);
    }

    try {
      surveyCtr = new web3.eth.Contract(surveyABI, surveyAddress);
      console.log("Successfully connected to Survey contract");
    } catch (error) {
      console.error("Failed to connect to Survey contract:", error.message);
    }

    try {
      decisionVoting = new web3.eth.Contract(decisionVotingABI, decisionVotingAddress);
      console.log("Successfully connected to DecisionVoting contract");
    } catch (error) {
      console.error("Failed to connect to DecisionVoting contract:", error.message);
      console.log("⚠️ IMPORTANT: Decision voting will not work! ⚠️");
    }

    // Set default account
    const accounts = await web3.eth.getAccounts();
    defaultAccount = accounts[0];
    web3.eth.defaultAccount = defaultAccount;
    console.log('Default account set to', defaultAccount);

    return true;
  } catch (error) {
    console.error('Error setting up contracts:', error.message);
    return false;
  }
}

// Helper function to get all survey IDs from blockchain events
async function getSurveyIdsFromBlockchain() {
  try {
    // First, use the getAllSurveyIds function added to the contract
    try {
      const surveyIds = await surveyCtr.methods.getAllSurveyIds().call();
      if (Array.isArray(surveyIds) && surveyIds.length > 0) {
        return surveyIds;
      }
    } catch (error) {
      console.warn('Error using getAllSurveyIds:', error.message);
    }

    // Alternative approach using surveyCount and getSurveyIdByIndex
    try {
      const surveyCount = await surveyCtr.methods.surveyCount().call();

      if (surveyCount > 0) {
        const surveyIds = [];
        for (let i = 0; i < surveyCount; i++) {
          try {
            const id = await surveyCtr.methods.getSurveyIdByIndex(i).call();
            if (id) {
              surveyIds.push(id);
            }
          } catch (indexErr) {
            console.warn(`Error getting survey ID at index ${i}:`, indexErr.message);
          }
        }

        if (surveyIds.length > 0) {
          return surveyIds;
        }
      }
    } catch (countError) {
      console.warn('Error using surveyCount approach:', countError.message);
    }

    // Return empty array if no survey IDs found
    return [];
  } catch (error) {
    console.error('Error getting survey IDs from blockchain:', error);
    return []; // Return empty array on error
  }
}

// Helper function to create a safe, serializable response object from a transaction receipt
function createSafeReceiptResponse(receipt) {
  return {
    transactionHash: receipt && receipt.transactionHash ? String(receipt.transactionHash) : null,
    blockNumber: receipt && receipt.blockNumber ? String(receipt.blockNumber) : null,
    gasUsed: receipt && receipt.gasUsed ? String(receipt.gasUsed) : null,
    status: receipt && receipt.status ? Boolean(receipt.status) : false
  };
}

// Function to safely log receipt objects
function logReceipt(action, id, receipt) {
  try {
    console.log(`${action} ${id}, receipt:`, JSON.stringify(receipt, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  } catch (error) {
    console.error(`Error logging receipt: ${error.message}`);
    console.log(`${action} ${id}, receipt: [Receipt contains non-serializable data]`);
  }
}





// ---------------- User Registration ---------------- //

// Register a new user
app.post('/register', async (req, res) => {
  const { uuid, from } = req.body;

  try {
    const receipt = await userReg.methods.registerUser(uuid)
      .send({ from: from || defaultAccount, gas: 300000 });

    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if uuid is registered
app.get('/registered/:uuid', async (req, res) => {
  try {
    const isReg = await userReg.methods.isUserRegistered(req.params.uuid).call();
    res.json({ registered: isReg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if a wallet address is registered
app.get('/walletRegistered/:wallet', async (req, res) => {
  try {
    const isReg = await userReg.methods.isWalletRegistered(req.params.wallet).call();
    res.json({ registered: isReg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get uuid by wallet address
app.get('/uuid/:wallet', async (req, res) => {
  try {
    const uuid = await userReg.methods.walletToUuid(req.params.wallet).call();
    res.json({ uuid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// ---------------- Election Management ---------------- //

// Create a new election
app.post('/elections', async (req, res) => {
  const { id, name, duration, ipfsHash, from } = req.body;

  console.log("Request body received:", req.body);
  console.log("Sender wallet address:", from || "Not provided, will use defaultAccount");
  console.log("Default account being used:", defaultAccount);

  // Validate required parameters
  if (!id) {
    return res.status(400).json({ error: "Missing required parameter: id" });
  }
  if (!name) {
    return res.status(400).json({ error: "Missing required parameter: name" });
  }
  if (!duration) {
    return res.status(400).json({ error: "Missing required parameter: duration" });
  }

  console.log(`Processing election creation request: ID=${id}, name=${name}, duration=${duration}`);

  try {
    // Check if the election already exists by ID
    try {
      console.log(`Checking if election ID ${id} already exists...`);
      const existingElection = await electionMgr.methods.getElection(id).call();

      // Only consider it a duplicate if we get valid data back AND it has a name property
      if (existingElection && existingElection.name && existingElection.name.length > 0) {
        console.log(`Election ID ${id} already exists with name ${existingElection.name}`);
        return res.status(409).json({
          error: `Election ID '${id}' already exists. Please choose a different ID.`,
          code: "DUPLICATE_ELECTION_ID"
        });
      } else {
        console.log(`Election ID ${id} exists but appears to be invalid or empty, proceeding with creation`);
      }
    } catch (checkError) {
      // If we get an error from the contract, the election likely doesn't exist, which is what we want
      console.log(`Election ID ${id} does not exist (contract returned: ${checkError.message}), proceeding with creation`);
    }

    // Convert duration to uint64
    const durationUint64 = Number(duration);

    // Log transaction params before sending
    const txParams = {
      from: from || defaultAccount,
      gas: 400000
    };
    console.log(`Creating election with transaction params:`, txParams);
    console.log(`Method params: id=${id}, name=${name}, duration=${durationUint64}, ipfsHash=${ipfsHash || 'QmDefault'}`);

    // Ensure 'from' address is valid
    if (txParams.from && !web3.utils.isAddress(txParams.from)) {
      console.error(`Invalid 'from' address: ${txParams.from}`);
      return res.status(400).json({
        error: `Invalid sender address format: ${txParams.from}`,
        code: "INVALID_ADDRESS"
      });
    }

    console.log(`Creating election: ID=${id}, name=${name}, duration=${durationUint64}`);
    const receipt = await electionMgr.methods.createElection(id, name, durationUint64, ipfsHash || 'QmDefault')
      .send(txParams);

    // Update electionIds.json by adding the new ID
    try {
      const electionIdsPath = path.join(__dirname, 'electionIds.json');
      let electionIds = [];

      // Read existing IDs or create empty array
      if (fs.existsSync(electionIdsPath)) {
        try {
          const fileContent = fs.readFileSync(electionIdsPath, 'utf8');
          // Check if file content looks like valid JSON before parsing
          if (fileContent.trim().startsWith('[') && fileContent.trim().endsWith(']')) {
            electionIds = JSON.parse(fileContent);
          } else {
            // If file content doesn't look like valid JSON, initialize with empty array
            console.warn('electionIds.json did not contain a valid JSON array, initializing with empty array');
            electionIds = [];
          }
        } catch (parseErr) {
          console.error('Error parsing election IDs from file:', parseErr);
          electionIds = [];
        }
      }

      // Add the new ID if it doesn't exist
      if (!electionIds.includes(id)) {
        electionIds.push(id);
        // Write back to the file
        fs.writeFileSync(electionIdsPath, JSON.stringify(electionIds, null, 2));
        console.log(`Added election ID ${id} to electionIds.json`);
      }
    } catch (fileErr) {
      console.error('Error updating election IDs file:', fileErr);
      // Continue even if file update fails
    }

    console.log(`Election created successfully: ID=${id}, txHash=${receipt.transactionHash}`);
    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    console.error(`Error creating election: ${error.message}`);

    // Check if the error message indicates the election already exists
    if (error.message.includes("Election ID already exists") ||
      (error.message.includes("revert") && error.message.includes("ID"))) {
      return res.status(409).json({
        error: `Election ID '${id}' already exists. Please choose a different ID.`,
        code: "DUPLICATE_ELECTION_ID"
      });
    }

    // Handle VM exceptions or other blockchain errors
    res.status(500).json({
      error: error.message,
      code: "BLOCKCHAIN_ERROR"
    });
  }
});

// Activate election
app.put('/elections/:id/activate', async (req, res) => {
  const from = req.body.from;

  try {
    const receipt = await electionMgr.methods.activateElection(req.params.id)
      .send({ from: from || defaultAccount, gas: 200000 });
    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End election
app.put('/elections/:id/end', async (req, res) => {
  const from = req.body.from;

  try {
    const receipt = await electionMgr.methods.endElection(req.params.id)
      .send({ from: from || defaultAccount, gas: 200000 });
    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add candidate
app.post('/elections/:id/candidates', async (req, res) => {
  const { candidate, from } = req.body;

  try {
    const receipt = await electionMgr.methods.addCandidate(req.params.id, candidate)
      .send({ from: from || defaultAccount, gas: 200000 });
    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add eligible country
app.post('/elections/:id/countries', async (req, res) => {
  const { country, from } = req.body;

  try {
    const receipt = await electionMgr.methods.addEligibleCountry(req.params.id, country)
      .send({ from: from || defaultAccount, gas: 200000 });
    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get election details
app.get('/elections/:id', async (req, res) => {
  try {
    const data = await electionMgr.methods.getElection(req.params.id).call();
    res.json({
      name: data.name,
      startTime: data.startTime,
      duration: data.duration,
      active: data.active,
      ipfsHash: data.ipfsHash
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all elections
app.get('/elections', async (req, res) => {
  try {
    // Read election IDs from file
    let electionIds = [];
    try {
      const electionIdsPath = path.join(__dirname, 'electionIds.json');
      if (fs.existsSync(electionIdsPath)) {
        try {
          const fileContent = fs.readFileSync(electionIdsPath, 'utf8');
          // Check if file content looks like valid JSON before parsing
          if (fileContent.trim().startsWith('[') && fileContent.trim().endsWith(']')) {
            electionIds = JSON.parse(fileContent);
          } else {
            // If file content doesn't look like valid JSON, initialize with empty array
            console.warn('electionIds.json did not contain a valid JSON array, using empty array');
            // Write empty array to fix the file
            fs.writeFileSync(electionIdsPath, '[]');
          }
        } catch (parseErr) {
          console.error('Error parsing election IDs from file:', parseErr);
          // Attempt to recreate a valid file
          console.log('Recreating election IDs file with empty array');
          fs.writeFileSync(electionIdsPath, '[]');
        }
      } else {
        // Create the file if it doesn't exist
        console.log('Creating new electionIds.json file');
        fs.writeFileSync(electionIdsPath, '[]');
      }
      console.log(`Loaded ${electionIds.length} election IDs from file`);
    } catch (fileErr) {
      console.error('Error reading election IDs from file:', fileErr);
      // Continue with empty array if file doesn't exist
    }

    // Array to store all election data
    const elections = [];

    // Retrieve each election
    for (const id of electionIds) {
      try {
        const data = await electionMgr.methods.getElection(id).call();

        elections.push({
          id: id,
          name: data.name,
          startTime: data.startTime,
          duration: data.duration,
          active: data.active,
          ipfsHash: data.ipfsHash
        });
      } catch (electionErr) {
        console.error(`Error fetching election ${id}:`, electionErr.message);
        // Continue to next election if one fails
      }
    }

    console.log(`Retrieved ${elections.length} elections from blockchain`);
    res.json({ elections });
  } catch (error) {
    console.error('Error getting all elections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get candidates list
app.get('/elections/:id/candidates', async (req, res) => {
  try {
    const list = await electionMgr.methods.getCandidates(req.params.id).call();
    res.json({ candidates: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get eligible countries list
app.get('/elections/:id/countries', async (req, res) => {
  try {
    const list = await electionMgr.methods.getEligibleCountries(req.params.id).call();
    res.json({ countries: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if country is eligible for an election
app.get('/elections/:id/countries/:country', async (req, res) => {
  try {
    const isEligible = await electionMgr.methods.isCountryEligible(req.params.id, req.params.country).call();
    res.json({ eligible: isEligible });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check remaining time
app.get('/elections/:id/remaining', async (req, res) => {
  try {
    const secs = await electionMgr.methods.getRemainingTime(req.params.id).call();
    res.json({ remaining: secs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get end time 
app.get('/elections/:id/endtime', async (req, res) => {
  try {
    const endTime = await electionMgr.methods.getEndTime(req.params.id).call();
    res.json({ endTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if election is active
app.get('/elections/:id/active', async (req, res) => {
  try {
    const active = await electionMgr.methods.isElectionActive(req.params.id).call();
    res.json({ active });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// ---------------- Voting ---------------- //

// Cast vote on election / cast election vote
app.post('/vote', async (req, res) => {
  const { electionId, candidate, from } = req.body;

  try {
    const receipt = await voting.methods.vote(electionId, candidate)
      .send({ from: from || defaultAccount, gas: 300000 });
    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if wallet has voted
app.get('/vote/status/:electionId/:wallet', async (req, res) => {
  try {
    const voted = await voting.methods.hasWalletVoted(req.params.electionId, req.params.wallet).call();
    res.json({ voted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if current user has voted
app.get('/vote/status/:electionId', async (req, res) => {
  const from = req.query.from || defaultAccount;

  try {
    const voted = await voting.methods.hasCurrentUserVoted(req.params.electionId).call({ from });
    res.json({ voted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});






// ---------------- Results ---------------- //
// Set result visibility
app.post('/results/:id/visibility', async (req, res) => {
  const { visible, from } = req.body;

  try {
    const visibilityValue = visible === true;

    const receipt = await results.methods.setResultsVisible(req.params.id, visibilityValue)
      .send({ from: from || defaultAccount, gas: 200000 });

    res.json({
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get result visibility
app.get('/results/:id/visibility', async (req, res) => {
  try {
    const visible = await results.methods.resultsVisible(req.params.id).call();
    res.json({ visible });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get results
app.get('/results/:id', async (req, res) => {
  try {
    // Get the results directly from the Results contract
    const voteData = await results.methods.getResults(req.params.id).call();

    // The getResults function now returns candidates and votes arrays
    res.json({
      candidates: voteData[0],
      votes: voteData[1]
    });
  } catch (error) {
    // If results aren't visible, or any other error occurs
    console.error('Error getting results:', error);

    // Try to get the candidates from ElectionManager, then return them with zero votes
    try {
      const candidates = await electionMgr.methods.getCandidates(req.params.id).call();
      const votes = Array(candidates.length).fill("0");

      // Only return permission error if results are not visible
      if (error.message.includes("Results not visible")) {
        return res.status(403).json({ error: "Results are not visible yet" });
      }

      res.json({ candidates, votes });
    } catch (secondError) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get winner
app.get('/results/:id/winner', async (req, res) => {
  try {
    const winner = await results.methods.getWinner(req.params.id).call();
    res.json({ winner });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get total votes
app.get('/results/:id/totalVotes', async (req, res) => {
  try {
    const total = await results.methods.totalVotes(req.params.id).call();
    res.json({ totalVotes: total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});







// ---------------- Survey Management ---------------- //

// Create a new survey
app.post('/surveys', async (req, res) => {
  const { id, title, description, duration, maxSelectableOptions, from } = req.body;

  try {
    const txParams = {
      from: from || defaultAccount,
      gas: 500000 
    };

    const durationInSeconds = parseInt(duration) * 60;
    const receipt = await surveyCtr.methods.createSurvey(
      id,
      title,
      description || '',
      durationInSeconds, 
      maxSelectableOptions || 1
    ).send(txParams);

    const response = createSafeReceiptResponse(receipt);

    // Also return the survey ID for convenience
    response.surveyId = id;
    
    res.json(response);
  } catch (error) {
    console.error(`Error creating survey: ${error.message}`);
    res.status(500).json({
      error: error.message,
      code: "BLOCKCHAIN_ERROR"
    });
  }
});

// Add option to survey
app.post('/surveys/:id/options', async (req, res) => {
  const { optionText, from } = req.body;
  const surveyId = req.params.id;

  console.log(`Adding option "${optionText}" to survey ${surveyId} from ${from || defaultAccount}`);

  try {
    const receipt = await surveyCtr.methods.addOption(surveyId, optionText)
      .send({ from: from || defaultAccount, gas: 200000 });

    logReceipt("Added option to survey", surveyId, receipt);

    res.json(createSafeReceiptResponse(receipt));
  } catch (error) {
    console.error(`Error adding option to survey ${surveyId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Activate survey
app.put('/surveys/:id/activate', async (req, res) => {
  const surveyId = req.params.id;
  const from = req.body.from;

  console.log(`Activating survey ${surveyId} from ${from || defaultAccount}`);

  try {
    const receipt = await surveyCtr.methods.activateSurvey(surveyId)
      .send({ from: from || defaultAccount, gas: 200000 });

    logReceipt("Activated survey", surveyId, receipt);

    res.json(createSafeReceiptResponse(receipt));
  } catch (error) {
    console.error(`Error activating survey ${surveyId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// End survey
app.put('/surveys/:id/end', async (req, res) => {
  const surveyId = req.params.id;
  const from = req.body.from;

  console.log(`Ending survey ${surveyId} from ${from || defaultAccount}`);

  try {
    const receipt = await surveyCtr.methods.endSurvey(surveyId)
      .send({ from: from || defaultAccount, gas: 200000 });

    logReceipt("Ended survey", surveyId, receipt);

    res.json(createSafeReceiptResponse(receipt));
  } catch (error) {
    console.error(`Error ending survey ${surveyId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get survey details
app.get('/surveys/:id', async (req, res) => {
  try {
    const data = await surveyCtr.methods.surveys(req.params.id).call();

    // Calculate if it's active based on time
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = Number(data.startTime);
    const endTime = startTime + Number(data.duration);
    const isActive = data.active && currentTime >= startTime && currentTime <= endTime;

    res.json({
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      duration: data.duration,
      active: isActive,
      maxSelectableOptions: data.maxSelectableOptions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get survey options
app.get('/surveys/:id/options', async (req, res) => {
  const surveyId = req.params.id;

  try {
    // First check if survey exists
    try {
      const survey = await surveyCtr.methods.surveys(surveyId).call();
      if (!survey || !survey.title) {
        return res.json({ options: [], votes: [] });
      }
    } catch (surveyErr) {
      console.error(`Error checking survey ${surveyId}:`, surveyErr);
      return res.json({ options: [], votes: [] });
    }

    try {
      // Get options from the contract
      const optionsResult = await surveyCtr.methods.getOptions(surveyId).call();

      // Handle different possible formats of the blockchain response
      let options = [], votes = [];

      if (optionsResult) {
        // Case 1: Response is an array with two elements
        if (Array.isArray(optionsResult) && optionsResult.length >= 2) {
          options = optionsResult[0] || [];
          votes = optionsResult[1] || [];
        }
        // Case 2: Response is an object with '0' and '1' properties
        else if (optionsResult['0'] && optionsResult['1']) {
          options = Array.isArray(optionsResult['0']) ? optionsResult['0'] : [];
          votes = Array.isArray(optionsResult['1']) ? optionsResult['1'] : [];
        }
      }

      // Filter out any empty or invalid options
      options = options.filter(opt => opt && opt !== '');
      votes = votes.slice(0, options.length);

      // Ensure votes array matches options array length
      while (votes.length < options.length) {
        votes.push('0');
      }

      res.json({ options, votes });
    } catch (optionsErr) {
      console.error(`Error getting options for survey ${surveyId}:`, optionsErr);
      return res.json({ options: [], votes: [] });
    }
  } catch (error) {
    console.error('Error in survey options endpoint:', error);
    res.json({ options: [], votes: [] });
  }
});

// Check if user has participated in survey
app.get('/surveys/:id/participation/:address', async (req, res) => {
  const surveyId = req.params.id;
  const address = req.params.address;

  if (!address || !web3.utils.isAddress(address)) {
    console.error(`Invalid address format: ${address}`);
    return res.json({ participated: false });
  }

  try {
    let participated = false;

    try {
      participated = await surveyCtr.methods.hasUserParticipated(surveyId, address).call();
    } catch (err) {
      console.error(`Error checking participation for survey ${surveyId}:`, err.message);
      // Return false on error, don't send error response
    }

    res.json({ participated });
  } catch (error) {
    console.error('Error in participation endpoint:', error);
    res.json({ participated: false });
  }
});

// Submit survey response
app.post('/surveys/:id/respond', async (req, res) => {
  const surveyId = req.params.id;
  const { optionIds, from } = req.body;

  console.log(`Processing survey response for survey ${surveyId}:`, { optionIds, from });

  // Validate inputs
  if (!from || !web3.utils.isAddress(from)) {
    console.error(`Invalid address format: ${from}`);
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  if (!Array.isArray(optionIds) || optionIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one option' });
  }

  try {
    // Check if survey exists
    try {
      const surveyExists = await surveyCtr.methods.surveys(surveyId).call();
      if (!surveyExists || !surveyExists.title) {
        return res.status(404).json({ error: 'Survey not found' });
      }
    } catch (surveyError) {
      console.error(`Error checking if survey ${surveyId} exists:`, surveyError.message);
      return res.status(404).json({ error: 'Error verifying survey: ' + surveyError.message });
    }

    // Check if user has already participated
    try {
      const participated = await surveyCtr.methods.hasUserParticipated(surveyId, from).call();
      if (participated) {
        return res.status(400).json({ error: 'You have already participated in this survey' });
      }
    } catch (participationErr) {
      console.error(`Error checking participation for ${from} in survey ${surveyId}:`, participationErr.message);
      // Continue even if this check fails
    }

    // Check if survey is active
    try {
      const isActive = await surveyCtr.methods.isSurveyActive(surveyId).call();
      if (!isActive) {
        return res.status(400).json({ error: 'This survey is not active' });
      }
    } catch (activeErr) {
      console.error(`Error checking if survey ${surveyId} is active:`, activeErr.message);
      // Continue even if this check fails
    }

    // Check maximum selectable options
    try {
      const maxOptions = await surveyCtr.methods.getMaxSelectableOptions(surveyId).call();
      if (optionIds.length > parseInt(maxOptions)) {
        return res.status(400).json({ 
          error: `You can select a maximum of ${maxOptions} options`,
          maxSelectableOptions: parseInt(maxOptions)
        });
      }
    } catch (maxOptionsErr) {
      console.error(`Error checking max options for survey ${surveyId}:`, maxOptionsErr.message);
      // Continue even if this check fails
    }

    // Attempt to submit the response
    console.log(`Submitting response to survey ${surveyId} with options: [${optionIds.join(', ')}] from address ${from}`);
    
    try {
      const receipt = await surveyCtr.methods.participateMultiple(surveyId, optionIds)
        .send({ from, gas: 500000 }); // Increased gas limit to ensure transaction completes

      const response = createSafeReceiptResponse(receipt);
      console.log(`Successfully submitted response to survey ${surveyId}:`, response);
      return res.json(response);
    } catch (txError) {
      console.error(`Transaction error submitting response to survey ${surveyId}:`, txError.message);
      
      // Extract the reason from the error message if available
      let errorMessage = 'Failed to submit response to blockchain';
      
      if (txError.message.includes('already participated')) {
        errorMessage = 'You have already participated in this survey';
      } else if (txError.message.includes('not active')) {
        errorMessage = 'This survey is not active';
      } else if (txError.message.includes('Too many options')) {
        errorMessage = 'Too many options selected';
      } else if (txError.message.includes('revert')) {
        // Extract the specific revert reason if possible
        const revertMatch = txError.message.match(/reverted with reason string ['"](.+?)['"]/);
        if (revertMatch && revertMatch[1]) {
          errorMessage = revertMatch[1];
        }
      }
      
      return res.status(400).json({ error: errorMessage });
    }
  } catch (error) {
    console.error(`General error submitting response to survey ${surveyId}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Get all survey IDs
app.get('/surveys/ids', async (req, res) => {
  try {
    // Get survey IDs directly from blockchain instead of file
    const surveyIds = await getSurveyIdsFromBlockchain();
    res.json(surveyIds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all surveys
app.get('/surveys', async (req, res) => {
  try {
    // Get survey IDs directly from blockchain
    const surveyIds = await getSurveyIdsFromBlockchain();

    // Array to store all survey data
    const surveys = [];

    // Retrieve each survey
    for (const id of surveyIds) {
      try {
        let data;

        try {
          data = await surveyCtr.methods.surveys(id).call();

          // Skip invalid surveys
          if (!data || !data.title) {
            continue;
          }
        } catch (detailErr) {
          console.error(`Error fetching survey ${id}:`, detailErr.message);
          continue;
        }

        // Calculate if it's active based on time
        const currentTime = Math.floor(Date.now() / 1000);
        const startTime = Number(data.startTime);
        const endTime = startTime + Number(data.duration);
        const isActive = data.active && currentTime >= startTime && currentTime <= endTime;

        surveys.push({
          id: id,
          title: data.title,
          description: data.description || '',
          startTime: data.startTime,
          duration: data.duration,
          active: isActive,
          maxSelectableOptions: data.maxSelectableOptions
        });
      } catch (surveyErr) {
        console.error(`Error processing survey ${id}:`, surveyErr.message);
      }
    }

    res.json(surveys);
  } catch (error) {
    console.error('Error getting all surveys:', error);
    res.status(500).json({ status: false, error: error.message });
  }
});

// Check if survey is active
app.get('/surveys/:id/active', async (req, res) => {
  try {
    const active = await surveyCtr.methods.isSurveyActive(req.params.id).call();
    res.json({ active });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active surveys
app.get('/surveys/active', async (req, res) => {
  try {
    // Get survey IDs directly from blockchain
    const surveyIds = await getSurveyIdsFromBlockchain();

    // Array to store active surveys
    const activeSurveys = [];

    // Check each survey
    for (const id of surveyIds) {
      try {
        let isActive = false;

        try {
          isActive = await surveyCtr.methods.isSurveyActive(id).call();
        } catch (activeErr) {
          console.error(`Error checking if survey ${id} is active:`, activeErr.message);
          continue;
        }

        if (isActive) {
          try {
            const data = await surveyCtr.methods.surveys(id).call();

            // Verify survey data is valid
            if (!data || !data.title) {
              continue;
            }

            activeSurveys.push({
              id: id,
              title: data.title,
              description: data.description || '',
              startTime: data.startTime,
              duration: data.duration,
              active: true,
              maxSelectableOptions: data.maxSelectableOptions
            });
          } catch (detailsErr) {
            console.error(`Error getting details for survey ${id}:`, detailsErr.message);
          }
        }
      } catch (surveyErr) {
        console.error(`Error checking survey ${id}:`, surveyErr.message);
      }
    }

    res.json(activeSurveys);
  } catch (error) {
    console.error('Error getting active surveys:', error);
    res.status(500).json({ status: false, error: error.message });
  }
});

// Get survey results
app.get('/surveys/:id/results', async (req, res) => {
  const surveyId = req.params.id;

  try {
    // Get survey details
    let survey;
    try {
      survey = await surveyCtr.methods.surveys(surveyId).call();
      if (!survey || !survey.title) {
        return res.json({
          surveyId: surveyId,
          title: `Survey ${surveyId}`,
          description: 'No description available',
          totalVotes: 0,
          results: []
        });
      }
    } catch (surveyErr) {
      console.error(`Error getting survey ${surveyId}:`, surveyErr);
      return res.json({
        surveyId: surveyId,
        title: `Survey ${surveyId}`,
        description: 'Error retrieving survey details',
        totalVotes: 0,
        results: []
      });
    }

    // Get options and votes directly from the contract
    let options = [], votes = [];
    try {
      const optionsResult = await surveyCtr.methods.getOptions(surveyId).call();

      // Handle different possible formats of the blockchain response
      if (optionsResult) {
        // Case 1: Response is an array with two elements
        if (Array.isArray(optionsResult) && optionsResult.length >= 2) {
          options = optionsResult[0] || [];
          votes = optionsResult[1] || [];
        }
        // Case 2: Response is an object with '0' and '1' properties
        else if (optionsResult['0'] && optionsResult['1']) {
          options = Array.isArray(optionsResult['0']) ? optionsResult['0'] : [];
          votes = Array.isArray(optionsResult['1']) ? optionsResult['1'] : [];
        }
      }

      // Convert votes to numbers and filter out invalid options
      options = options.filter(opt => opt && opt !== '');
      votes = votes.slice(0, options.length).map(v => BigInt(v || 0).toString());
    } catch (optionsErr) {
      console.error(`Error getting options and votes for survey ${surveyId}:`, optionsErr);
      options = [];
      votes = [];
    }

    // Calculate total votes
    const totalVotes = votes.reduce((sum, count) => sum + BigInt(count || 0), BigInt(0));

    // Format results with percentages
    const results = options.map((option, index) => {
      const voteCount = BigInt(votes[index] || 0);
      const percentage = totalVotes > 0 ?
        Number((voteCount * BigInt(1000) / totalVotes) / BigInt(10)) :
        0;

      return {
        option,
        votes: voteCount.toString(),
        percentage: percentage.toFixed(1)
      };
    });

    res.json({
      surveyId: surveyId,
      title: survey.title,
      description: survey.description || '',
      totalVotes: totalVotes.toString(),
      results
    });
  } catch (error) {
    console.error(`Error getting survey results for ${surveyId}:`, error);
    res.json({
      surveyId: surveyId,
      title: `Survey ${surveyId}`,
      description: 'Error retrieving survey details',
      totalVotes: 0,
      results: []
    });
  }
});

// Get remaining time for a survey
app.get('/surveys/:id/remaining', async (req, res) => {
  try {
    const remaining = await surveyCtr.methods.getRemainingTime(req.params.id).call();
    res.json({ remaining });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});







// ---------------- Decision API Routes ---------------- //
// Get active decisions
// TODO: Replace with Wassim's version. (with lower id range).
app.get('/api/decisions/active', async (req, res) => {
  try {
    if (!decisionVoting) {
      return res.status(500).json({ status: false, error: 'DecisionVoting contract not initialized' });
    }

    console.log('Getting active decisions...');

    const activeDecisions = [];
    const currentTime = Math.floor(Date.now() / 1000);

    // Get all decisions first
    let allDecisionsResponse;
    try {
      // Make an internal call to the getAllDecisions endpoint
      const allDecisionsUrl = `http://localhost:${process.env.PORT || 3001}/api/decisions`;
      const fetchResponse = await fetch(allDecisionsUrl);
      allDecisionsResponse = await fetchResponse.json();
    } catch (fetchErr) {
      console.error('Error fetching all decisions:', fetchErr);

      // If internal fetch fails, create a simplified version
      allDecisionsResponse = { status: false };
    }

    if (allDecisionsResponse && allDecisionsResponse.status && Array.isArray(allDecisionsResponse.data)) {
      // Filter decisions that are active
      console.log(`Filtering ${allDecisionsResponse.data.length} decisions for active status`);

      for (const decision of allDecisionsResponse.data) {
        try {
          // Calculate if active based on time and finalized status
          const startTime = parseInt(decision.startTime || '0');
          const endTime = parseInt(decision.endTime || '0');
          const isFinalized = decision.finalized === true;

          const isActive = currentTime >= startTime && currentTime <= endTime && !isFinalized;

          if (isActive) {
            activeDecisions.push(decision);
          }
        } catch (err) {
          console.error(`Error checking active status for decision ${decision.id}:`, err);
        }
      }
    } else {
      // Fallback: Check specific ranges only for active decisions
      console.log('Using fallback approach to find active decisions');

      // Use the defined ranges directly instead of binary search
      for (const range of decisionIdRanges) {
        console.log(`Checking range ${range.start}-${range.end} for active decisions...`);
        for (let id = range.start; id <= range.end; id++) {
          try {
            // Check if decision exists
            const exists = await decisionVoting.methods.decisionExists(id).call();
            if (!exists) continue;

            // Get decision details
            const decision = await decisionVoting.methods.decisions(id).call();

            // Calculate if active based on time and finalized status
            const startTime = parseInt(decision.startTime || '0');
            const duration = parseInt(decision.duration || '0');
            const endTime = startTime + duration;
            const isFinalized = decision.finalized;

            const isActive = currentTime >= startTime && currentTime <= endTime && !isFinalized;

            if (isActive) {
              activeDecisions.push({
                id: id,
                name: decision.name || `Decision ${id}`,
                description: decision.description || '',
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                duration: duration.toString(),
                creator: decision.creator,
                finalized: false,
                winningOption: ''
              });
            }
          } catch (err) {
            // Continue to next ID
            console.error('some error has occured getting active decisions: ', err)
          }
        }
      }
    }

    console.log(`Found ${activeDecisions.length} active decisions`);

    res.json({
      status: true,
      data: activeDecisions
    });
  } catch (err) {
    console.error('Error getting active decisions:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Get all decisions
// TODO: Replace with Wassim's version (with lower id range).
app.get('/api/decisions', async (req, res) => {
  try {
    if (!decisionVoting) {
      return res.status(500).json({ status: false, error: 'DecisionVoting contract not initialized' });
    }

    console.log('Getting all decisions...');

    let decisions = [];

    // Store found decision IDs to avoid duplicates
    const foundIds = new Set();

    // Use the shared decisionIdRanges to check for decisions
    for (const range of decisionIdRanges) {
      console.log(`Checking decision ID range ${range.start}-${range.end}...`);

      // Use parallel promises for efficiency
      const promises = [];

      for (let id = range.start; id <= range.end; id++) {
        // Skip IDs we've already found
        if (foundIds.has(id)) continue;

        promises.push((async () => {
          try {
            // Check if decision exists
            const exists = await decisionVoting.methods.decisionExists(id).call();
            if (!exists) return null;

            // Get decision details
            const decision = await decisionVoting.methods.decisions(id).call();

            // Calculate end time properly 
            const startTime = parseInt(decision.startTime || '0');
            const duration = parseInt(decision.duration || '0');
            const endTime = startTime + duration;
            
            // Check if the duration is zero - meaning it might store endTime directly
            let calculatedEndTime = endTime;
            if (duration === 0 && decision.endTime) {
              calculatedEndTime = parseInt(decision.endTime);
            }

            return {
              id: id,
              name: decision.name || `Decision ${id}`,
              description: decision.description || '',
              startTime: startTime.toString(),
              endTime: calculatedEndTime.toString(),
              duration: duration.toString(),
              creator: decision.creator,
              finalized: decision.finalized,
              winningOption: decision.winningOption || ''
            };
          } catch (err) {
            // Just return null on error
            return null;
          }
        })());
      }

      // Wait for all promises to resolve
      const rangeResults = await Promise.all(promises);

      // Add valid decisions from this range
      const validResults = rangeResults.filter(result => result !== null);
      decisions = decisions.concat(validResults);

      // Update set of found IDs
      validResults.forEach(decision => foundIds.add(parseInt(decision.id)));

      console.log(`Found ${validResults.length} valid decisions in range ${range.start}-${range.end}`);
    }

    console.log(`Found ${decisions.length} total valid decisions`);

    // Sort decisions by ID
    decisions.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    // Wrap the response with status to match the expected format
    res.json({
      status: true,
      data: decisions
    });
  } catch (err) {
    console.error('Error getting decisions:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Get Decision by decisionId
app.get('/api/decisions/:decisionId', async (req, res) => {
  try {
    const { decisionId } = req.params;

    // Check if the decision exists
    const exists = await decisionVoting.methods.decisionExists(decisionId).call();
    if (!exists) {
      return res.status(404).json({
        status: false,
        error: `Decision with ID ${decisionId} does not exist`
      });
    }

    const decision = await decisionVoting.methods.decisions(decisionId).call();

    // Calculate end time correctly based on start time and duration
    const startTime = parseInt(decision.startTime || '0');
    const duration = parseInt(decision.duration || '0');
    const endTime = startTime + duration;
    
    // Check if the duration is zero - meaning it might store endTime directly
    let calculatedEndTime = endTime;
    if (duration === 0 && decision.endTime) {
      calculatedEndTime = parseInt(decision.endTime);
    }

    res.json({
      status: true,
      data: {
        id: decisionId,
        name: decision.name,
        description: decision.description,
        startTime: startTime.toString(),
        endTime: calculatedEndTime.toString(),
        duration: duration.toString(),
        creator: decision.creator,
        finalized: decision.finalized,
        winningOption: decision.winningOption || ''
      }
    });
  } catch (err) {
    console.error(`Error getting decision ${req.params.decisionId}:`, err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Endpoint to get a decision's whitelist
app.get('/api/decisions/:decisionId/whitelist', async (req, res) => {
  try {
    const { decisionId } = req.params;

    let whitelist = [];

    // First try to get whitelist from our memory cache
    if (decisionWhiteLists[decisionId]) {
      console.log(`Using cached whitelist for decision ${decisionId}`);
      whitelist = decisionWhiteLists[decisionId];
    } else {
      // If not in cache, try to get from contract if it has the method
      try {
        console.log(`Fetching whitelist for decision ${decisionId} from contract`);
        whitelist = await decisionVoting.methods.getWhitelist(decisionId).call();

        // Store in our cache for future use
        decisionWhiteLists[decisionId] = whitelist.map(addr => normalizeAddress(addr));
      } catch (err) {
        console.log(`Contract doesn't expose whitelist for ${decisionId}, or other error:`, err.message);
      }
    }

    res.json({
      status: true,
      data: whitelist
    });
  } catch (err) {
    console.error(`Error getting whitelist for decision ${req.params.decisionId}:`, err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Check if the user is whitelisted.
app.get('/api/decisions/:decisionId/whitelist/:userAddress', async (req, res) => {
  try {
    const { decisionId, userAddress } = req.params;

    // Normalize user address for comparison
    const normalizedUserAddress = normalizeAddress(userAddress);

    console.log(`Checking whitelist for decision ${decisionId}, address: ${normalizedUserAddress}`);

    let isWhitelisted = false;

    try {
      // Try direct isWhitelisted method first - this is the most reliable way
      isWhitelisted = await decisionVoting.methods.isWhitelisted(decisionId, normalizedUserAddress).call();
      console.log(`Direct contract check: User ${normalizedUserAddress} is ${isWhitelisted ? '' : 'not '}whitelisted for decision ${decisionId}`);
    } catch (contractErr) {
      console.error(`Error checking whitelist via contract for decision ${decisionId}:`, contractErr.message);

      // Fallback to memory-stored whitelist
      if (decisionWhiteLists[decisionId]) {
        isWhitelisted = decisionWhiteLists[decisionId].some(addr => normalizeAddress(addr) === normalizedUserAddress);
        console.log(`Memory check: User ${normalizedUserAddress} is ${isWhitelisted ? '' : 'not '}in whitelist for decision ${decisionId}`);
      }
    }

    // Check if the user is creator (creators are always whitelisted)
    if (!isWhitelisted) {
      try {
        const decision = await decisionVoting.methods.getDecision(decisionId).call();
        if (decision && decision.creator) {
          const creatorAddress = normalizeAddress(decision.creator);
          if (creatorAddress === normalizedUserAddress) {
            console.log(`User ${normalizedUserAddress} is the creator of decision ${decisionId}, treating as whitelisted`);
            isWhitelisted = true;
          }
        }
      } catch (creatorErr) {
        console.error(`Error checking creator for decision ${decisionId}:`, creatorErr.message);
      }
    }

    console.log(`Final whitelist status for decision ${decisionId}, user ${normalizedUserAddress}: ${isWhitelisted}`);

    // IMPORTANT: Return a consistent object format that frontend expects
    return res.json({
      status: true,
      data: {
        whitelisted: isWhitelisted
      }
    });
  } catch (error) {
    console.error(`Error in whitelist check:`, error);
    return res.status(500).json({
      status: false,
      error: `Failed to check whitelist status: ${error.message}`
    });
  }
});

// Checking Vote Status for user's wallet address.
app.get('/api/decisions/:decisionId/voted/:userAddress', async (req, res) => {
  try {
    const { decisionId, userAddress } = req.params;

    const hasVoted = await decisionVoting.methods.hasVoted(decisionId, userAddress).call();

    res.json({
      status: true,
      data: {
        voted: hasVoted
      }
    });
  } catch (err) {
    console.error(`Error checking vote status for user ${req.params.userAddress} on decision ${req.params.decisionId}:`, err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Activate decision with decisionId
app.get('/api/decisions/:decisionId/active', async (req, res) => {
  try {
    const { decisionId } = req.params;

    // First try to get decision details to calculate active status
    const decision = await decisionVoting.methods.decisions(decisionId).call();
    const currentTime = Math.floor(Date.now() / 1000);

    // Calculate if active based on time and finalized status
    const startTime = parseInt(decision.startTime || '0');
    const endTime = parseInt(decision.endTime || '0');
    const isFinalized = decision.finalized;

    // A decision is active if:
    // 1. Current time is after start time
    // 2. Current time is before end time
    // 3. The decision has not been finalized
    const isActive = currentTime >= startTime && currentTime <= endTime && !isFinalized;

    console.log(`Decision ${decisionId} active status check:`, {
      currentTime,
      startTime,
      endTime,
      isFinalized,
      isActive
    });

    // Return a consistent format
    res.json({
      status: true,
      data: {
        active: isActive
      }
    });
  } catch (err) {
    console.error(`Error checking if decision ${req.params.decisionId} is active:`, err);

    // Try fallback approach if the decision retrieval failed
    try {
      // Just check if the decision exists and if there's remaining time
      const exists = await decisionVoting.methods.decisionExists(req.params.decisionId).call();
      if (!exists) {
        return res.json({ status: true, data: { active: false } });
      }

      // Check if there's remaining time
      const currentTime = Math.floor(Date.now() / 1000);
      const decision = await decisionVoting.methods.getDecision(req.params.decisionId).call();
      if (decision) {
        const endTime = parseInt(decision.endTime || '0');
        const isActive = currentTime <= endTime && currentTime >= parseInt(decision.startTime || '0') && !decision.finalized;
        return res.json({ status: true, data: { active: isActive } });
      }
    } catch (fallbackErr) {
      console.error('Error in fallback active check:', fallbackErr);
    }

    res.status(500).json({ status: false, error: err.message });
  }
});

// Get Decision remaining-time using decisionId
app.get('/api/decisions/:decisionId/remaining-time', async (req, res) => {
  try {
    const { decisionId } = req.params;

    // Check if the decision exists
    const exists = await decisionVoting.methods.decisionExists(decisionId).call();
    if (!exists) {
      return res.status(404).json({
        status: false,
        error: `Decision with ID ${decisionId} does not exist`,
        data: { remainingTime: 0 }
      });
    }

    const decision = await decisionVoting.methods.decisions(decisionId).call();

    // Check if the decision is already finalized
    if (decision.finalized) {
      return res.json({
        status: true,
        data: {
          remainingTime: 0,
          isFinalized: true
        }
      });
    }

    // Calculate remaining time properly
    const currentTime = Math.floor(Date.now() / 1000);
    const decisionStartTime = parseInt(decision.startTime || '0');
    const decisionEndTime = parseInt(decision.endTime || '0');
    const remainingTime = Math.max(0, decisionEndTime - currentTime);

    // Check if decision has started
    const hasStarted = currentTime >= decisionStartTime;

    res.json({
      status: true,
      data: {
        remainingTime: remainingTime,
        hasStarted: hasStarted,
        isFinalized: false,
        startTime: decisionStartTime,
        endTime: decisionEndTime,
        currentTime: currentTime
      }
    });
  } catch (err) {
    console.error(`Error getting remaining time for decision ${req.params.decisionId}:`, err);
    res.status(500).json({
      status: false,
      error: err.message,
      data: { remainingTime: 0 }
    });
  }
});

// Vote on decision
app.post('/api/decisions/:decisionId/vote', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { optionIndex, voter } = req.body;

    if (!voter) {
      return res.status(400).json({ status: false, error: 'Voter address is required' });
    }

    const receipt = await decisionVoting.methods.vote(decisionId, optionIndex).send({ from: voter, gas: 500000 });

    res.json({
      status: true,
      data: {
        transactionHash: receipt.transactionHash
      }
    });
  } catch (err) {
    console.error(`Error voting on decision ${req.params.decisionId}:`, err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Finalize(end) Decision with decisionId
app.post('/api/decisions/:decisionId/finalize', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { admin } = req.body;

    if (!admin) {
      return res.status(400).json({ status: false, error: 'Admin address is required' });
    }

    console.log(`Finalizing decision ${decisionId} by admin ${admin}...`);

    // Call the finalizeDecision method on the contract
    const receipt = await decisionVoting.methods.finalizeDecision(decisionId).send({ from: admin, gas: 500000 });

    console.log(`Decision ${decisionId} finalized successfully, transaction hash: ${receipt.transactionHash}`);

    // Get decision details to retrieve the winning option
    let winningOption = "";
    try {
      // Try to get the decision after finalization to get the winning option
      const decision = await decisionVoting.methods.decisions(decisionId).call();
      winningOption = decision.winningOption;

      console.log(`Winning option for decision ${decisionId}: ${winningOption}`);
    } catch (detailsError) {
      console.error(`Error getting winning option for decision ${decisionId}:`, detailsError);

      // Try alternative method using getDecisionDetails if available
      try {
        const details = await decisionVoting.methods.getDecisionDetails(decisionId).call();
        winningOption = details.winningOption;
        console.log(`Retrieved winning option using getDecisionDetails: ${winningOption}`);
      } catch (altError) {
        console.error(`Alternative method also failed:`, altError);
        // Just continue without the winning option if both methods fail
      }
    }

    res.json({
      status: true,
      data: {
        transactionHash: receipt.transactionHash,
        winningOption: winningOption
      }
    });
  } catch (err) {
    console.error(`Error finalizing decision ${req.params.decisionId}:`, err);
    res.status(500).json({ status: false, error: err.message });
  }
});

// Get Decision Results.
app.get('/api/decisions/:decisionId/results', async (req, res) => {
  try {
    const { decisionId } = req.params;

    // Verify decision exists
    const exists = await decisionVoting.methods.decisionExists(decisionId).call();
    if (!exists) {
      return res.status(404).json({
        status: false,
        error: `Decision ID ${decisionId} does not exist`,
        options: [],
        votes: []
      });
    }

    // Get decision details
    const decision = await decisionVoting.methods.decisions(decisionId).call();

    // Use the getResults method from the contract
    const resultsData = await decisionVoting.methods.getResults(decisionId).call();

    // Extract options and votes from the returned object
    const options = resultsData['0'] || resultsData.options || [];
    const votesCounts = resultsData['1'] || resultsData.counts || [];

    // Format the response like survey results
    res.json({
      surveyId: decisionId,
      title: decision.name,
      description: decision.description || '',
      options: options,
      votes: votesCounts.map(vote => vote.toString()),
      finalized: decision.finalized,
      winningOption: decision.winningOption,
      totalVotes: votesCounts.reduce((sum, count) => sum + parseInt(count), 0).toString(),
      results: options.map((option, index) => {
        const voteCount = parseInt(votesCounts[index] || 0);
        const total = votesCounts.reduce((sum, count) => sum + parseInt(count), 0);
        const percentage = total > 0 ? (voteCount * 100 / total).toFixed(1) : '0.0';

        return {
          option,
          votes: voteCount.toString(),
          percentage
        };
      }),
      status: true
    });
  } catch (err) {
    console.error(`Error getting results for decision ${req.params.decisionId}:`, err);
    res.status(500).json({
      status: false,
      error: err.message,
      options: [],
      votes: [],
      results: []
    });
  }
});

// Create a Decision
app.post('/api/decisions/create', async (req, res) => {
  try {
    const { id, name, description, durationMinutes, options, whitelist, creator } = req.body;

    if (!id || !name || !description || !durationMinutes || !options || !whitelist || !creator) {
      return res.status(400).json({ status: false, error: 'Missing required parameters' });
    }

    console.log('Creating decision with params:', {
      id, name, description, durationMinutes,
      options: options.length,
      whitelist: whitelist.length,
      creator
    });

    // Store whitelist in memory for later access
    const normalizedWhitelist = whitelist.map(addr => normalizeAddress(addr));
    decisionWhiteLists[id] = normalizedWhitelist;
    console.log(`Storing whitelist for decision ${id}:`, normalizedWhitelist);

    // Check if decision with this ID already exists
    try {
      const exists = await decisionVoting.methods.decisionExists(id).call();
      if (exists) {
        console.log(`Decision ID ${id} already exists`);
        return res.status(409).json({
          status: false,
          error: `Decision ID ${id} already exists. Please use a different ID.`
        });
      }
    } catch (checkErr) {
      console.warn(`Error checking if decision ${id} exists:`, checkErr);
      // Continue with creation as the check failed, but the main function might still work
    }

    // Create the decision with all parameters at once
    const receipt = await decisionVoting.methods.createDecision(
      id,
      name,
      description,
      durationMinutes,
      options,
      whitelist
    ).send({ from: creator, gas: 3000000 });

    console.log('Decision created successfully:', receipt.transactionHash);

    // Get the current time and calculate proper start and end times
    const currentTime = Math.floor(Date.now() / 1000);
    const durationSeconds = durationMinutes * 60;
    const endTime = currentTime + durationSeconds;

    res.json({
      status: true,
      data: {
        transactionHash: receipt.transactionHash,
        decision: {
          id,
          name,
          description,
          durationMinutes,
          startTime: currentTime.toString(),
          endTime: endTime.toString(),
          optionsCount: options.length,
          whitelistCount: whitelist.length
        }
      }
    });
  } catch (err) {
    console.error('Error creating decision:', err);

    // Check for the specific "Decision ID already exists" error
    if (err.message.includes('ID already exists') ||
      (err.cause && err.cause.message && err.cause.message.includes('ID already exists'))) {
      return res.status(409).json({
        status: false,
        error: `Decision ID ${req.body.id} already exists. Please use a different ID.`
      });
    }

    res.status(500).json({ status: false, error: err.message });
  }
});

// ---------------- Start Server ---------------- //
async function startServer() {
  const initialized = await initializeContracts();
  if (!initialized) {
    console.error('Failed to initialize contracts. Exiting...');
    process.exit(1);
  }

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
}

startServer();
