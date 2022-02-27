const { expect } = require("chai");
const { MockProvider } = require("ethereum-waffle");
const { ethers } = require("hardhat");
const { time } = require('openzeppelin-test-helpers');

require("@nomiclabs/hardhat-ethers");
const assert = require('assert').strict;
const { BigNumber } = require("ethers");

const managerRole = ethers.utils.id("MANAGER_ROLE");

const getNumberFromBN = (bn, d) => {
   return BigNumber.from(bn).div(BigNumber.from(10).pow(d)).toNumber();
}

const getBNFromNumber = (num, d) => {
   return BigNumber.from(10).pow(d).mul(num);
}

const formatNumberFromBN = (bn, d) => {
   return (getNumberFromBN(bn, d)).toString().split("").reverse().reduce(function (acc, num, i, orig) { return num + (num != "-" && i && !(i % 3) ? "," : "") + acc; }, "");;
}

function sleep(milliseconds) {
   const date = Date.now();
   let currentDate = null;
   do {
      currentDate = Date.now();
   } while (currentDate - date < milliseconds)
}


contract("xpndStaking", (accounts) => {
   let token, dec;

   before(async () => {

      [owner, ...accounts] = await ethers.getSigners();
      Erc20 = await hre.ethers.getContractFactory("UvwToken");
      token = await Erc20.deploy();
      dec = await token.decimals();

      await token.deployed();
      console.log("UvwToken deployed to:", token.address);

      xpndStaking = await hre.ethers.getContractFactory("xpndStaking");
      XStaking = await xpndStaking.deploy(token.address);

      await XStaking.deployed();
      console.log("staking deployed to:", XStaking.address);
      const approveAmount = await token.totalSupply()
      await token.approve(XStaking.address, approveAmount)

      await token.connect(accounts[0]).approve(XStaking.address, getBNFromNumber(10000, dec));
      await token.connect(accounts[1]).approve(XStaking.address, getBNFromNumber(20000, dec));
      await token.connect(accounts[2]).approve(XStaking.address, getBNFromNumber(30000, dec));
      await token.connect(accounts[3]).approve(XStaking.address, getBNFromNumber(40000, dec));
      await token.connect(accounts[4]).approve(XStaking.address, getBNFromNumber(100000, dec));
   });

   it('Check Manager Role', async () => {

      expect(await XStaking.hasRole(managerRole, owner.address)).to.equal(true);
      console.log("Owner " + owner.address + " is Manager");
   });

   it('Check Account Balances Before Staking', async () => {
      await token.transfer(accounts[0].address, getBNFromNumber(100, dec));
      await token.transfer(accounts[1].address, getBNFromNumber(200, dec));
      await token.transfer(accounts[2].address, getBNFromNumber(300, dec));
      await token.transfer(accounts[3].address, getBNFromNumber(400, dec));
      await token.transfer(accounts[4].address, getBNFromNumber(1000, dec));
      await token.transfer(accounts[5].address, getBNFromNumber(600, dec));

      const balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      const balanceOfAccount1 = await token.balanceOf(accounts[1].address);
      const balanceOfAccount2 = await token.balanceOf(accounts[2].address);
      const balanceOfAccount3 = await token.balanceOf(accounts[3].address);
      const balanceOfAccount4 = await token.balanceOf(accounts[4].address);
      const balanceOfAccount5 = await token.balanceOf(accounts[5].address);

      console.log("accounts 1 : " + formatNumberFromBN(balanceOfAccount0, dec));
      console.log("accounts 2 : " + formatNumberFromBN(balanceOfAccount1, dec));
      console.log("accounts 3 : " + formatNumberFromBN(balanceOfAccount2, dec));
      console.log("accounts 4 : " + formatNumberFromBN(balanceOfAccount3, dec));
      console.log("accounts 5 : " + formatNumberFromBN(balanceOfAccount4, dec));
      console.log("accounts 6 : " + formatNumberFromBN(balanceOfAccount5, dec));

      const ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance after transfer : " + formatNumberFromBN(ownerBalance, dec));
   });

   it('Check pool info', async () => {
      const periodStaking0 = await XStaking.getPoolConfig(0);
      const periodStaking1 = await XStaking.getPoolConfig(1);
      const periodStaking2 = await XStaking.getPoolConfig(2);
      const periodStaking3 = await XStaking.getPoolConfig(3);

      console.log("pool 0 : " + periodStaking0[0] + " days");
      console.log("pool 1 : " + periodStaking1[0] + " days");
      console.log("pool 2 : " + periodStaking2[0] + " days");
      console.log("pool 3 : " + periodStaking3[0] + " days");

   });

   it('Account0 try to deposit before manager accept deposit', async () => {
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      await expect(XStaking.connect(accounts[0]).stake(balanceOfAccount0)).to.be.reverted;

      balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      expect(balanceOfAccount0).to.equal(getBNFromNumber(100, dec));
      console.log("balance of account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
   });

   it('Manager starts acceptDeposit', async () => {
      await XStaking.startStaking(0, 0);

      let poolConfig0 = await XStaking.getPoolConfig(0);
      expect(poolConfig0[0]).to.equal(90);

      await XStaking.startStaking(3, 0);

      let poolConfig3 = await XStaking.getPoolConfig(3);
      expect(poolConfig3[0]).to.equal(730);

      console.log("start deposit : pool_0, " + poolConfig0[0] + " days, " + (await XStaking.getTimeAccepting(0)) + " hours");
      console.log("start deposit : pool_3, " + poolConfig3[0] + " days, " + (await XStaking.getTimeAccepting(3)) + " hours");
   });

   it('Accounts deposit after manager accept deposit', async () => {
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      let balanceOfAccount1 = await token.balanceOf(accounts[1].address);
      let balanceOfAccount2 = await token.balanceOf(accounts[2].address);
      let balanceOfAccount3 = await token.balanceOf(accounts[3].address);
      let balanceOfAccount4 = await token.balanceOf(accounts[4].address);
      console.log("Before deposit");
      console.log("Balance of account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
      console.log("Balance of account1 : ", formatNumberFromBN(balanceOfAccount1, dec));
      console.log("Balance of account2 : ", formatNumberFromBN(balanceOfAccount2, dec));
      console.log("Balance of account3 : ", formatNumberFromBN(balanceOfAccount3, dec));
      console.log("Balance of account4 : ", formatNumberFromBN(balanceOfAccount4, dec));

      let balanceOfContract = await token.balanceOf(XStaking.address);
      expect(balanceOfContract).to.equal(0);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));

      console.log("About to sleep for 2 hours. Account0 deposits")
      sleep(500)
      await time.increase(2 * 60 * 60);
      await expect(XStaking.connect(accounts[0]).stake(0, balanceOfAccount0));

      console.log("About to sleep for 4 hours. Account1 deposits")
      sleep(500)
      await time.increase(4 * 60 * 60);
      await expect(XStaking.connect(accounts[1]).stake(0, balanceOfAccount1)).to.be.not.reverted;

      console.log("About to sleep for 6 hours. Account2 deposits")
      sleep(500)
      await time.increase(6 * 60 * 60);
      await expect(XStaking.connect(accounts[2]).stake(0, balanceOfAccount2)).to.be.not.reverted;

      console.log("About to sleep for 8 hours. Account4 deposits")
      sleep(500)
      await time.increase(8 * 60 * 60);
      await expect(XStaking.connect(accounts[4]).stake(0, BigNumber.from(balanceOfAccount4).div(2))).to.be.not.reverted;

      console.log("About to sleep for 3 hours. Account3, Account4 deposits")
      sleep(500)
      await time.increase(3 * 60 * 60);
      await expect(XStaking.connect(accounts[3]).stake(0, balanceOfAccount3)).to.be.not.reverted;
      await expect(XStaking.connect(accounts[4]).stake(3, BigNumber.from(balanceOfAccount4).div(2))).to.be.not.reverted;

      balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      balanceOfAccount1 = await token.balanceOf(accounts[1].address);
      balanceOfAccount2 = await token.balanceOf(accounts[2].address);
      balanceOfAccount3 = await token.balanceOf(accounts[3].address);
      balanceOfAccount4 = await token.balanceOf(accounts[4].address);
      expect(balanceOfAccount0).to.equal(0);
      expect(balanceOfAccount1).to.equal(0);
      expect(balanceOfAccount2).to.equal(0);
      expect(balanceOfAccount3).to.equal(0);
      expect(balanceOfAccount4).to.equal(0);
      console.log("After deposit");
      console.log("Balance of account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
      console.log("Balance of account1 : ", formatNumberFromBN(balanceOfAccount1, dec));
      console.log("Balance of account2 : ", formatNumberFromBN(balanceOfAccount2, dec));
      console.log("Balance of account3 : ", formatNumberFromBN(balanceOfAccount3, dec));
      console.log("Balance of account4 : ", formatNumberFromBN(balanceOfAccount4, dec));

      balanceOfContract = await token.balanceOf(XStaking.address);
      expect(balanceOfContract).to.equal(getBNFromNumber(2000, dec));
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
   });

   it('Get all stakes', async () => {
      let stakeIDs = await XStaking.getMyStakes(accounts[4].address);

      console.log("accounts4 stake count : " + stakeIDs.length);

      for (let index = 0; index < stakeIDs.length; index++) {
         console.log("Account4 stakeIndex" + index, stakeIDs[index]);
      }
   });

   // it('Account5 deposit after end of acceptingDeposit', async () => {
   //    let balanceOfAccount5 = await token.balanceOf(accounts[5].address);
   //    console.log("Before deposit");
   //    console.log("Balance of account5 : ", formatNumberFromBN(balanceOfAccount5, dec));

   //    let balanceOfContract = await token.balanceOf(XStaking.address);
   //    expect(balanceOfContract).to.equal(getBNFromNumber(2000, dec));
   //    console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));

   //    console.log("About to sleep for 3 hours. Account5 deposits")
   //    sleep(500)
   //    await time.increase(3 * 60 * 60);
   //    await expect(XStaking.connect(accounts[5]).stake(0, balanceOfAccount5)).to.be.reverted;

   //    balanceOfAccount5 = await token.balanceOf(accounts[5].address);
   //    expect(balanceOfAccount5).to.equal(getBNFromNumber(600, dec));
   //    console.log("After deposit");
   //    console.log("Balance of account5 : ", formatNumberFromBN(balanceOfAccount5, dec));

   //    balanceOfContract = await token.balanceOf(XStaking.address);
   //    expect(balanceOfContract).to.equal(getBNFromNumber(2000, dec));
   //    console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
   //    console.log("Account5 failed to deposit, cuz ended acceptinig deposit.");
   // });

   it('Manager tries to start staking again', async () => {
      console.log("About to sleep for 10 days.")
      sleep(500)
      await time.increase(10 * 24 * 60 * 60);

      await expect(XStaking.startStaking(0, 0)).to.be.reverted;

      let poolConfig = await XStaking.getPoolConfig(0);
      expect(poolConfig[0]).to.equal(90);

      console.log("Manager failed to start staking again.")
   });

   it('Manager set rewards', async () => {
      let rewards = getBNFromNumber(1000, dec);

      let contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance before setting rewards : " + formatNumberFromBN(contractBalance, dec));

      let ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));

      expect(await XStaking.addRewards(rewards));

      contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance after setting rewards : " + formatNumberFromBN(contractBalance, dec));

      ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));
   });

   it('Account0 tries to withdraw before end of staking period', async () => {
      console.log("About to sleep for 10 days.")
      sleep(500)
      await time.increase(10 * 24 * 60 * 60);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      expect(balanceOfContract).to.equal(getBNFromNumber(3000, dec));
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[0].address);

      await expect(XStaking.connect(accounts[0]).withdrawStake(stakeIDs[0])).to.be.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      expect(balanceOfContract).to.equal(getBNFromNumber(3000, dec));
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
      console.log("Account0 failed to withdraw");

   });

   it('Get pool info', async () => {
      let info = await XStaking.getPoolInfo(1);

      console.log("poolInstance = 0");
      console.log("PoolType: " + info[0]);
      console.log("startOfDeposit: " + info[1]);
      console.log("totalStaked: " + formatNumberFromBN(info[2], dec));
      console.log("poolReward: " + formatNumberFromBN(info[3], dec));
      console.log("endOfDeposit: " + info[4]);
      console.log("PoolStatus", info[5]);
   });

   it('Manager set rewards again', async () => {
      const rewards = getBNFromNumber(1000, dec);

      let contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance before setting rewards : " + formatNumberFromBN(contractBalance, dec));

      let ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));

      expect(await XStaking.addRewards(rewards));

      contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance after setting rewards : " + formatNumberFromBN(contractBalance, dec));

      ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));
   });

   it('***Account0 tries to withdraw after end of staking period', async () => {
      console.log("About to sleep for 9 days and 22 hours.")
      sleep(500)
      await time.increase(69 * 24 * 60 * 60 + 22 * 60 * 60);

      // let pid = await XStaking.poolInstanceCounter();
      // console.log("poolInstanceCounter : ", pid);
      // let poolInfo = await XStaking.poolById(pid);
      // console.log("PoolInstance : ", poolInfo);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Address0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[0].address);;
      let rewardAmount = await XStaking.getRewards(stakeIDs[0]);
      console.log("Reward amount : ", formatNumberFromBN(rewardAmount, dec));

      await expect(XStaking.connect(accounts[0]).withdrawStake(stakeIDs[0])).to.be.not.reverted;

      await time.increase(1);

      console.log("After withdraw");

      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
   });

   it('Account0 tries to withdraw again', async () => {
      console.log("About to sleep for 1 days")
      sleep(500)
      await time.increase(1 * 24 * 60 * 60);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[0].address);

      // await expect(XStaking.getRewards(stakeIDs[0])).to.be.reverted;

      await expect(XStaking.connect(accounts[0]).withdrawStake(stakeIDs[0])).to.be.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Address0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      console.log("fail: already paid out");
   });

   it('Manager set rewards', async () => {
      const rewards = getBNFromNumber(1000, dec);

      let contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance before setting rewards : " + formatNumberFromBN(contractBalance, dec));

      let ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));

      expect(await XStaking.addRewards(rewards));

      contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance after setting rewards : " + formatNumberFromBN(contractBalance, dec));

      ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));
   });

   it('Account0 deposit before manager accept deposit - second', async () => {
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      console.log("Before deposit");
      console.log("Balance of account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let balanceOfContract = await token.balanceOf(XStaking.address);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));

      console.log("About to sleep for 5 hours. Account0 deposits")
      sleep(500)
      await time.increase(5 * 60 * 60);
      await expect(XStaking.connect(accounts[0]).stake(0, balanceOfAccount0)).to.be.reverted;

      balanceOfContract = await token.balanceOf(XStaking.address);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
   });

   it('Manager starts acceptDeposit again after staking', async () => {
      await XStaking.startStaking(0, 0);

      let poolConfig = await XStaking.getPoolConfig(0);
      expect(await poolConfig[0]).to.equal(90);

      console.log("Pool_0_PeriodStaking", poolConfig[0]);
      console.log("Pool_0_TimeAccepting", (await XStaking.getTimeAccepting(0)));
   });

   it('Account0 tries to withdraw before end of staking period - second', async () => {
      console.log("About to sleep for 2 hour.")
      sleep(500)
      await time.increase(2 * 60 * 60);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[0].address);;

      await expect(XStaking.connect(accounts[0]).withdrawStake(stakeIDs[0])).to.be.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
      console.log("Account0 failed to withdraw");
   });

   it('Manager set rewards again', async () => {
      const rewards = getBNFromNumber(1000, dec);

      let contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance before setting rewards : " + formatNumberFromBN(contractBalance, dec));

      let ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));

      expect(await XStaking.addRewards(rewards));

      contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance after setting rewards : " + formatNumberFromBN(contractBalance, dec));

      ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));
   });

   it('Accounts deposit after manager accept deposit - second', async () => {
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      console.log("Before deposit");
      console.log("Balance of account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let balanceOfContract = await token.balanceOf(XStaking.address);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));

      console.log("About to sleep for 6 hours. Account0 deposits")
      sleep(500)
      await time.increase(2 * 60 * 60);
      await expect(XStaking.connect(accounts[0]).stake(0, balanceOfAccount0)).to.be.not.reverted;

      balanceOfContract = await token.balanceOf(XStaking.address);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
   });

   it('Get all pool instance', async () => {
      let poolInstances = await XStaking.getAllPoolInstance(0);

      console.log("All poolInstances on poolType_0: " + poolInstances);
   });

   it('Get all stakes by pool instance', async () => {
      let poolInstances = await XStaking.getAllPoolInstance(0);
      let stakeIds = await XStaking.getAllStakesByPoolInstance(poolInstances[0]);

      console.log("All stakes on poolInstance_" + poolInstances[0] + ": " + stakeIds);
   });

   it('Get all stakes by pool type', async () => {
      let stakeIds = await XStaking.getAllStakesByPoolType(0);

      console.log("All stakes on poolType_0: " + stakeIds);
   });

   it('Withdraw pool instance', async () => {
      let poolInstances = await XStaking.getMyPoolInstances(accounts[0].address);

      console.log("Pool instances of account_0: " + poolInstances);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      await expect(XStaking.connect(accounts[0]).withdrawPoolInstance(poolInstances[1])).to.be.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);
   });

   it('Withdraw pool', async () => {
      let poolInstances = await XStaking.getMyPoolTypes(accounts[4].address);

      console.log("Pool types of account_4: " + poolInstances);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account4 : ", formatNumberFromBN(balanceOfAccount4, dec));

      await XStaking.connect(accounts[4]).withdrawPoolInstance(poolInstances[0]);

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account4 : ", formatNumberFromBN(balanceOfAccount4, dec));
   });

   it('Get pool length', async () => {
      let poolLength = await XStaking.poolLength();

      console.log("Pool length: " + poolLength);
   });

   it('Account0 tries to withdraw after end of staking period - second', async () => {
      console.log("About to sleep for 91 days.")
      sleep(500)
      await time.increase(91 * 24 * 60 * 60);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[0].address);
      console.log("stakeID : ", stakeIDs[1]);
      console.log("stakeIDCounter : ", await XStaking.stakeIdCounter());

      await expect(XStaking.connect(accounts[0]).withdrawStake(stakeIDs[1])).to.be.not.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
   });

   it('Account4 tries to withdraw all', async () => {
      console.log("About to sleep for 60 days.")
      sleep(500)
      await time.increase(60 * 24 * 60 * 60);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Address4 : ", formatNumberFromBN(balanceOfAccount4, dec));

      await expect(XStaking.connect(accounts[4]).withdrawAll()).to.be.not.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account4 : ", formatNumberFromBN(balanceOfAccount4, dec));
   });

   it('Account4 tries to withdraw after end of staking on pool_0', async () => {
      console.log("About to sleep for 60 days.")
      sleep(500)
      await time.increase(60 * 24 * 60 * 60);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Address4 : ", formatNumberFromBN(balanceOfAccount4, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[4].address);

      console.log("accounts4 stake count : " + stakeIDs.length);
      console.log("accounts4 stakeID_0 : " + stakeIDs[0]);
      console.log("accounts4 stakeID_1 : " + stakeIDs[1]);

      let rewardAmount = await XStaking.getRewards(stakeIDs[0]);
      console.log("Reward amount : ", formatNumberFromBN(rewardAmount, dec));

      await expect(XStaking.connect(accounts[4]).withdrawStake(stakeIDs[0])).to.be.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account4 : ", formatNumberFromBN(balanceOfAccount4, dec));
   });

   it('Account4 tries to withdraw after end of staking on pool_4', async () => {
      console.log("About to sleep for 300 days.")
      sleep(500)
      await time.increase(670 * 24 * 60 * 60);

      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Address4 : ", formatNumberFromBN(balanceOfAccount4, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[4].address);

      let rewardAmount = await XStaking.getRewards(stakeIDs[1]);
      console.log("Reward amount : ", formatNumberFromBN(rewardAmount, dec));

      await expect(XStaking.connect(accounts[4]).withdrawStake(stakeIDs[1])).to.be.not.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount4 = await token.balanceOf(accounts[4].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Address4 : ", formatNumberFromBN(balanceOfAccount4, dec));
   });

   it('Get lastes pool instances for each pool type', async () => {
      console.log('Get currnet pool', await XStaking.getCurrentPools());
   });

   it('Set staking pause state to true and start staking', async () => {
      await XStaking.setStakingPausedState(true);
      console.log("Staking pause state is " + await XStaking.getStakingPausedState());

      await expect(XStaking.startStaking(0, 0)).to.be.reverted;
      console.log("Manager start staking failed");
   });

   it('Set staking pause state to false and start staking', async () => {
      await XStaking.setStakingPausedState(false);
      console.log("Staking pause state is " + await XStaking.getStakingPausedState());

      await expect(XStaking.startStaking(0, 0)).to.be.not.reverted;
      console.log("Manager start staking success");
   });

   it('Set staking pause state to true and deposit', async () => {
      console.log("About to sleep for 2 hours.")
      sleep(500)
      await time.increase(2 * 60 * 60);

      console.log("Set staking pause state to true");
      await XStaking.setStakingPausedState(true);
      console.log("Staking pause state is " + await XStaking.getStakingPausedState());
      
      console.log("About to sleep for 2 hours.")
      sleep(500)
      await time.increase(2 * 60 * 60);

      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      console.log("Account0 deposit reverted");
      await expect(XStaking.connect(accounts[0]).stake(0, balanceOfAccount0)).to.be.reverted;
   });
   
   it('Set staking pause state to false and deposit', async () => {
      console.log("About to sleep for 2 hours.")
      sleep(500)
      await time.increase(2 * 60 * 60);

      console.log("Set staking pause state to false");
      await XStaking.setStakingPausedState(false);
      console.log("Staking pause state is " + await XStaking.getStakingPausedState());
      
      console.log("About to sleep for 2 hours.")
      sleep(500)
      await time.increase(2 * 60 * 60);

      console.log("Before deposit");
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      console.log("Balance of account0 : ", formatNumberFromBN(balanceOfAccount0, dec));      
      let balanceOfContract = await token.balanceOf(XStaking.address);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));

      console.log("After deposit");
      await expect(XStaking.connect(accounts[0]).stake(0, balanceOfAccount0)).to.be.not.reverted;
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);
      console.log("Balance of account0 : ", formatNumberFromBN(balanceOfAccount0, dec));      
      balanceOfContract = await token.balanceOf(XStaking.address);
      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
   });

   it('Manager set rewards', async () => {
      let rewards = getBNFromNumber(1000, dec);

      let contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance before setting rewards : " + formatNumberFromBN(contractBalance, dec));

      let ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));

      expect(await XStaking.addRewards(rewards));

      contractBalance = await token.balanceOf(XStaking.address);
      console.log("Contract balance after setting rewards : " + formatNumberFromBN(contractBalance, dec));

      ownerBalance = await token.balanceOf(owner.address);
      console.log("Owner balance before setting rewards : " + formatNumberFromBN(ownerBalance, dec));
   });

   it('Set staking pause state to true and withdraw', async () => {
      console.log("About to sleep for 90 days.")
      sleep(500)
      await time.increase(90 * 24 * 60 * 60);

      console.log("Set staking pause state to true");
      await XStaking.setStakingPausedState(true);
      console.log("Staking pause state is " + await XStaking.getStakingPausedState());

      let stakeIDs = await XStaking.getMyStakes(accounts[0].address);
      let lastStakeIDOfAccount0 = stakeIDs.length;
      console.log("lastStakeIDOfAccount0: ", lastStakeIDOfAccount0);

      await expect(XStaking.connect(accounts[0]).withdrawStake(stakeIDs[lastStakeIDOfAccount0 - 1])).to.be.reverted;
      console.log("Account0 withdraw failed");

   });

   it('Set staking pause state to false and withdraw', async () => {
      console.log("About to sleep for 2 hours.")
      sleep(500)
      await time.increase(2 * 60 * 60);

      console.log("Set staking pause state to false");
      await XStaking.setStakingPausedState(false);
      console.log("Staking pause state is " + await XStaking.getStakingPausedState());

      console.log("Before withdraw");
      let balanceOfContract = await token.balanceOf(XStaking.address);
      let balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));

      let stakeIDs = await XStaking.getMyStakes(accounts[0].address);
      let lastStakeIDOfAccount0 = stakeIDs.length;
      console.log("lastStakeIDOfAccount0: ", lastStakeIDOfAccount0);

      let rewardAmount = await XStaking.getRewards(stakeIDs[lastStakeIDOfAccount0 - 1]);
      console.log("Reward amount : ", formatNumberFromBN(rewardAmount, dec));

      await expect(XStaking.connect(accounts[0]).withdrawStake(stakeIDs[lastStakeIDOfAccount0 - 1])).to.be.not.reverted;

      console.log("After withdraw");
      balanceOfContract = await token.balanceOf(XStaking.address);
      balanceOfAccount0 = await token.balanceOf(accounts[0].address);

      console.log("Balance of contract : ", formatNumberFromBN(balanceOfContract, dec));
      console.log("Balance of Account0 : ", formatNumberFromBN(balanceOfAccount0, dec));
      console.log("Account0 withdraw success");
   });
})
