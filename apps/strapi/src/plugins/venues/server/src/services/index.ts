import propertyCatalog from "./property-catalog"
import publicApi from "./public-api"
import registration from "./registration"
import seed from "./seed"
import venue from "./venue"
import venueAdmin from "./venue-admin"
import venueProfile from "./venue-profile"

export default {
  venue,
  "venue-admin": venueAdmin,
  "venue-profile": venueProfile,
  "property-catalog": propertyCatalog,
  "public-api": publicApi,
  registration,
  seed,
}
