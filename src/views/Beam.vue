<template>
  <div class="beam-view" v-if="beamConfig">
    <div class="beam">
      <div class="beam-header">
        <h3 class="title">Beam</h3>

        <div class="settings-btns">
          <WalletButton
            :active="isShowDstAddress"
            @click="toggleDstAddress"
            :disabled="isActionsDisabled"
          />
          <SettingsButton
            :active="isSettingsOpened"
            @click="isSettingsOpened = true"
            :disabled="isActionsDisabled"
          />
        </div>
      </div>

      <ChainsWrap
        :fromChain="originChain"
        :toChain="dstChain"
        :selectChain="isSelectedChain"
        @switch-chain="switchChain"
        @change-network="openNetworkPopup"
      />

      <div class="inputs-wrap">
        <div>
          <InputLabel title="Token to beam" :amount="mimBalance" />
          <BaseTokenInput
            :max="beamConfig.balance"
            :value="amount"
            :name="'MIM'"
            :icon="$image('assets/images/tokens/MIM.png')"
            :error="amountError"
            @update-value="updateMainValue"
            :disabled="isActionsDisabled"
          />
        </div>

        <InputAddress
          v-if="isShowDstAddress"
          @update-input="updateDestinationAddress"
          @error-input="errorDestinationAddress"
        />
      </div>

      <ExpectedBlock
        :data="expectedConfig"
        @open-settings="isSettingsOpened = true"
      />

      <div :class="{ 'wrap-btn': account }">
        <BaseButton
          :primary="true"
          :disabled="disableBtn"
          @click="actionHandler"
          >{{ actionBtnText }}</BaseButton
        >
      </div>

      <template v-if="account">
        <BeamHistory :historyArr="beamHistoryArr" />

        <button
          class="btn-more"
          v-if="isVisibilityMoreButton"
          @click="seeMoreHistory"
        >
          Show more
        </button>
      </template>

      <p class="caption">
        <span class="caption-text">Powered By</span
        ><img
          class="caption-icon"
          src="@/assets/images/beam/layer-zero.svg"
          alt=""
        />
      </p>
    </div>

    <LocalPopupWrap
      :isOpened="isSettingsOpened"
      @close-popup="isSettingsOpened = false"
    >
      <SettingsPopup
        :value="dstTokenAmount"
        :mimAmount="amountError ? '0' : amount"
        :max="dstMaxAmount"
        :defaultValue="dstDefaultValue"
        :config="settingConfig"
        @change-settings="changeSettings"
        @close-settings="isSettingsOpened = false"
        @error-settings="errorSettings"
    /></LocalPopupWrap>

    <LocalPopupWrap
      :isOpened="isOpenSuccessPopup"
      @close-popup="isOpenSuccessPopup = false"
    >
      <SuccessPopup :config="successData" />
    </LocalPopupWrap>

    <ChainsPopup
      :isOpen="isOpenNetworkPopup"
      :networksArr="popupNetworksArr"
      :activeChain="activePopupChain"
      :popupType="popupType"
      :selectChain="isSelectedChain"
      @close-popup="closeNetworkPopup"
      @enter-chain="changeChain"
    />
  </div>
</template>

<script>
import {
  waitForMessageReceived,
  createClient,
} from "@layerzerolabs/scan-client";
import filters from "@/filters/index.js";
import { defineAsyncComponent } from "vue";
import { useImage } from "@/helpers/useImage";
import { approveToken } from "@/helpers/approval.ts";
import { sendFrom } from "@/helpers/beam/sendFrom.ts";
import { tokensChainLink } from "@/utils/chainLink/config";
import { mapGetters, mapActions, mapMutations } from "vuex";
import { switchNetwork } from "@/helpers/chains/switchNetwork";
import { nativeTokenschainLink } from "@/utils/chainLink/config";
import { getDstTokenMax } from "@/helpers/beam/getDstTokenMax.ts";
import notification from "@/helpers/notification/notification.js";
import { createBeamConfig } from "@/helpers/beam/createBeamConfig";
import { getEstimateSendFee } from "@/helpers/beam/getEstimateSendFee";
import { getTokenPriceByChain } from "@/helpers/prices/getTokenPriceByChain";

