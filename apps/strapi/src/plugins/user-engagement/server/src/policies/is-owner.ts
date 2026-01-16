export default (policyContext: any) => {
  const { user } = policyContext.state
  return !!user
}
