# 🧾 Intellectual Property Registration DApp (Blockchain)

A simple decentralized application (DApp) for registering and managing intellectual property (IP) using blockchain technology.  
Users can register patents, copyrights, trademarks, and other forms of IP securely on the blockchain.

---

## 🚀 Features

### 🔐 IP Management
- Register new IP  
- View detailed IP information  
- Transfer IP ownership  
- Update IP information  
- Verify current IP ownership  
- View full transfer history  

### 📚 Supported IP Types
- Patent  
- Copyright  
- Trademark  
- Other  

---

## 🛠️ Tech Stack
- **Frontend:** React (JavaScript, CSS)  
- **Blockchain:** Sepolia Testnet (sepoliaETH)  
- **Smart Contract:** Solidity  
- **Wallet:** MetaMask  

---

## ⚙️ Smart Contract Setup (Important)

Before running the DApp, you **must add your own contract ABI and contract address**.

### Steps:
1. Write your Solidity contract (e.g., `ipregistry.sol`).
2. Open **Remix IDE** (browser-based Solidity compiler).
3. Paste your Solidity code into a new file.
4. **Compile** the contract using Remix Compiler.
5. Deploy it to **Sepolia Test Network** using MetaMask.
6. After deployment:
   - Copy the **ABI** → paste it into `abi.js`
   - Copy the **Contract Address** → paste it into `config.js`

Without adding ABI + address, the app cannot interact with the blockchain.

---

## 🧰 About Remix IDE

Remix IDE is an online tool for writing, compiling, and deploying Solidity smart contracts.

Using Remix, you can:
- Write `.sol` files  
- Compile Solidity code  
- Deploy contracts to Sepolia  
- Retrieve deployed contract address and ABI  
- Debug transactions  

---

## 🖥️ Running the React Application

Install dependencies:

```bash
npm install
npm start

