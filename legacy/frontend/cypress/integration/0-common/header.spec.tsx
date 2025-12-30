describe("User Authentication & Registration", () => {
  it("Logo should be visble and routes to home page", () => {
    cy.visit("/")
    const headerLogo = cy.get(`[data-testid="header-logo"]`)
    headerLogo.should("have.attr", "href")
    const link = headerLogo.should("be.visible")
    link.invoke("attr", "href").then((href) => {
      cy.request(href).its("status").should("eq", 200)
    })
  })
})

// Prevent TypeScript from reading file as legacy script
export {}
