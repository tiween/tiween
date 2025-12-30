const isArabic = (text: string): boolean => {
  const arabic = /[\u0600-\u06FF]/
  return arabic.test(text)
}
export default isArabic
