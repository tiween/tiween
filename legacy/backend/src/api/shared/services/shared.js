"use strict"

/**
 * shared service.
 */
const Vibrant = require("node-vibrant")
const axios = require("axios")
module.exports = () => ({
  async getImageSwatches(imageUrl) {
    const imageUrlResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    })

    const buffer = Buffer.from(imageUrlResponse.data, "utf-8")
    const swatches = await Vibrant.from(buffer).getSwatches()
    for (let key in swatches) {
      if (swatches.hasOwnProperty(key)) {
        swatches[key] = {
          hex: swatches[key].hex,
          yiq: swatches[key].getYiq(),
        }
      }
    }
    return swatches
  },
})