export default {
  data() {
    return {
      acceptedNetworks: [
        1, 10, 56, 137, 250, 1285, 2222, 42161, 43114, 8453, 59144,
      ],
      isShowDstAddress: false,
      toChainId: null,
      dstAddress: null,
      dstAddressError: false,
      dstTokenAmount: "",
      popupType: null,
      amount: "",
      isOpenNetworkPopup: false,
      updateInterval: null,
      isSettingsOpened: false,
      beamConfig: null,
      estimateSendFee: 0,
      dstMaxAmount: 0,
      dstTokenPrice: null,
      isSettingsError: false,
      startFee: 0,
      isSelectedChain: false,
      isOpenSuccessPopup: false,
      tx: null,
      successData: null,
      mimToUsd: 0,
      beamHistory: [],
      historyPage: 1,
      quantityHistory: 5,
      isApproving: false,
      isBeaming: false,
    };
  },

  computed: {
    ...mapGetters({
      account: "getAccount",
      signer: "getSigner",
      provider: "getProvider",
      chainId: "getChainId",
      getChainById: "getChainById",
    }),

    isUnsupportedNetwork() {
      return this.acceptedNetworks.indexOf(this.chainId) === -1;
    },

    toAddress() {
      return this.dstAddress ? this.dstAddress : this.account;
    },

    toAddressBytes() {
      return this.$ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [this.toAddress]
      );
    },

    parseInputValue() {
      return this.$ethers.utils.parseUnits(
        filters.formatToFixed(this.amount || 0, 18),
        18
      );
    },

    // TODO: fix naming & conditions
    isTokenApproved() {
      if (this.chainId === 8453) return true;
      if (this.chainId === 59144) return true;

      return this.beamConfig.approvedAmount.gte(this.parseInputValue);
    },

    amountError() {
      if (+this.amount > +this.beamConfig.balance) {
        return `The value cannot be greater than ${this.beamConfig.balance}`;
      }
      return "";
    },

    popupNetworksArr() {
      if (this.popupType === "from") return this.beamConfig?.fromChains;
      return this.beamConfig?.toChains;
    },

    activePopupChain() {
      if (this.popupType === "from" && this.originChain) {
        return this.originChain.chainId;
      } else if (this.dstChain) {
        return this.dstChain.chainId;
      }

      return 1;
    },

    originChain() {
      let originChain = this.beamConfig?.fromChains.find(
        (chain) => chain.chainId === this.chainId
      );

      return originChain
        ? originChain
        : {
            title: "Select chain",
            icon: useImage(`assets/images/networks/no-chain.svg`),
            isUnsupportedNetwork: this.isUnsupportedNetwork,
          };
    },

    targetToChain() {
      if (this.toChainId) return this.toChainId;
      return this.beamConfig.chainsInfo[0].chainId;
    },

    dstChainId() {
      return this.beamConfig.chainsInfo.find(
        (item) => item.chainId === this.targetToChain
      )?.lzChainId;
    },

    lzChainId() {
      const lzChainId = this.beamConfig.chainsInfo.find(
        (item) => item.chainId === this.targetToChain
      )?.lzChainId;

      return this.$ethers.BigNumber.from(lzChainId);
    },

    dstChain() {
      return this.beamConfig?.toChains.find(
        (chain) => chain.chainId === this.targetToChain
      );
    },

    isEnterDstAddress() {
      return !this.dstAddress && this.isShowDstAddress;
    },

    actionBtnText() {
      if (this.isEnterDstAddress) return "Set destination address";
      if (this.dstAddressError) return "Set destination address";
      if (this.isApproving) return "Approving MIM";
      if (!this.isTokenApproved) return "Approve MIM";
      if (this.isBeaming) return "Beaming MIM";
      return "Beam MIM";
    },

    mimBalance() {
      return this.beamConfig?.balance || 0;
    },

    isActionsDisabled() {
      return this.isUnsupportedNetwork || !this.account;
    },

    disableBtn() {
      if (+this.amount === 0) return true;
      if (this.isApproving || this.isBeaming) return true;
      if (!this.account || !this.isSelectedChain) return true;
      if (this.isEnterDstAddress) return true;
      if (this.dstAddressError) return true;
      if (this.isTokenApproved) return false;

      return !!this.amountError;
    },

    dstDefaultValue() {
      return (
        this.beamConfig.fromChains.find(
          (chain) => chain.chainId === this.originChain.chainId
        )?.defaultValue[this.targetToChain] || "0"
      );
    },

    srcTokenInfo() {
      return this.getChainById(this.chainId);
    },

    dstTokenInfo() {
      return this.getChainById(this.targetToChain);
    },

    getFee() {
      if (!this.estimateSendFee[0]) return 0;
      return this.$ethers.utils.formatEther(this.estimateSendFee[0]);
    },

    formatFee() {
      if (!this.getFee) return "0.0";
      return filters.formatToFixed(this.getFee, 8);
    },

    expectedConfig() {
      return {
        mimAmount: this.amount,
        dstTokenAmount: this.dstTokenAmount,
        dstTokenSymbol: this.dstTokenInfo?.symbol,
        gasCost: this.formatFee,
        srcTokenSymbol: this.srcTokenInfo?.symbol,
      };
    },

    settingConfig() {
      return {
        icon: this.dstTokenInfo.baseTokenIcon,
        nativeTokenBalance: this.beamConfig.nativeTokenBalance,
        nativeSymbol: this.srcTokenInfo?.symbol,
        contract: this.beamConfig.contractInstance,
        address: this.toAddress,
        dstChainId: this.lzChainId,
      };
    },

    txConfig() {
      return {
        contract: this.beamConfig.contractInstance,
        account: this.account,
        dstChainId: this.lzChainId,
        toAddressBytes: this.toAddressBytes,
      };
    },

    successConfig() {
      return {
        sendFrom: this.account,
        sendTo: this.toAddress,
        originChain: this.originChain,
        mimAmount: this.amount,
        nativeSymbol: this.srcTokenInfo?.symbol,
        gasOnDst: filters.formatToFixed(+this.getFee - +this.startFee, 3),
        dstTokenSymbol: this.dstTokenInfo.symbol,
        dstChain: this.dstChain,
        dstTokenAmount: this.dstTokenAmount,
        dstTokenPrice: this.dstTokenPrice,
        tx: this.tx,
        txInfo: this.txInfo,
        mimToUsd: this.mimToUsd,
        dstChainId: this.dstChainId,
        totalGas: this.formatFee,
      };
    },

    beamHistoryArr() {
      const quantity = this.quantityHistory * this.historyPage;
      if (this.beamHistory.length <= quantity)
        return [...this.beamHistory].reverse();
      return [...this.beamHistory].reverse().slice(0, quantity);
    },

    isVisibilityMoreButton() {
      const quantity = this.quantityHistory * this.historyPage;
      if (quantity >= this.beamHistory.length) return false;
      return true;
    },
  },

  watch: {
    async chainId() {
      if (this.isUnsupportedNetwork) await this.beamNotAvailable();
      else {
        await this.createBeamData();
        await this.updateHistoryStatus();
      }
    },
  },

  methods: {
    ...mapActions({ createNotification: "notifications/new" }),
    ...mapMutations({
      deleteNotification: "notifications/delete",
      updateNotification: "notifications/updateTitle",
    }),

    toggleDstAddress() {
      this.isShowDstAddress = !this.isShowDstAddress;
    },

    async switchChain() {
      if (!this.isSelectedChain) return false;
      localStorage.setItem("previous_chain_id", this.chainId);
      await switchNetwork(this.dstChain.chainId);
    },

    openNetworkPopup(type) {
      this.popupType = type;
      this.isOpenNetworkPopup = !this.isOpenNetworkPopup;
    },

    async updateMainValue(value) {
      this.amount = value;
    },

    updateDestinationAddress(address, error) {
      this.dstAddress = address;
      this.dstAddressError = error;
    },

    errorDestinationAddress(error) {
      this.dstAddressError = error;
    },

    async actionHandler() {
      if (this.disableBtn) return false;

      const notificationId = await this.createNotification(
        notification.pending
      );

      if (!this.isTokenApproved) {
        this.isApproving = true;

        this.updateNotification({
          title: "1/2: Approve MIM",
          id: notificationId,
        });

        const isTokenApproved = await approveToken(
          this.beamConfig.tokenContractInstance,
          this.beamConfig.contractInstance.address
        );

        this.isApproving = false;

        if (!isTokenApproved) {
          await this.deleteNotification(notificationId);
          await this.createNotification(notification.approveError);
          return false;
        }

        this.updateNotification({
          title: "Step 2/2: Confirm Beam",
          id: notificationId,
        });
      }

      await this.seendBeam(notificationId);
    },

    async seendBeam(notificationId) {
      this.isBeaming = true;

      const { chainId, address } = nativeTokenschainLink[this.toChainId];
      this.dstTokenPrice = await getTokenPriceByChain(chainId, address);

      const mimPrice = await getTokenPriceByChain(
        tokensChainLink.mim.chainId,
        tokensChainLink.mim.address
      );
      this.mimToUsd = filters.formatUSD(+this.amount * +mimPrice);

      try {
        const { fees, params } = await this.getEstimatedFees(true);
        this.tx = await sendFrom(
          fees,
          params,
          this.parseInputValue,
          this.txConfig
        );
        await this.deleteNotification(notificationId);
        this.isBeaming = false;
        this.isOpenSuccessPopup = true;
        this.successData = this.successConfig;
        this.updateHistoryBeam(this.successData);

        await this.tx.wait();

        const txInfo = await waitForMessageReceived(
          this.dstChainId,
          this.tx.hash
        );

        this.successData = this.successConfig;
        this.successData.txInfo = txInfo;

        this.updateHistoryBeam(this.successData);
      } catch (error) {
        console.log("Seend Beam Error:", error);
        this.isBeaming = false;
        this.errorTransaction(error, notificationId);
      }
    },

    updateHistoryBeam(newTx) {
      const beamHistory = JSON.parse(localStorage.getItem("beam-history"));

      if (!beamHistory) {
        localStorage.setItem("beam-history", JSON.stringify([newTx]));
        this.beamHistory = [newTx];
      } else {
        let duplicateTx = false;
        let txIndex = null;
        beamHistory.forEach(({ tx }, idx) => {
          if (tx?.hash === newTx?.tx?.hash) {
            duplicateTx = true;
            txIndex = idx;
          }
        });

        if (!duplicateTx) {
          beamHistory.push(newTx);
          localStorage.setItem("beam-history", JSON.stringify(beamHistory));
          this.beamHistory = beamHistory;
        } else {
          beamHistory[txIndex] = newTx;
          localStorage.setItem("beam-history", JSON.stringify(beamHistory));
          this.beamHistory = beamHistory;
        }
      }
    },

    async updateHistoryStatus(complite = false) {
      let beamHistory = JSON.parse(localStorage.getItem("beam-history"));
      if (!beamHistory) return [];
      this.beamHistory = beamHistory;

      this.beamHistory = await Promise.all(
        beamHistory.map(async (history) => {
          if (history?.txInfo?.status !== "DELIVERED") {
            history.txInfo = await waitForMessageReceived(
              history.dstChainId,
              history.tx.hash
            );
            return history;
          }
          return history;
        })
      );

      localStorage.setItem("beam-history", JSON.stringify(this.beamHistory));
      if (!complite) this.updateHistoryStatus(true);
    },

    async getEstimatedFees(getParams = false) {
      const { fees, params } = await getEstimateSendFee(
        this.beamConfig.contractInstance,
        this.toAddress,
        this.lzChainId,
        this.dstTokenAmount || "0",
        this.amount || "1"
      );

      const additionalFee = fees[0].div(100);
      const updatedFee = fees[0].add(additionalFee); // add 1% from base fee to be sure tx success

      if (getParams) return { fees: [updatedFee], params };
      else return [updatedFee];
    },

    async errorTransaction(error, notificationId) {
      const errorNotification = {
        msg: "Transaction encountered an Error",
        type: "error",
      };

      if (
        String(error?.data?.message).indexOf("insufficient funds") !== -1 ||
        String(error?.data?.message).indexOf(
          "insufficient balance for transfer"
        ) !== -1 ||
        String(error).indexOf("insufficient funds") !== -1 ||
        String(error?.message).indexOf("insufficient funds") !== -1
      ) {
        errorNotification.msg = "Insufficient balance for transfer";
      }

      await this.deleteNotification(notificationId);
      await this.createNotification(errorNotification);
    },

    async changeSettings(value) {
      if (!value || this.isSettingsError) this.dstTokenAmount = "";
      else this.dstTokenAmount = value;
      this.estimateSendFee = await this.getEstimatedFees();
    },

    errorSettings(value) {
      this.isSettingsError = value;
    },

    closeNetworkPopup() {
      this.isOpenNetworkPopup = false;
    },

    async changeChain(chainId, type) {
      if (type === "to") {
        this.isSelectedChain = true;
        this.dstTokenAmount = "";
        this.estimateSendFee = 0;
        this.toChainId = chainId;
        this.startFee = 0;
        this.dstMaxAmount = await getDstTokenMax(
          this.beamConfig.contractInstance,
          this.signer,
          this.dstChainId
        );
        if (!this.startFee) {
          const startFee = await this.getEstimatedFees();
          this.startFee = this.$ethers.utils.formatEther(startFee[0]);
        }

        this.estimateSendFee = await this.getEstimatedFees();
      } else {
        if (this.dstChain.chainId !== chainId && !this.isUnsupportedNetwork) {
          localStorage.setItem("previous_chain_id", this.dstChain.chainId);
        }

        await switchNetwork(chainId);
      }
    },

    async beamNotAvailable() {
      return await this.createNotification(notification.beamNotAvailable);
    },

    async createBeamData() {
      this.beamConfig = await createBeamConfig(
        this.chainId,
        this.signer,
        this.account,
        this.provider
      );

      this.updateInterval = setInterval(async () => {
        this.beamConfig = await createBeamConfig(
          this.chainId,
          this.signer,
          this.account,
          this.provider
        );
      }, 15000);
    },

    closeSuccessPopup() {
      this.isOpenSuccessPopup = false;
    },

    async getMessagesBySrcTxHash() {
      const client = createClient("mainnet");
      const { messages } = await client.getMessagesBySrcTxHash(
        this.successData.tx.hash
      );

      return messages[0];
    },

    seeMoreHistory() {
      this.historyPage += 1;
    },
  },

  async created() {
    if (!this.chainId) return false;

    if (this.isUnsupportedNetwork) await this.beamNotAvailable();

    await this.createBeamData();
    await this.updateHistoryStatus();

    const previousChainId = localStorage.getItem("previous_chain_id");
    if (previousChainId && !this.isUnsupportedNetwork) {
      await this.changeChain(+previousChainId, "to");
      localStorage.removeItem("previous_chain_id");
    }
  },

  beforeUnmount() {
    clearInterval(this.updateInterval);
  },

  components: {
    BaseTokenInput: defineAsyncComponent(() =>
      import("@/components/base/BaseTokenInput.vue")
    ),
    BaseButton: defineAsyncComponent(() =>
      import("@/components/base/BaseButton.vue")
    ),
    ChainsWrap: defineAsyncComponent(() =>
      import("@/components/beam/ChainsWrap.vue")
    ),
    ChainsPopup: defineAsyncComponent(() =>
      import("@/components/beam/ChainsPopup.vue")
    ),
    LocalPopupWrap: defineAsyncComponent(() =>
      import("@/components/popups/LocalPopupWrap.vue")
    ),
    SettingsPopup: defineAsyncComponent(() =>
      import("@/components/beam/SettingsPopup.vue")
    ),
    SuccessPopup: defineAsyncComponent(() =>
      import("@/components/beam/successPopup/SuccessPopup.vue")
    ),
    WalletButton: defineAsyncComponent(() =>
      import("@/components/ui/buttons/WalletButton.vue")
    ),
    SettingsButton: defineAsyncComponent(() =>
      import("@/components/ui/buttons/SettingsButton.vue")
    ),
    InputAddress: defineAsyncComponent(() =>
      import("@/components/ui/inputs/InputAddress.vue")
    ),
    InputLabel: defineAsyncComponent(() =>
      import("@/components/ui/inputs/InputLabel.vue")
    ),
    ExpectedBlock: defineAsyncComponent(() =>
      import("@/components/beam/ExpectedBlock.vue")
    ),
    BeamHistory: defineAsyncComponent(() =>
      import("@/components/beam/history/BeamHistory.vue")
    ),
  },
};
</script>

