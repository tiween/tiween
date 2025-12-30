describe("User Authentication & Registration", () => {
  it("should register new user", () => {
    // Start from the index page
    cy.visit("/")
    cy.get("[data-test=authentication-signin]").click()
    cy.url().should("include", "/auth/signin")
    // The new page should contain an h1 with "About page"
    cy.get(".container.text-center > .font-lato").contains("Connectez vous")
    cy.get("[data-test=authentication-signup]").click()
    cy.url().should("include", "/auth/signup")
    cy.get("[data-test=user-signup-form-email]").type(
      `test-user-${Date.now()}@mailinator.com`
    )
    cy.get("[data-test=user-signup-form-password]").type(`password`)
    cy.get("[data-test=user-signup-form-submit]").click()
  })
})
