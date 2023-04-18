import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DegenX", function () {
  async function deployFixture() {
    return {};
  }

  describe("pre deployment", function () {
    it("whoop", async function () {
      const {} = await loadFixture(deployFixture);
    });
  });

  describe("post deployment", function () {
    it("whoop", async function () {
      const {} = await loadFixture(deployFixture);
    });
  });
});
