// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import contract_abi from "./abi.js";
import { CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID } from "./config";

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [connected, setConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [statusMsgs, setStatusMsgs] = useState({});
  const [isTxPending, setIsTxPending] = useState(false);

  // form state
  const [ipType, setIpType] = useState(0);
  const [ipTitle, setIpTitle] = useState("");
  const [ipDes, setIpDes] = useState("");
  const [viewId, setViewId] = useState("");
  const [viewResult, setViewResult] = useState("");
  const [historyId, setHistoryId] = useState("");
  const [historyResult, setHistoryResult] = useState("");
  const [transferId, setTransferId] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [updateId, setUpdateId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newMetadata, setNewMetadata] = useState("");
  const [verifyId, setVerifyId] = useState("");
  const [verifyAddr, setVerifyAddr] = useState("");

  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractRef = useRef(null);

  useEffect(() => {
    // setup listeners
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (!accounts || accounts.length === 0) {
          setWalletAddress("");
          setConnected(false);
        } else {
          setWalletAddress(accounts[0]);
          setConnected(true);
        }
      });
      window.ethereum.on("chainChanged", (chain) => {
        // refresh connection on chain change
        setChainId(chain);
        // clear contract ref, require reconnect
        contractRef.current = null;
        setStatus("wallet", `Chain changed: ${chain}. Reconnect to load contract.`, "orange");
      });
    }
    return () => {
      try {
        window.ethereum?.removeListener?.("accountsChanged", () => {});
        window.ethereum?.removeListener?.("chainChanged", () => {});
      } catch (e) {}
    };
  }, []);

  function setStatus(section, text, color = "black") {
    setStatusMsgs(prev => ({ ...prev, [section]: { text, color } }));
  }

  // safe helper: get the contract address for the current chain


  // verify address is a contract (not EOA)
  async function verifyAddressIsContract(address) {
    const provider = providerRef.current;
    if (!provider) return false;
    try {
      const code = await provider.getCode(address);
      return code && code !== "0x" && code !== "0x0";
    } catch (e) {
      console.error("getCode failed", e);
      return false;
    }
  }
  // ---- Gas Checker ----
  async function hasEnoughGas(estimatedGas) {
   try {
    const signer = signerRef.current;
    const provider = providerRef.current;
    if (!signer || !provider) return false;

    const addr = await signer.getAddress();
    const balance = await provider.getBalance(addr);

    // get gas price / fee data
    const feeData = await provider.getFeeData();
    const gasPrice =
      feeData.maxFeePerGas ||
      feeData.gasPrice ||
      ethers.parseUnits("10", "gwei");

    // estimatedGas = normal number → convert to BigInt
    const gasCost = BigInt(estimatedGas) * BigInt(gasPrice);

    return balance >= gasCost;
   } catch (e) {
    console.error("hasEnoughGas error:", e);
    return false;
   }
  }


  // ---- Chain Validator ----
function isCorrectChain(chainId) {
  if (!chainId) return false;

  const normalized = chainId.toLowerCase();

  // Accept both hex and decimal, just in case
  return (
    normalized === "0xaa36a7" ||   // Normal MetaMask hex
    normalized === "11155111"      // Some browsers return decimal
  );
}

