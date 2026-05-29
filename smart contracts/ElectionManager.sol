// ElectionManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ElectionManager {
    struct Election {
        string name;
        uint64 startTime;     // Reduced from uint256 to uint64
        uint64 duration;      // Reduced from uint256 to uint64
        bool active;
        string ipfsHash;
    }

    address public admin;
    mapping(string => Election) internal elections;
    // Use nested mappings for O(1) candidate/country lookups instead of arrays
    mapping(string => mapping(string => bool)) internal isCandidateValid;
    mapping(string => mapping(string => bool)) internal isCountryEligible;
    // Keep arrays for enumeration
    mapping(string => string[]) internal candidates;
    mapping(string => string[]) internal eligibleCountries;

    event ElectionCreated(string indexed id, string name, uint64 duration, string ipfsHash);
    event ElectionActivated(string indexed id, uint64 startTime);
    event ElectionEnded(string indexed id);
    event CandidateAdded(string indexed id, string candidate);
    event CountryAdded(string indexed id, string country);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier exists(string calldata id) {
        require(bytes(elections[id].name).length > 0, "Election does not exist");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createElection(
        string calldata id,
        string calldata name,
        uint64 duration,
        string calldata ipfsHash
    ) external onlyAdmin {
        require(bytes(elections[id].name).length == 0, "Election ID already exists");
        require(duration > 0, "Duration must be > 0");
        elections[id] = Election(name, 0, duration, false, ipfsHash);
        emit ElectionCreated(id, name, duration, ipfsHash);
    }

    function activateElection(string calldata id) external onlyAdmin exists(id) {
        Election storage e = elections[id];
        require(!e.active, "Election already active");
        e.startTime = uint64(block.timestamp);
        e.active = true;
        emit ElectionActivated(id, e.startTime);
    }

    function endElection(string calldata id) external onlyAdmin exists(id) {
        Election storage e = elections[id];
        require(e.active, "Election not active");
        e.active = false;
        emit ElectionEnded(id);
    }

    function addCandidate(string calldata id, string calldata candidate) external onlyAdmin exists(id) {
        Election memory e = elections[id];
        require(!e.active, "Cannot add candidate to active election");
        require(!isCandidateValid[id][candidate], "Candidate already exists");
        
        candidates[id].push(candidate);
        isCandidateValid[id][candidate] = true;
        emit CandidateAdded(id, candidate);
    }

    function addEligibleCountry(string calldata id, string calldata country) external onlyAdmin exists(id) {
        Election memory e = elections[id];
        require(!e.active, "Cannot add country to active election");
        require(!isCountryEligible[id][country], "Country already added");
        
        eligibleCountries[id].push(country);
        isCountryEligible[id][country] = true;
        emit CountryAdded(id, country);
    }

    function isElectionActive(string calldata id) public view exists(id) returns (bool) {
        Election memory e = elections[id];
        if (!e.active) return false;
        if (block.timestamp > e.startTime + e.duration) return false;
        return true;
    }

    function getRemainingTime(string calldata id) external view exists(id) returns (uint64) {
        if (!isElectionActive(id)) return 0;
        Election memory e = elections[id];
        return uint64((e.startTime + e.duration) - block.timestamp);
    }

    function getEndTime(string calldata id) external view exists(id) returns (uint64) {
        Election memory e = elections[id];
        if (e.startTime == 0) return 0;
        return e.startTime + e.duration;
    }

    function getCandidates(string calldata id) external view exists(id) returns (string[] memory) {
        return candidates[id];
    }

    function getEligibleCountries(string calldata id) external view exists(id) returns (string[] memory) {
        return eligibleCountries[id];
    }

    function isCandidateInElection(string calldata id, string calldata candidate) external view exists(id) returns (bool) {
        return isCandidateValid[id][candidate];
    }

    function getElection(
        string calldata id
    ) external view exists(id) returns (
        string memory name,
        uint64 startTime,
        uint64 duration,
        bool active,
        string memory ipfsHash
    ) {
        Election memory e = elections[id];
        return (e.name, e.startTime, e.duration, e.active, e.ipfsHash);
    }
}