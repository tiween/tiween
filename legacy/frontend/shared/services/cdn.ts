/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ImageLoaderProps } from "next/image"
import isEmpty from "lodash/isEmpty"

import CreativeWork from "../models/creative-work"

const transformations = {
  FESTIVAL_THUMBNAIL: "c-force,fo-center,q-100,w-220",
  CHANNEL_SMALL_THUMNAIL: "c-force,w-60",
  AR_16_19_PREVIEW_THUMBNAIL: ["ar-16-9", "c-force", "fo-auto"],
}
export const cdnTransformedImage = (
  publicId: string,
  transformation: string
): string => {
  return `${process.env.NEXT_PUBLIC_CDN_BASE_URL}/${transformation}/${publicId}`
}

export const festivalThumbnail = (publicId: string): string => {
  return cdnTransformedImage(publicId, transformations.FESTIVAL_THUMBNAIL)
}
export const channelSmallThumbnail = (publicId: string): string => {
  return cdnTransformedImage(publicId, transformations.CHANNEL_SMALL_THUMNAIL)
}

export const baseImageLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps): string => {
  const transformations = [`w_${width}`]
  if (quality) {
    transformations.push(`w_${quality}`)
  }
  return `${process.env.NEXT_PUBLIC_CDN_BASE_URL}/${transformations.join()}/${src}`
}

export const personPhotoImageLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps): string => {
  const transformations = [`w_${width}`, "ar-1-1", "c-force", "fo-face"]
  if (quality) {
    transformations.push(`w_${quality}`)
  }
  return `${process.env.NEXT_PUBLIC_CDN_BASE_URL}/${transformations.join()}/${src}`
}
export const posterImageLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps): string => {
  const transformations = [`w_${width}`, "ar-2-3", "c-force"]
  if (quality) {
    transformations.push(`q_${quality}`)
  }
  return `${process.env.NEXT_PUBLIC_CDN_BASE_URL}/${transformations.join()}/${src}`
}
export const ar1619ImageLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps): string => {
  const transformations = [`w_${width}`, "ar-16-9", "c-force", "g_auto"]
  if (quality) {
    transformations.push(`q_${quality}`)
  }
  return `${process.env.NEXT_PUBLIC_CDN_BASE_URL}/${transformations.join()}/${src}`
}

export const tmdbPosterImageLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps): string => {
  const transformations = [`w-${width}`, "ar-2-3", "c-force"]
  if (quality) {
    transformations.push(`q-${quality}`)
  }

  return `${process.env.NEXT_PUBLIC_CDN_BASE_URL}/tr:${transformations.join()}/${src}`
}

export const getVideoPreviewImage = (publicId: string): string => {
  return `${
    process.env.NEXT_PUBLIC_CDN_BASE_URL
  }/${transformations.AR_16_19_PREVIEW_THUMBNAIL.join()}/${publicId}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const creativeWorkImageWithLoader = (creativeWork: CreativeWork) => {
  const { poster, cover } = creativeWork
  let image
  if (!isEmpty(cover)) {
    image = {
      ar: "aspect-w-16 aspect-h-9",
      type: "cover",
      loader: ar1619ImageLoader,
      ...cover,
    }
  } else if (!isEmpty(poster)) {
    image = {
      ar: "aspect-w-2 aspect-h-3",
      loader: posterImageLoader,
      type: "poster",
      ...poster,
    }
    return image
  }
}
