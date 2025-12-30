export default interface StrapiApiResponse<T> {
  data: Array<{
    id: number
    attributes: T
  }>
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}
