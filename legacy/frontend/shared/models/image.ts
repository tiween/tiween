export default interface Image {
  id: string
  name: string
  alternative_text?: string
  caption?: string
  hash?: string
  ext?: string
  mime?: string
  size?: number
  width?: number
  height?: number
  url?: string
  runtime?: number
  colors: {
    [colorName: string]: {
      hex: string
      yiq: number
    }
  }
}