// ---- Connect Wallet ----
async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("Please install MetaMask to continue.");
      return;
    }

    // Request accounts
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await window.ethereum.request({method: "wallet_switchEthereumChain",params: [{ chainId: "0xaa36a7" }]
    });


    const provider = new ethers.BrowserProvider(window.ethereum);
    providerRef.current = provider;

    const signer = await provider.getSigner();
    signerRef.current = signer;

    // Get chainId from MetaMask
    const chain = await window.ethereum.request({ method: "eth_chainId" });
    console.log("Raw chainId from MetaMask:", chain);
    setChainId(chain);

    const userAddr = await signer.getAddress();
    setWalletAddress(userAddr);
    setConnected(true);

    // 🔒 Allow ONLY Sepolia network
    if (!isCorrectChain(chain)) {
      setStatus(
        "wallet",
        "❌ Please switch MetaMask to **Sepolia Testnet** to use this DApp.",
        "red"
      );
      contractRef.current = null; // clear contract
      return;
    }

    // Use your fixed Sepolia contract address
    const contractAddr = CONTRACT_ADDRESS;

    // Verify address is actually a contract
    const isContract = await verifyAddressIsContract(contractAddr);
    if (!isContract) {
      setStatus(
        "wallet",
        `❌ Address ${contractAddr} is NOT a contract on Sepolia.`,
        "red"
      );
      return;
    }

    // Create contract instance
    contractRef.current = new ethers.Contract(
      contractAddr,
      contract_abi,
      signer
    );

    console.log("Contract loaded:", contractAddr);

  } catch (err) {
    console.error("connectWallet Error:", err);
    setStatus("wallet", `❌ Wallet connection failed: ${err.message}`, "red");
  }
  }
  // ---- Unified Error Handler ----
  function handleError(err, section) {
  console.error(err);

  let msg = "Unexpected error.";

  if (err?.reason) msg = err.reason;
  else if (err?.message) {
    if (err.message.includes("insufficient funds"))
      msg = "Insufficient funds — top up Sepolia ETH.";
    else msg = err.message;
  }

  setStatus(section, msg, "red");
  }

  async function registerIP() {
  if (!ipTitle.trim() || !ipDes.trim()) {
    setStatus("register", "Please fill in title and description.", "red");
    return;
  }

  if (!contractRef.current) {
    setStatus(
      "register",
      "Contract not loaded. Connect wallet and ensure you are on the right network.",
      "red"
    );
    return;
  }

  try {
    setIsTxPending(true);
    setStatus("register", "Preparing transaction...", "#666");

    // 👉 FIX: Ethers v6 gas estimation syntax
    const estimated = await contractRef.current.registerIP.estimateGas(
      Number(ipType),
      ipTitle.trim(),
      ipDes.trim()
    );

    const hasGas = await hasEnoughGas(Number(estimated));
    if (!hasGas) {
      setIsTxPending(false);
      setStatus("register", "Insufficient funds for gas.", "red");
      return;
    }

    // 👉 Send transaction
    const tx = await contractRef.current.registerIP(
      Number(ipType),
      ipTitle.trim(),
      ipDes.trim()
    );

    setStatus("register", "Transaction sent — waiting for confirmation...", "#666");

    // Wait for confirmation
    const receipt = await tx.wait();

    // 👉 Extract new IP ID from event logs
    // Your solidity event should emit (id, owner, ...)
    let newId = null;

    if (receipt && receipt.logs && receipt.logs.length > 0) {
      try {
        // ethers v6 event parsing
        const eventFrag = contractRef.current.interface.getEvent("IPRegistered");
        const log = receipt.logs.find(l => l.fragment?.name === "IPRegistered");

        if (log) {
          const parsed = contractRef.current.interface.decodeEventLog(
            eventFrag,
            log.data,
            log.topics
          );
          newId = parsed.id?.toString();
        }
      } catch (e) {
        console.warn("Could not parse event log:", e);
      }
    }

    // fallback if no event detected
    if (!newId) newId = "(unknown)";

    // 👉 final success message with ID shown
    setStatus("register", `ID ${newId} Registered successfully!`, "green");

    // clear fields
    setIpTitle("");
    setIpDes("");

  } catch (err) {
    handleError(err, "register");
  } finally {
    setIsTxPending(false);
  }
}

  // View IP
  async function viewIP() {
    if (!viewId.trim()) {
      setViewResult("Please enter an IP ID.");
      return;
    }
    if (!contractRef.current) {
      setStatus("view", "Contract not loaded.", "red");
      return;
    }
    try {
      const ip = await contractRef.current.getIP(viewId.trim());
      const typeName = ["Patent", "Copyright", "Trademark", "Other"][Number(ip[1])];
      const output = `ID: ${ip[0]}\nType: ${typeName}\nTitle: ${ip[2]}\nMetadata: ${ip[3]}\nOwner: ${ip[4]}\nCreated: ${new Date(Number(ip[5]) * 1000).toLocaleString()}\nActive: ${ip[6]}`;
      setViewResult(output);
    } catch (err) {
      handleError(err, "view");
    }
  }

  async function transferIP() {
  if (!transferId.trim() || !newOwner.trim()) {
    setStatus("transfer", "Please provide both IP ID and new owner.", "red");
    return;
  }

  if (!contractRef.current) {
    setStatus("transfer", "Contract not loaded.", "red");
    return;
  }

  try {
    setIsTxPending(true);
    setStatus("transfer", "Estimating gas...", "#666");

    // 👉 FIX: ethers v6 estimateGas syntax
    const estimated = await contractRef.current.transferOwnership.estimateGas(
      transferId.trim(),
      newOwner.trim()
    );

    const hasGas = await hasEnoughGas(Number(estimated));
    if (!hasGas) {
      setIsTxPending(false);
      setStatus("transfer", "Insufficient funds to cover gas.", "red");
      return;
    }

    // 👉 Send transaction
    const tx = await contractRef.current.transferOwnership(
      transferId.trim(),
      newOwner.trim()
    );

    setStatus("transfer", "Transaction pending...", "#666");

    const receipt = await tx.wait();

    // 👉 Extract event for clarity (if exists)
    let finalId = transferId.trim();
    let finalOwner = newOwner.trim();

    try {
      const eventFrag = contractRef.current.interface.getEvent(
        "OwnershipTransferred"
      );

      const log = receipt.logs.find(
        (l) => l.fragment?.name === "OwnershipTransferred"
      );

      if (log) {
        const parsed = contractRef.current.interface.decodeEventLog(
          eventFrag,
          log.data,
          log.topics
        );

        // parsed.from / parsed.to / parsed.id
        if (parsed.id) finalId = parsed.id.toString();
        if (parsed.to) finalOwner = parsed.to;
      }
    } catch (e) {
      console.warn("OwnershipTransferred event not parsed:", e);
    }

    // 👉 Success message with ID and new owner
    setStatus(
      "transfer",
      `ID ${finalId} transferred to ${finalOwner}`,
      "green"
    );
  } catch (err) {
    handleError(err, "transfer");
  } finally {
    setIsTxPending(false);
  }
}


  // Update IP
