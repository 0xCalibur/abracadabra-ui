<template>
  <div class="empty-wrap" v-if="selectedData">
    <img :src="selectedData.img" v-if="selectedData.img" alt="info" />
    <div class="empty-text">
      <p v-if="selectedData.text">
        {{ selectedData.text }}
      </p>
      <p class="empty-bottom" v-if="selectedData.link">
        {{ selectedData.bottom }}
        <a class="empty-link" :href="selectedData.link" target="_blank">here</a>
      </p>
    </div>
  </div>
</template>

<script>
import { useImage } from "@/helpers/useImage";
export default {
  props: {
    warningType: {
      type: String,
      default: "sSpell",
    },
  },
  data() {
    return {
      emptyDataSSpell: {
        img: useImage(`assets/images/empty_borrow.png`),
        text: "Please use Ethereum Mainnet to stake Spell",
        bottom: "If you want to learn more read our docs",
        link: "https://abracadabramoney.gitbook.io/intro/stake/sspell",
      },
      emptyDataMSpell: {
        img: useImage(`assets/images/empty_borrow.png`),
        text: "mSPELL staking is available on Avalanche, Arbitrum, Ethereum and Fantom Opera!",
        bottom: "If you want to learn more read our docs",
        link: "https://abracadabramoney.gitbook.io/intro/stake/mspell",
      },
      emptyDataMGlp: {
        img: useImage(`assets/images/empty_borrow.png`),
        text: "Please use Arbitrum Mainnet or Avalanche to obtain magicGLP",
        bottom: "If you want to learn more read our docs",
        link: "https://abracadabramoney.gitbook.io/learn/intro/stake/mglp",
      },
      emptyDataMApe: {
        img: useImage(`assets/images/empty_borrow.png`),
        text: "Please use  Mainnet to obtain magicAPE",
        bottom: "If you want to learn more read our docs",
        link: "https://abracadabramoney.gitbook.io/learn/intro/stake/mglp",
      },
      emptyDataMLvl: {
        img: useImage(`assets/images/empty_borrow.png`),
        text: "Please use  Binance Smart Chain to obtain magicLVL",
        bottom: "If you want to learn more read our docs",
        link: false,
      },
      emptyDataMKlp: {
        img: useImage(`assets/images/empty_borrow.png`),
        text: "Please use  Kava EVM Chain to obtain magicKLP",
        bottom: "If you want to learn more read our docs",
        link: false,
      },
    };
  },

  computed: {
    selectedData() {
      if (this.warningType === "sSpell") return this.emptyDataSSpell;
      if (this.warningType === "mSpell") return this.emptyDataMSpell;
      if (this.warningType === "mglp") return this.emptyDataMGlp;
      if (this.warningType === "mape") return this.emptyDataMApe;
      if (this.warningType === "mlvl") return this.emptyDataMLvl;
      if (this.warningType === "mklp") return this.emptyDataMKlp;
      return false;
    },
  },
};
</script>

<style lang="scss" scoped>
.empty-wrap {
  background: #2b2b3c;
  box-shadow: 0px 1px 10px rgba(1, 1, 1, 0.05);
  backdrop-filter: blur(100px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 30px;
  padding: 23px 65px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  img {
    max-width: 130px;
    width: 90%;
    height: auto;
  }
}
.empty-bottom {
  margin-top: 15px;
}

.empty-text {
  font-size: 18px;
  line-height: 27px;
  color: rgba(255, 255, 255, 0.6);
  padding: 10px 0;
}

.empty-link {
  color: #759ffa;
}

@media screen and (max-width: 600px) {
  .empty-wrap {
    padding: 10px;
  }
}
</style>
