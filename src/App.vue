<template>
  <AppHeader />
  <div class="router-wrap" v-if="checkInProcess">
    <router-view />
  </div>
  <NotificationContainer />
  <PopupsWrapper />
  <Banner />
  <SkullBanner />
  <OldAllowanceBanner />
  <TenderlyMod />
</template>
<script>
import { mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";
import axios from "axios";

export default {
  data() {
    return {
      country: [
        "United States",
        "Myanmar [Burma]",
        "Ivory Coast",
        "Cuba",
        "Congo",
        "Iran",
        "Iraq",
        "Libya",
        "Mali",
        "Nicaragua",
        "North Korea",
        "Somalia",
        "Sudan",
        "Syria",
        "Yemen",
        "Zimbabwe",
      ],
      region: [
        "Crimea",
        "Republic of Crimea",
        "Bakhchysarai Raion",
        "Sevastopol",
      ],
    };
  },
  computed: {
    ...mapGetters({
      checkInProcess: "getWalletIsConnected",
      signer: "getSigner",
    }),
  },

  async beforeCreate() {
    const location = await axios.get(
      `https://ipwhois.pro/?key=${
        import.meta.env.VITE_APP_IPWHOIS_API_KEY
      }&security=1`
    );

    const isVPN = location.data.security.vpn;

    if (
      this.country.includes(location.data.country) ||
      this.region.includes(location.data.region) ||
      isVPN
    )
      document.location.href = "https://abracadabra.money/location";
  },

  components: {
    AppHeader: defineAsyncComponent(() =>
      import("@/components/app/AppHeader.vue")
    ),
    NotificationContainer: defineAsyncComponent(() =>
      import("@/components/notifications/NotificationContainer.vue")
    ),
    PopupsWrapper: defineAsyncComponent(() =>
      import("@/components/popups/PopupsWrapper.vue")
    ),
    Banner: defineAsyncComponent(() => import("@/components/ui/Banner.vue")),
    SkullBanner: defineAsyncComponent(() =>
      import("@/components/ui/SkullBanner.vue")
    ),
    OldAllowanceBanner: defineAsyncComponent(() =>
      import("@/components/ui/OldAllowanceBanner.vue")
    ),
    TenderlyMod: defineAsyncComponent(() =>
      import("@/components/tenderly/TenderlyMod.vue")
    ),
  },
};
</script>

<style lang="scss" src="@/assets/styles/main.scss"></style>
