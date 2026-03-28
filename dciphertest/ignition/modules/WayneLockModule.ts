import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("WayneLockModule", (m) => {
  const guardian = m.contract("WayneLockGuardianRecovery");
  return { guardian };
});
