import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Proxy contract already deployed on Filecoin Calibration
const RANDOMNESS_SENDER_PROXY = "0x94C5774DEa83a921244BF362a98c12A5aAD18c87";

const RandomnessModule = buildModule("RandomnessModule", (m) => {
  const deployer = m.getAccount(0);

  const consumer = m.contract("PassGenRandomConsumer", [
    RANDOMNESS_SENDER_PROXY,
    deployer,
  ]);

  return { consumer };
});

export default RandomnessModule;