<style lang="scss" scoped>
.beam-view {
  padding: 100px 15px;
}

.beam {
  max-width: 740px;
  width: 100%;
  margin: 0 auto;
  padding: 30px 95px;
  background: #2a2835;
  backdrop-filter: blur(100px);
  border-radius: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  position: relative;
}

.beam-header {
  position: relative;
}

.title {
  font-weight: 600;
  font-size: 24px;
  line-height: 150%;
  text-align: center;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.progress-text:first-letter {
  text-transform: uppercase;
}

.completed,
.processing {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #63ff7b;
  display: inline-block;
}
.processing {
  background: $clrYellow;
}

.settings-btns {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 0;
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 1;
}

.inputs-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.wrap-btn {
  padding-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.caption {
  font-weight: 300;
  font-size: 12px;
  line-height: 150%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.btn-more {
  height: 32px;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  max-width: 200px;
  width: 100%;
  margin: 0 auto;
  border: none;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease-in-out;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.caption-text {
  margin-top: 2px;
}

.caption-icon {
  max-width: 85px;
}

@media (max-width: 768px) {
  .beam {
    padding: 30px 50px;
  }
}

@media (max-width: 600px) {
  .beam {
    padding: 30px 15px;
    gap: 15px;
  }

  .settings-btns {
    right: 5%;
    gap: 10px;
  }
}
</style>