async function updateIP() {
  if (!updateId.trim() || !newTitle.trim() || !newMetadata.trim()) {
    setStatus("update", "Fill all fields.", "red");
    return;
  }

  if (!contractRef.current) {
    setStatus("update", "Contract not loaded.", "red");
    return;
  }

  try {
    setIsTxPending(true);
    setStatus("update", "Preparing update transaction...", "#666");

    // 👉 FIX: ethers v6 gas estimation
    const estimated = await contractRef.current.updateIP.estimateGas(
      Number(updateId.trim()),
      newTitle.trim(),
      newMetadata.trim()
    );

    if (!await hasEnoughGas(Number(estimated))) {
      setIsTxPending(false);
      setStatus("update", "Insufficient funds for gas.", "red");
      return;
    }

    // 👉 send actual transaction
    const tx = await contractRef.current.updateIP(
      Number(updateId.trim()),
      newTitle.trim(),
      newMetadata.trim()
    );

    setStatus("update", "Transaction sent — waiting for confirmation...", "#666");
    await tx.wait();

    // 👉 SUCCESS MESSAGE WITH ID INCLUDED
    setStatus("update", `ID ${updateId.trim()} updated successfully.`, "green");

  } catch (err) {
    handleError(err, "update");
  } finally {
    setIsTxPending(false);
  }
}


  async function verifyOwner() {
    if (!verifyId.trim() || !verifyAddr.trim()) {
      setStatus("verify", "Provide ID and address.", "red");
      return;
    }
    if (!contractRef.current) { setStatus("verify", "Contract not loaded.", "red"); return; }
    try {
      const res = await contractRef.current.verifyOwnership(verifyId.trim(), verifyAddr.trim());
      setStatus("verify", res ? "Address IS owner." : "Address is NOT owner.", res ? "green" : "red");
    } catch (err) {
      handleError(err, "verify");
    }
  }

  async function viewHistory() {
    if (!historyId.trim()) { setHistoryResult("Provide an IP ID."); return; }
    if (!contractRef.current) { setStatus("history", "Contract not loaded.", "red"); return; }
    try {
      const entries = await contractRef.current.getHistory(historyId.trim());
      if (!entries?.length) { setHistoryResult("No history."); return; }
      let out = "";
      entries.forEach((h, i) => {
        out += `#${i+1} From: ${h.from} → To: ${h.to} at ${new Date(Number(h.timestamp) * 1000).toLocaleString()}\n\n`;
      });
      setHistoryResult(out);
    } catch (err) {
      handleError(err, "history");
    }
  }

  return (
    <div className="app-root">
      <h1>🔗 Intellectual Property Registry DApp</h1>
      <div className="container">
        <div className="wallet">
          <button onClick={connectWallet} disabled={connected}>
            {connected ? "✅ Connected" : "Connect MetaMask"}
          </button>
          <div id="walletAddress">{walletAddress ? <span>Address: <b>{walletAddress}</b></span> : null}</div>
          {statusMsgs.wallet && <p style={{ color: statusMsgs.wallet.color }}>{statusMsgs.wallet.text}</p>}
        </div>

        <section className="section">
          <h3>Register New IP</h3>
          <label>Type:</label>
          <select value={ipType} onChange={e => setIpType(e.target.value)}>
            <option value={0}>Patent</option>
            <option value={1}>Copyright</option>
            <option value={2}>Trademark</option>
            <option value={3}>Other</option>
          </select>
          <label>Title:</label>
          <input value={ipTitle} onChange={e => setIpTitle(e.target.value)} placeholder="Title of the IP" />
          <label>Description:</label>
          <input value={ipDes} onChange={e => setIpDes(e.target.value)} placeholder="Description" />
          <button onClick={registerIP} disabled={!connected || isTxPending}>Register IP</button>
          {statusMsgs.register && <p style={{ color: statusMsgs.register.color }}>{statusMsgs.register.text}</p>}
        </section>

        <section className="section">
          <h3>View IP Details</h3>
          <input value={viewId} onChange={e => setViewId(e.target.value)} placeholder="Enter IP ID" />
          <button onClick={viewIP}>View IP</button>
          <pre>{viewResult}</pre>
        </section>

        <section className="section">
          <h3>Transfer Ownership</h3>
          <input value={transferId} onChange={e => setTransferId(e.target.value)} placeholder="IP ID" />
          <input value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="New Owner Address (0x...)" />
          <button onClick={transferIP} disabled={isTxPending}>Transfer</button>
          {statusMsgs.transfer && <p style={{ color: statusMsgs.transfer.color }}>{statusMsgs.transfer.text}</p>}
        </section>

        <section className="section">
          <h3>Update IP</h3>
          <input value={updateId} onChange={e => setUpdateId(e.target.value)} placeholder="IP ID" />
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New Title" />
          <input value={newMetadata} onChange={e => setNewMetadata(e.target.value)} placeholder="New Metadata" />
          <button onClick={updateIP} disabled={isTxPending}>Update IP</button>
          {statusMsgs.update && <p style={{ color: statusMsgs.update.color }}>{statusMsgs.update.text}</p>}
        </section>

        <section className="section">
          <h3>Verify Ownership</h3>
          <input value={verifyId} onChange={e => setVerifyId(e.target.value)} placeholder="IP ID" />
          <input value={verifyAddr} onChange={e => setVerifyAddr(e.target.value)} placeholder="Address to verify (0x...)" />
          <button onClick={verifyOwner}>Verify</button>
          {statusMsgs.verify && <p style={{ color: statusMsgs.verify.color }}>{statusMsgs.verify.text}</p>}
        </section>

        <section className="section">
          <h3>View Transfer History</h3>
          <input value={historyId} onChange={e => setHistoryId(e.target.value)} placeholder="IP ID" />
          <button onClick={viewHistory}>View History</button>
          <pre>{historyResult}</pre>
        </section>

        <footer>© 2025 Blockchain IP Registry DApp — Built with ❤️ on Ethereum</footer>
      </div>
    </div>
  );
}
