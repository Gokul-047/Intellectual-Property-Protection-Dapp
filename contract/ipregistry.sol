 // SPDX-License-Identifier: MIT 
 pragma solidity ^0.8.30; 
 contract IPRegistry { 
  uint256 private _nextId; 
  enum IPType { Patent, Copyright, Trademark, Other } 
 struct IPRecord { 
  uint256 id; 
  IPType ipType; 
  string title; 
  string metadata;  
  address owner; 
  uint256 timestamp; 
  bool active; 
 } 
 // Transfer entry to keep a history of owners 
  struct TransferEntry { 
  address from; 
  address to; 
  uint256 timestamp; 
 } 
 // id => record 
 mapping(uint256 => IPRecord) private records; 
 // id => transfer history 
 mapping(uint256 => TransferEntry[]) private history; 
 // owner => list of owned ip ids 
 mapping(address => uint256[]) private ownerToIds; 
 // Events 
 event IPRegistered(uint256 indexed id, address indexed owner, IPType ipType, 
 string title); 
 event IPTransferred(uint256 indexed id, address indexed from, address indexed to); 
 event IPUpdated(uint256 indexed id, address indexed owner);  
 constructor() { 
  _nextId = 1; // start ids at 1 
 } 
 modifier onlyOwner(uint256 id) { 
  require(records[id].owner == msg.sender, "Not the IP owner"); 
  _; 
 } 
 // Register new IP on-chain. `metadata` should be a pointer (IPFS hash) or description. 
 function registerIP(IPType ipType, string calldata title, string calldata metadata) 
 external returns (uint256) { 
  uint256 id = _nextId++; 
  records[id] = IPRecord({ 
  id: id, 
  ipType: ipType, 
  title: title, 
  metadata: metadata, 
  owner: msg.sender, 
  timestamp: block.timestamp, 
  active: true 
  }); 
  ownerToIds[msg.sender].push(id); 
  // initial transfer entry (from = 0) 
  history[id].push(TransferEntry({from: address(0), to: msg.sender, timestamp: 
  block.timestamp})); 
  emit IPRegistered(id, msg.sender, ipType, title); 
  return id; 
 } 
 // Transfer ownership of an IP to `newOwner` (must be called by current owner) 
 function transferOwnership(uint256 id, address newOwner) external onlyOwner(id) { 
  require(newOwner != address(0), "Invalid new owner"); 
  address previous = records[id].owner; 
  records[id].owner = newOwner; 
  history[id].push(TransferEntry({from: previous, to: newOwner, timestamp: 
  block.timestamp})); 
  // add id to new owner's list 
  ownerToIds[newOwner].push(id); 
  emit IPTransferred(id, previous, newOwner); 
 } 
 // Update metadata/title of an IP (only owner) 
 function updateIP(uint256 id, string calldata newTitle, string calldata newMetadata) 
  external onlyOwner(id) { 
  records[id].title = newTitle; 
  records[id].metadata = newMetadata; 
  emit IPUpdated(id, msg.sender); 
 } 
 // Returns basic info about an IP 
 function getIP(uint256 id) external view returns (uint256, IPType, string memory, 
  string memory, address, uint256, bool) { 
  IPRecord storage r = records[id]; 
  return (r.id, r.ipType, r.title, r.metadata, r.owner, r.timestamp, r.active); 
 } 
 // Returns the ownership transfers history for an IP id 
 function getHistory(uint256 id) external view returns (TransferEntry[] memory) { 
  return history[id]; 
 } 
 // Verify if `addr` is current owner of IP `id` 
 function verifyOwnership(uint256 id, address addr) external view returns (bool) { 
  return records[id].owner == addr && records[id].active; 
 } 
 // Returns list of IP ids owned by `owner` 
 function listOwnedBy(address owner) external view returns (uint256[] memory) { 
  return ownerToIds[owner]; 
 } 
} 