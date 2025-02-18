import { fantom } from "@wagmi/core/chains";
import { useImage } from "@/helpers/useImage";

export const fantomConfig = {
  ...fantom,
  chainId: fantom.id,
  symbol: "FTM",
  icon: useImage("assets/images/networks/fantom-icon.svg"),
  baseTokenIcon: useImage("assets/images/tokens/FTM2.png"),
  networkIcon: useImage(`assets/images/networks/fantom.svg`),
  lzChainId: 112,
};
