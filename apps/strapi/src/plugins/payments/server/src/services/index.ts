import konnectClient from "./konnect-client"
import publicApi from "./public-api"
import statusMapping from "./status-mapping"

// Dash keys match the `.service("public-api")` cross-plugin convention.
export default {
  "konnect-client": konnectClient,
  "status-mapping": statusMapping,
  "public-api": publicApi,
}
