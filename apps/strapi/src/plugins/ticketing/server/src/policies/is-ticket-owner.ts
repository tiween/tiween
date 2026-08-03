export default (policyContext: any, _config: any, { strapi: _strapi }: any) => {
  const { user } = policyContext.state

  if (!user) {
    return false
  }

  // Admin users can access all tickets
  if (user.roles?.some((role: any) => role.code === "strapi-super-admin")) {
    return true
  }

  // Check if the user owns the ticket/order
  // This will be checked in the controller/service
  return true
}
