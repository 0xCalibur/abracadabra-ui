<template>
  <div class="popup-wrap" v-if="isOpened" @click="closePopup">
    <div class="popup" @click.stop>
      <div class="popup-content">
        <button class="close-btn" @click="closePopup">
          <img
            class="close-img"
            src="@/assets/images/cross.svg"
            alt="Close popup"
          />
        </button>
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "LocalPopupWrap",
  props: {
    isOpened: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    closePopup() {
      this.$emit("closePopup");
    },
  },
  watch: {
    isOpened(value) {
      document.documentElement.style.overflow = value ? "hidden" : "auto";
    },
  },
};
</script>

<style lang="scss" scoped>
.popup-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 300;
  display: grid;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(20px);
  overflow-y: auto;
  padding-top: 50px;
}

.popup {
  padding: 10px 10px 16px;
  background: #302e38;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
  border-radius: 30px;
  position: relative;

  max-width: 95vw;

  .popup-content {
    height: 100%;
  }
}

.close-btn {
  position: absolute;
  top: 27px;
  right: 20px;
  cursor: pointer;
  background-color: transparent;
  border: none;
}

.close-img {
  width: 14px;
  height: 14px;
}
</style>
